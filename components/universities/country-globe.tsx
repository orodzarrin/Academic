'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { geoBounds, geoCentroid, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection } from 'geojson'
import topologyJson from '@/data/countries-110m.json'
import { EARTH_TEXTURE_DATA_URL } from '@/data/earth-texture'

type Topology = Parameters<typeof feature>[0]

/**
 * A real Earth for the Universities page hero: a NASA Blue Marble satellite
 * photo (2048x1024, vendored as base64 in data/earth-texture.ts — no
 * external URL at runtime) painted onto a real 3D sphere with raw WebGL,
 * so the map looks like a genuine photo of Earth, not flat cartoon shapes.
 * Country shapes (Natural Earth, data/countries-110m.json) are still used
 * for the rotation math and to highlight the picked country over the photo.
 *
 * Why WebGL, not a 2D canvas: the photo was previously painted with a
 * 2D-canvas scanline renderer (small screen segments, one affine texture
 * sample each). That kept producing artifacts no patch could kill — a
 * vertical streak band wherever the ±180° seam sat inside the disc, and at
 * the 2x selected zoom the affine segments smeared and warped the land
 * (Scandinavia stretched, vertical streaks in the oceans). A GPU sphere
 * has none of that: every fragment samples the texture with bilinear
 * filtering and mipmaps, the texture wraps around the seam, and the image
 * stays exact at any zoom. Verified against a per-pixel reference render
 * of the same texture (scripts in globe-verification/): the reference was
 * clean where the scanline renderer smeared.
 *
 * Why the oceans are smooth: the source Blue Marble carries
 * bathymetry / ocean-colour mottling that reads as blotches on the globe
 * at every rotation, and the same per-pixel reference showed the identical
 * blotches — so it was the texture, not the renderer. The vendored
 * texture's ocean pixels were replaced with a heavily blurred version of
 * themselves (see the note in data/earth-texture.ts); the seas are now a
 * smooth deep blue and the land is untouched.
 *
 * Motion: at rest the globe idly spins. When a country is picked it flies
 * so that country faces the viewer, rises up, and grows — how much depends
 * on the country's size (a small country like Qatar zooms to 5x, a large
 * one like Germany stays near 2x), with the country lit up amber over the
 * photo — and it keeps a SMALL gentle wobble around the picked country (a
 * few degrees either side, ~9s period, scaled to the country's size so a
 * tiny country stays centred), so it never freezes and never spins away
 * from the country. It stays a background layer (pointer-events-none, -z-10)
 * behind the hero text and filter chips.
 *
 * Sizing: at rest the globe is SMALL and fits INSIDE the blue hero (about
 * the hero's height, ~380px on desktop), sitting on the right so the text
 * on the left stays clear.
 */

const IDLE_SPIN_DEG_PER_SEC = 5
const FLY_DURATION_MS = 1100
const FRAME_MS = 33 // ~30fps cap for the canvas loop
const MIN_CANVAS = 640
const MAX_CANVAS = 1280
// Gentle wobble around a picked country: small enough that the country
// stays centred and in view, big enough that the globe never looks frozen.
const WOBBLE_LAMBDA_DEG = 3
const WOBBLE_PHI_DEG = 2
const WOBBLE_PERIOD_MS = 9000
// Size-aware zoom: every country used to get the same 2x, so a tiny country
// like Qatar was just a dot. The zoom now depends on the country's angular
// size (from its GeoJSON bounding box): zoom = 18 / extent, clamped to
// 2x-5x. A country ~9 deg across (Germany) stays near 2x; anything smaller
// zooms closer, up to 5x — close enough to see the country clearly, never
// so far that the globe stops looking like a globe.
const ZOOM_REF_DEG = 18
const ZOOM_MIN = 2
const ZOOM_MAX = 5
// Marker countries (Singapore, Hong Kong, Macau) have no 110m shape; treat
// them as a ~0.5 deg country so they get the closest zoom too.
const MARKER_EXTENT_DEG = 0.5

