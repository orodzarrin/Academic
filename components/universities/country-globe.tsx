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
 * photo (vendored as base64 in data/earth-texture.ts — no external URL at
 * runtime) painted onto the sphere with a canvas scanline renderer driven by
 * a D3 orthographic projection, so the map looks like a genuine photo of
 * Earth, not flat cartoon shapes. Country shapes (Natural Earth,
 * data/countries-110m.json) are still used for the rotation math and to
 * highlight the picked country over the photo.
 *
 * Sizing: at rest the globe is SMALL and fits INSIDE the blue hero (about
 * the hero's height, ~380px on desktop), sitting on the right so the text on
 * the left stays clear. When a country chip is picked it spins so that
 * country faces the viewer, rises up, and grows to DOUBLE its resting size,
 * with the country lit up amber over the photo. It stays a background layer
 * (pointer-events-none, -z-10) behind the hero text and filter chips.
 */

const CANVAS = 640
const ROW = 3
const SEGMENTS = 5
const IDLE_SPIN_DEG_PER_SEC = 5
const FLY_DURATION_MS = 1100
const FRAME_MS = 33 // ~30fps cap for the canvas loop

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

/** Draw one source slice, splitting it at the texture's ±180° seam. */
function drawWrapped(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  tw: number,
) {
  let x = ((sx % tw) + tw) % tw
  let destX = dx
  let remaining = sw
  while (remaining > 0.001) {
    const take = Math.min(remaining, tw - x)
    ctx.drawImage(img, x, sy, take, sh, destX, dy, (dw * take) / sw, dh)
    remaining -= take
    destX += (dw * take) / sw
    x = 0
  }
}

export function CountryGlobe({ countryName }: { countryName: string | null }) {
  const features = useMemo(() => WORLD.features as Feature[], [])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const textureRef = useRef<HTMLImageElement | null>(null)

  const [projection] = useState(() =>
    geoOrthographic()
      .scale(CANVAS / 2)
      .translate([CANVAS / 2, CANVAS / 2])
      .clipAngle(90)
      .precision(0.3),
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
      textureRef.current = img
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
    const R = CANVAS / 2
    const C = CANVAS / 2
    projection.rotate(rotationRef.current)
    ctx.clearRect(0, 0, CANVAS, CANVAS)

    ctx.save()
    ctx.beginPath()
    ctx.arc(C, C, R - 0.5, 0, Math.PI * 2)
    ctx.clip()

    const tex = textureRef.current
    if (tex) {
      const TW = tex.naturalWidth
      const TH = tex.naturalHeight
      const uHalf = TW / (2 * SEGMENTS)
      const sh = (TH * ROW) / CANVAS * 1.35
      for (let y = 0; y < CANVAS; y += ROW) {
        const cy = y + ROW / 2
        const ny = (cy - C) / R
        if (Math.abs(ny) >= 1) continue
        const halfChord = Math.sqrt(1 - ny * ny) * R
        const x0 = C - halfChord
        const segW = (2 * halfChord) / SEGMENTS
        for (let k = 0; k < SEGMENTS; k++) {
          const sx0 = x0 + k * segW
          const inv = projection.invert?.([sx0 + segW / 2, cy])
          if (!inv) continue
          const [lon, lat] = inv
          const uC = ((lon + 180) / 360) * TW
          const vC = ((90 - lat) / 180) * TH
          const sy = Math.max(0, Math.min(TH - sh, vC - sh / 2))
          drawWrapped(ctx, tex, uC - uHalf, sy, 2 * uHalf, sh, sx0, y, segW, ROW, TW)
        }
      }
    } else {
      // Fallback ocean until the texture loads (first paint only).
      const g = ctx.createRadialGradient(C * 0.65, C * 0.6, R * 0.1, C, C, R)
      g.addColorStop(0, '#2f6fb4')
      g.addColorStop(1, '#123a6b')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, CANVAS, CANVAS)
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
      ctx.lineWidth = 2
      ctx.shadowColor = 'rgba(245, 158, 11, 0.95)'
      ctx.shadowBlur = 16
      ctx.stroke()
      ctx.restore()
    }

    // Navy tint so white hero text stays readable over the photo.
    ctx.fillStyle = 'rgba(8, 26, 54, 0.20)'
    ctx.fillRect(0, 0, CANVAS, CANVAS)

    // Limb shading: darker towards the edge, like a real planet photo.
    const limb = ctx.createRadialGradient(C, C, R * 0.55, C, C, R)
    limb.addColorStop(0, 'rgba(2, 8, 20, 0)')
    limb.addColorStop(0.82, 'rgba(2, 8, 20, 0.10)')
    limb.addColorStop(1, 'rgba(2, 8, 20, 0.55)')
    ctx.fillStyle = limb
    ctx.fillRect(0, 0, CANVAS, CANVAS)
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
        <canvas ref={canvasRef} width={CANVAS} height={CANVAS} className="block size-full" />
      </div>
    </div>
  )
}
