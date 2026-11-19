'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { geoCentroid, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection } from 'geojson'
import topologyJson from '@/data/countries-110m.json'
import { EARTH_TEXTURE_DATA_URL } from '@/data/earth-texture'

type Topology = Parameters<typeof feature>[0]

/**
 * A real Earth for the Universities page hero: a NASA Blue Marble satellite
 * photo (2048x1024, vendored as base64 in data/earth-texture.ts — no
 * external URL at runtime) painted onto the sphere with a canvas renderer
 * driven by a D3 orthographic projection, so the map looks like a genuine
 * photo of Earth, not flat cartoon shapes. Country shapes (Natural Earth,
 * data/countries-110m.json) are still used for the rotation math and to
 * highlight the picked country over the photo.
 *
 * Sampling: the sphere is painted in small screen segments. For each
 * segment the four corners are inverted through the projection to their
 * true longitude/latitude, and the matching texture quad is drawn with an
 * affine transform, so adjacent segments share exact corner points and the
 * map joins seamlessly — no repeated land, no vertical streaks, no steps
 * at segment boundaries. (A single fixed-size texture window per segment,
 * or one centre-sampled rectangle per segment, both smear: the first
 * repeats the same 72° slice three times over, the second steps at every
 * segment edge because latitude changes across a segment, worst when the
 * globe is tilted.) The photo is tiled twice horizontally in an offscreen
 * canvas, so the ±180° seam needs no special-casing. The canvas backing
 * store is sized from the displayed size x devicePixelRatio (capped), so
 * coastlines stay sharp on retina screens.
 *
 * Sizing: at rest the globe is SMALL and fits INSIDE the blue hero (about
 * the hero's height, ~380px on desktop), sitting on the right so the text on
 * the left stays clear. When a country chip is picked it spins so that
 * country faces the viewer, rises up, and grows to DOUBLE its resting size,
 * with the country lit up amber over the photo. It stays a background layer
 * (pointer-events-none, -z-10) behind the hero text and filter chips.
 */

const SEGMENTS = 8
const IDLE_SPIN_DEG_PER_SEC = 5
const FLY_DURATION_MS = 1100
const FRAME_MS = 33 // ~30fps cap for the canvas loop
const MIN_CANVAS = 640
const MAX_CANVAS = 1280

/** Site country name -> name in the world-atlas TopoJSON. */
const COUNTRY_NAME_MAP: Record<string, string> = {
  'United States': 'United States of America',
  "People's Republic of China": 'China',
  'Czech Republic': 'Czechia',
}

/**
 * Countries too small to be their own shape at 110m: no feature to highlight,
 * so the globe still rotates to face them ([longitude, latitude]).
 */
const COUNTRY_FOCUS: Record<string, [number, number]> = {
  'Hong Kong': [114.17, 22.32],
  Macau: [113.55, 22.2],
  Singapore: [103.85, 1.29],
}