/** Angular size of a country in degrees: the larger side of its GeoJSON
 * bounding box, with longitude squashed by cos(latitude). An antimeridian
 * artefact (a negative longitude span) counts as 0 — the latitude span
 * still sizes the country, and the zoom is clamped anyway. */
function countryExtentDeg(f: Feature): number {
  const [[loMin, laMin], [loMax, laMax]] = geoBounds(f)
  const midLat = (((laMin + laMax) / 2) * Math.PI) / 180
  const w = Math.max(0, loMax - loMin) * Math.cos(midLat)
  return Math.max(w, laMax - laMin)
}

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

// ---------------------------------------------------------------------------
// Raw WebGL textured sphere. No new dependency: the sphere is a plain
// lat/lon grid, the photo is one mipmapped texture, and the rotation is a
// single 3x3 matrix uniform. The seam column of vertices is duplicated
// (u = 0 and u = 1), so no triangle ever spans the antimeridian.
// ---------------------------------------------------------------------------

const SPHERE_LON_SEGS = 160
const SPHERE_LAT_SEGS = 80

function buildSphereGeometry() {
  const cols = SPHERE_LON_SEGS + 1
  const rows = SPHERE_LAT_SEGS + 1
  const positions = new Float32Array(cols * rows * 3)
  const uvs = new Float32Array(cols * rows * 2)
  let p = 0
  let q = 0
  for (let i = 0; i < rows; i++) {
    const lat = ((90 - (i * 180) / SPHERE_LAT_SEGS) * Math.PI) / 180
    const cosLat = Math.cos(lat)
    const sinLat = Math.sin(lat)
    for (let j = 0; j < cols; j++) {
      const lon = ((-180 + (j * 360) / SPHERE_LON_SEGS) * Math.PI) / 180
      positions[p++] = cosLat * Math.sin(lon)
      positions[p++] = sinLat
      positions[p++] = cosLat * Math.cos(lon)
      uvs[q++] = j / SPHERE_LON_SEGS
      uvs[q++] = i / SPHERE_LAT_SEGS
    }
  }
  const indices = new Uint16Array(SPHERE_LON_SEGS * SPHERE_LAT_SEGS * 6)
  let k = 0
  for (let i = 0; i < SPHERE_LAT_SEGS; i++) {
    for (let j = 0; j < SPHERE_LON_SEGS; j++) {
      const a = i * cols + j
      const b = a + 1
      const c = a + cols
      const d = c + 1
      indices[k++] = a
      indices[k++] = c
      indices[k++] = b
      indices[k++] = b
      indices[k++] = c
      indices[k++] = d
    }
  }
  return { positions, uvs, indices }
}

const VERT_SRC = `
attribute vec3 aPos;
attribute vec2 aUv;
uniform mat3 uRot;
varying vec2 vUv;
varying float vNz;
void main() {
  vec3 p = uRot * aPos;
  vUv = aUv;
  vNz = p.z;
  gl_Position = vec4(p.x, p.y, -p.z, 1.0);
}
`

const FRAG_SRC = `
precision mediump float;
uniform sampler2D uTex;
varying vec2 vUv;
varying float vNz;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  // Navy tint so white hero text stays readable over the photo.
  c = c * 0.8 + vec3(8.0 / 255.0, 26.0 / 255.0, 54.0 / 255.0) * 0.2;
  // Limb shading: darker towards the edge, like a real planet photo.
  float d = clamp(vNz, 0.0, 1.0);
  float r = sqrt(max(0.0, 1.0 - d * d));
  float dark = r < 0.55 ? 0.0 : (r < 0.82 ? 0.10 * (r - 0.55) / 0.27 : 0.10 + 0.45 * (r - 0.82) / 0.18);
  c *= 1.0 - dark;
  gl_FragColor = vec4(c, 1.0);
}
`

/**
 * D3 rotation [lambda, phi] (degrees) -> 3x3 matrix, column-major, for
 * v = Rx(-phi) * Ry(lambda) * s. This is the same rotation the D3
 * orthographic projection applies, so the WebGL sphere and the 2D
 * highlight overlay agree exactly.
 */
function rotationMatrix(lambdaDeg: number, phiDeg: number): Float32Array {
  const lam = (lambdaDeg * Math.PI) / 180
  const phi = (phiDeg * Math.PI) / 180
  const cl = Math.cos(lam)
  const sl = Math.sin(lam)
  const cp = Math.cos(-phi)
  const sp = Math.sin(-phi)
  // M = Rx(-phi) * Ry(lambda); rows:
  //   [cl, 0, sl]
  //   [sp*sl, cp, -sp*cl]
  //   [-cp*sl, sp, cp*cl]
  return new Float32Array([
    cl,
    sp * sl,
    -cp * sl,
    0,
    cp,
    sp,
    sl,
    -sp * cl,
    cp * cl,
  ])
}

interface GlState {
  gl: WebGLRenderingContext
  program: WebGLProgram
  uRot: WebGLUniformLocation | null
  indexCount: number
  texture: WebGLTexture | null
  size: number
}

function createGlTexture(
  gl: WebGLRenderingContext,
  image: HTMLImageElement,
): WebGLTexture | null {
  const tex = gl.createTexture()
  if (!tex) return null
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.generateMipmap(gl.TEXTURE_2D)
  return tex
}

/** (Re)create the GL context, program, buffers and texture for a canvas. */
function initGL(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
): GlState | null {
  const gl = (canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: false,
  }) ??
    canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: false,
    })) as WebGLRenderingContext | null
  if (!gl) return null

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh)
      return null
    }
    return sh
  }
  const vs = compile(gl.VERTEX_SHADER, VERT_SRC)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC)
  if (!vs || !fs) return null
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null

  const geo = buildSphereGeometry()
  const posBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
  gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW)
  const uvBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
  gl.bufferData(gl.ARRAY_BUFFER, geo.uvs, gl.STATIC_DRAW)
  const idxBuf = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW)

  gl.useProgram(program)
  const aPos = gl.getAttribLocation(program, 'aPos')
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)
  const aUv = gl.getAttribLocation(program, 'aUv')
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
  gl.enableVertexAttribArray(aUv)
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)

  const texture = image ? createGlTexture(gl, image) : null
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)
  gl.enable(gl.DEPTH_TEST)
  gl.depthFunc(gl.LEQUAL)
  return {
    gl,
    program,
    uRot: gl.getUniformLocation(program, 'uRot'),
    indexCount: geo.indices.length,
    texture,
    size: canvas.width,
  }
}