const WORLD: FeatureCollection = feature(
  topologyJson as unknown as Topology,
  (topologyJson as unknown as Topology).objects.countries,
) as unknown as FeatureCollection

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function CountryGlobe({ countryName }: { countryName: string | null }) {
  const features = useMemo(() => WORLD.features as Feature[], [])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Offscreen canvas holding the photo tiled twice side by side, so a
  // segment straddling the ±180° seam just reads across the join.
  const textureRef = useRef<HTMLCanvasElement | null>(null)

  // Backing-store size: displayed size x scale x devicePixelRatio, capped.
  // The container's offsetWidth is the layout width (unaffected by the CSS
  // scale transform), so it stays 200/320/380px even at 2x.
  const [canvasSize, setCanvasSize] = useState(768)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const w = el.offsetWidth || 380
      const scale = countryName ? 2 : 1
      const dpr =
        typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
      const size = Math.round(
        Math.min(MAX_CANVAS, Math.max(MIN_CANVAS, w * scale * dpr)),
      )
      setCanvasSize((prev) => (prev === size ? prev : size))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [countryName])

  const [projection] = useState(() =>
    geoOrthographic().scale(320).translate([320, 320]).clipAngle(90).precision(0.3),
  )

  const rotationRef = useRef<[number, number]>([0, 0])
  const animRef = useRef<{
    from: [number, number]
    to: [number, number]
    start: number
    duration: number
  } | null>(null)
  const selectedNameRef = useRef<string | null>(countryName)
  const selectedRef = useRef<Feature | null>(null)
  const lastFrameRef = useRef(0)

  const selected = useMemo(() => {
    if (!countryName) return null
    const topoName = COUNTRY_NAME_MAP[countryName] ?? countryName
    return (
      features.find(
        (f) => (f.properties as { name?: string } | null)?.name === topoName,
      ) ?? null
    )
  }, [countryName, features])

  // Load the vendored satellite texture once; draw as soon as it is ready.
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth * 2
      c.height = img.naturalHeight
      const g = c.getContext('2d')
      if (g) {
        g.drawImage(img, 0, 0)
        g.drawImage(img, img.naturalWidth, 0)
      }
      textureRef.current = c
      drawFrameRef.current?.()
    }
    img.src = EARTH_TEXTURE_DATA_URL
    return () => {
      img.onload = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Paint one frame of the globe for the current rotation.
  const drawFrame = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const S = canvas.width
    const R = S / 2
    const C = S / 2
    projection.scale(R).translate([C, C]).rotate(rotationRef.current)
    ctx.clearRect(0, 0, S, S)

    // Invert a screen point to [lon, lat], clamping it just inside the disc
    // first: D3's orthographic invert returns NaN outside the limb.
    const invertSafe = (x: number, y: number): [number, number] | null => {
      let dx = x - C
      let dy = y - C
      const dist = Math.hypot(dx, dy)
      const max = R - 0.5
      if (dist > max) {
        dx = (dx / dist) * max
        dy = (dy / dist) * max
      }
      const inv = projection.invert?.([C + dx, C + dy])
      if (!inv || !Number.isFinite(inv[0]) || !Number.isFinite(inv[1])) return null
      return inv as [number, number]
    }

    ctx.save()
    ctx.beginPath()
    ctx.arc(C, C, R - 0.5, 0, Math.PI * 2)
    ctx.clip()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const tex = textureRef.current
    if (tex) {
      // Single-tile width; the offscreen canvas holds two tiles, and every
      // lookup is shifted by one tile so it never runs off either edge.
      const TW = tex.width / 2
      const TH = tex.height
      const row = S >= 1024 ? 4 : 3
      for (let y = 0; y < S; y += row) {
        const cy = y + row / 2
        const ny = (cy - C) / R
        if (Math.abs(ny) >= 1) continue
        const halfChord = Math.sqrt(1 - ny * ny) * R
        const x0 = C - halfChord
        const segW = (2 * halfChord) / SEGMENTS
        for (let k = 0; k < SEGMENTS; k++) {
          const sx0 = x0 + k * segW
          const sx1 = sx0 + segW
          const e = 0.5
          // The segment's four corners, inverted to true lon/lat.
          const cTL = invertSafe(sx0 + e, y + e)
          const cTR = invertSafe(sx1 - e, y + e)
          const cBL = invertSafe(sx0 + e, y + row - e)
          const cBR = invertSafe(sx1 - e, y + row - e)
          if (!cTL || !cTR || !cBL || !cBR) continue
          const toUV = (ll: [number, number]): [number, number] => [
            ((ll[0] + 180) / 360) * TW + TW,
            ((90 - ll[1]) / 180) * TH,
          ]
          const [uTL, vTL] = toUV(cTL)
          const [uTR, vTR] = toUV(cTR)
          const [uBL, vBL] = toUV(cBL)
          const [uBR, vBR] = toUV(cBR)
          // Affine from the three TRUE corner correspondences:
          // (uTL,vTL) -> TL, (uTR,vTR) -> TR, (uBL,vBL) -> BL. This is the
          // key: unlike mapping the source rect's corners, it lets the
          // sampled latitude vary linearly along the segment's top edge,
          // which is what a tilted globe needs — a constant-v top edge
          // stripes every row. The source rect drawn is the corners'
          // bounding box; its image under the transform is a parallelogram
          // hugging the dest quad, and neighbours paint over the small
          // overlaps with equally first-order-correct content.
          const du1 = uTR - uTL
          const dv1 = vTR - vTL
          const du2 = uBL - uTL
          const dv2 = vBL - vTL
          const det = du1 * dv2 - du2 * dv1
          if (Math.abs(det) < 1e-6) continue
          const dx1 = sx1 - sx0
          const dy2 = row
          const a = (dx1 * dv2) / det
          const b = (-dy2 * dv1) / det
          const cc = (-du2 * dx1) / det
          const d = (du1 * dy2) / det
          const ee = sx0 - a * uTL - cc * vTL
          const ff = y - b * uTL - d * vTL
          const su0 = Math.min(uTL, uTR, uBL, uBR)
          const su1 = Math.max(uTL, uTR, uBL, uBR)
          const sv0 = Math.min(vTL, vTR, vBL, vBR)
          const sv1 = Math.max(vTL, vTR, vBL, vBR)
          const suw = su1 - su0
          const svh = sv1 - sv0
          if (suw < 0.5 || svh < 0.5) continue
          ctx.setTransform(a, b, cc, d, ee, ff)
          ctx.drawImage(tex, su0, sv0, suw, svh, su0, sv0, suw, svh)
          ctx.setTransform(1, 0, 0, 1, 0, 0)
        }
      }
    } else {
      // Fallback ocean until the texture loads (first paint only).
      const g = ctx.createRadialGradient(C * 0.65, C * 0.6, R * 0.1, C, C, R)
      g.addColorStop(0, '#2f6fb4')
      g.addColorStop(1, '#123a6b')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
    }

    // Selected country, lit up over the photo (same projection, so it lands
    // exactly on the photographed landmass).
    const sel = selectedRef.current
    if (sel) {
      const path = geoPath(projection, ctx)
      ctx.save()
      ctx.beginPath()
      path(sel)
      ctx.fillStyle = 'rgba(245, 158, 11, 0.42)'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(1.5, S / 320)
      ctx.shadowColor = 'rgba(245, 158, 11, 0.95)'
      ctx.shadowBlur = 16
      ctx.stroke()
      ctx.restore()
    } else if (countryName && COUNTRY_FOCUS[countryName]) {
      // Tiny countries (Singapore, Hong Kong, Macau) have no 110m shape:
      // mark the spot with a glowing amber dot instead.
      const [lon, lat] = COUNTRY_FOCUS[countryName]
      const pt = projection([lon, lat]) as [number, number] | null
      if (pt && Math.hypot(pt[0] - C, pt[1] - C) < R - 2) {
        const r = Math.max(4, S / 90)
        ctx.save()
        ctx.beginPath()
        ctx.arc(pt[0], pt[1], r, 0, Math.PI * 2)
        ctx.fillStyle = '#f59e0b'
        ctx.shadowColor = 'rgba(245, 158, 11, 0.95)'
        ctx.shadowBlur = 18
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.lineWidth = Math.max(1.5, S / 400)
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
        ctx.restore()
      }
    }

    // Navy tint so white hero text stays readable over the photo.
    ctx.fillStyle = 'rgba(8, 26, 54, 0.20)'
    ctx.fillRect(0, 0, S, S)

    // Limb shading: darker towards the edge, like a real planet photo.
    const limb = ctx.createRadialGradient(C, C, R * 0.55, C, C, R)
    limb.addColorStop(0, 'rgba(2, 8, 20, 0)')
    limb.addColorStop(0.82, 'rgba(2, 8, 20, 0.10)')
    limb.addColorStop(1, 'rgba(2, 8, 20, 0.55)')
    ctx.fillStyle = limb
    ctx.fillRect(0, 0, S, S)
    ctx.restore()

    // Atmosphere rim.
    ctx.save()
    ctx.beginPath()
    ctx.arc(C, C, R - 1, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)'
    ctx.lineWidth = 1.5
    ctx.shadowColor = 'rgba(96, 165, 250, 0.6)'
    ctx.shadowBlur = 22
    ctx.stroke()
    ctx.restore()
  }
  const drawFrameRef = useRef(drawFrame)
  drawFrameRef.current = drawFrame

  // Keep the highlight feature in sync with the picked country.
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  // When the picked country changes, fly the rotation to face it.
  useEffect(() => {
    const [curLambda, curPhi] = rotationRef.current
    let target: [number, number] | null = null
    if (selected) {
      const [lon, lat] = geoCentroid(selected)
      target = [-lon, -lat]
    } else if (countryName && COUNTRY_FOCUS[countryName]) {
      const [lon, lat] = COUNTRY_FOCUS[countryName]
      target = [-lon, -lat]
    }
    selectedNameRef.current = countryName
    if (!target) {
      // Back to "All countries": stop flying, idle spin resumes from here.
      animRef.current = null
      return
    }
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      rotationRef.current = target
      animRef.current = null
      drawFrameRef.current?.()
      return
    }
    // Shortest way round in longitude, so the globe never spins the long way.
    const deltaLambda = ((target[0] - curLambda + 540) % 360) - 180
    animRef.current = {
      from: [curLambda, curPhi],
      to: [curLambda + deltaLambda, target[1]],
      start: performance.now(),
      duration: FLY_DURATION_MS,
    }
  }, [countryName, selected])

  // One animation loop: idle spin at rest, eased fly to a picked country.
  // Capped at ~30fps so the canvas redraw stays cheap on phones.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      drawFrameRef.current?.()
      return
    }
    const tick = (now: number) => {
      const dt = Math.min(100, now - last)
      last = now
      const anim = animRef.current
      if (anim) {
        const t = Math.min(1, (now - anim.start) / anim.duration)
        const e = easeInOutCubic(t)
        rotationRef.current = [
          anim.from[0] + (anim.to[0] - anim.from[0]) * e,
          anim.from[1] + (anim.to[1] - anim.from[1]) * e,
        ]
        if (t >= 1) animRef.current = null
      } else if (!selectedNameRef.current) {
        rotationRef.current = [
          rotationRef.current[0] + (dt / 1000) * IDLE_SPIN_DEG_PER_SEC,
          rotationRef.current[1],
        ]
      }
      if (now - lastFrameRef.current >= FRAME_MS) {
        lastFrameRef.current = now
        drawFrameRef.current?.()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-[68%] -z-10 -translate-x-1/2 -translate-y-1/2"
    >
      <div
        ref={containerRef}
        className="earth-globe aspect-square w-[200px] md:w-[320px] lg:w-[380px]"
        style={
          {
            '--earth-scale': countryName ? 2 : 1,
            '--earth-lift': countryName ? '-64px' : '0px',
            '--earth-shift': countryName ? '48px' : '0px',
          } as CSSProperties
        }
      >
        <span className="sr-only">
          {countryName ? `Globe showing ${countryName}` : 'Globe'}
        </span>
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="block size-full"
        />
      </div>
    </div>
  )
}