export function CountryGlobe({ countryName }: { countryName: string | null }) {
  const features = useMemo(() => WORLD.features as Feature[], [])

  const selected = useMemo(() => {
    if (!countryName) return null
    const topoName = COUNTRY_NAME_MAP[countryName] ?? countryName
    return (
      features.find(
        (f) => (f.properties as { name?: string } | null)?.name === topoName,
      ) ?? null
    )
  }, [countryName, features])

  // Size-aware zoom for the picked country: small countries zoom closer.
  const selectedExtentDeg = useMemo(() => {
    if (selected) return countryExtentDeg(selected)
    if (countryName && COUNTRY_FOCUS[countryName]) return MARKER_EXTENT_DEG
    return null
  }, [selected, countryName])

  const zoom = selectedExtentDeg
    ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, ZOOM_REF_DEG / selectedExtentDeg))
    : 1

  // Wobble amplitude scaled to the country's size: at 5x zoom a fixed 3 deg
  // swing would shove a tiny country far off-centre, so small countries get
  // a smaller swing (floored so the globe never looks frozen).
  const wobbleRef = useRef({ lambda: WOBBLE_LAMBDA_DEG, phi: WOBBLE_PHI_DEG })
  useEffect(() => {
    if (!selectedExtentDeg) return
    wobbleRef.current = {
      lambda: Math.min(
        WOBBLE_LAMBDA_DEG,
        Math.max(0.8, selectedExtentDeg * 0.75),
      ),
      phi: Math.min(WOBBLE_PHI_DEG, Math.max(0.6, selectedExtentDeg * 0.5)),
    }
  }, [selectedExtentDeg])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const glStateRef = useRef<GlState | null>(null)
  const glFailedRef = useRef(false)

  // Backing-store size: displayed size x scale x devicePixelRatio, capped.
  // The container's offsetWidth is the layout width (unaffected by the CSS
  // scale transform), so it stays 200/320/380px even at 5x.
  const [canvasSize, setCanvasSize] = useState(768)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const w = el.offsetWidth || 380
      const scale = zoom
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
  }, [zoom])

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
  const targetRef = useRef<[number, number] | null>(null)
  const selectedNameRef = useRef<string | null>(countryName)
  const selectedRef = useRef<Feature | null>(null)
  const lastFrameRef = useRef(0)

  // Load the vendored satellite texture once; draw as soon as it is ready.
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      glStateRef.current = null // re-init so the texture gets uploaded
      glFailedRef.current = false
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
    const overlay = overlayRef.current
    if (!canvas || !overlay) return
    const S = canvas.width
    const R = S / 2
    const C = S / 2
    const [lam, phi] = rotationRef.current

    // WebGL photo sphere. Resizing the canvas resets the GL context, so the
    // state is rebuilt whenever the backing-store size changed.
    if (!glFailedRef.current) {
      if (!glStateRef.current || glStateRef.current.size !== S) {
        glStateRef.current = initGL(canvas, imageRef.current)
        if (!glStateRef.current) glFailedRef.current = true
      }
    }
    const st = glStateRef.current
    if (st?.texture) {
      const gl = st.gl
      gl.viewport(0, 0, S, S)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.useProgram(st.program)
      if (st.uRot) gl.uniformMatrix3fv(st.uRot, false, rotationMatrix(lam, phi))
      gl.drawElements(gl.TRIANGLES, st.indexCount, gl.UNSIGNED_SHORT, 0)
    }

    // 2D overlay: the picked-country highlight, the tiny-country marker and
    // the atmosphere rim — drawn with the same D3 projection, so they land
    // exactly on the photographed landmass. (If WebGL is unavailable the
    // overlay also paints a plain ocean disc as a fallback.)
    const ctx = overlay.getContext('2d')
    if (!ctx) return
    projection.scale(R).translate([C, C]).rotate(rotationRef.current)
    ctx.clearRect(0, 0, S, S)
    ctx.save()
    ctx.beginPath()
    ctx.arc(C, C, R - 0.5, 0, Math.PI * 2)
    ctx.clip()
    if (!st?.texture) {
      const g = ctx.createRadialGradient(C * 0.65, C * 0.6, R * 0.1, C, C, R)
      g.addColorStop(0, '#2f6fb4')
      g.addColorStop(1, '#123a6b')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
    }
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
    targetRef.current = target
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

  // One animation loop: idle spin at rest, eased fly to a picked country,
  // then a gentle wobble around that country so it never freezes.
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
      } else if (selectedNameRef.current && targetRef.current) {
        // Gentle wobble around the picked country: a few degrees either
        // side, so the country stays centred and in view — the globe keeps
        // a small movement but never spins away from the country. The swing
        // is scaled to the country's size, so a tiny country at 5x zoom
        // does not drift off-centre.
        const w = (2 * Math.PI * now) / WOBBLE_PERIOD_MS
        rotationRef.current = [
          targetRef.current[0] + wobbleRef.current.lambda * Math.sin(w),
          targetRef.current[1] + wobbleRef.current.phi * Math.sin(w + 1.3),
        ]
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
        className="earth-globe relative aspect-square w-[200px] md:w-[320px] lg:w-[380px]"
        style={
          {
            '--earth-scale': zoom,
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
          className="absolute inset-0 block size-full"
        />
        <canvas
          ref={overlayRef}
          width={canvasSize}
          height={canvasSize}
          className="absolute inset-0 block size-full"
        />
      </div>
    </div>
  )
}
