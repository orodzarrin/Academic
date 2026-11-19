'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { geoCentroid, geoGraticule, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection } from 'geojson'
import topologyJson from '@/data/countries-110m.json'

type Topology = Parameters<typeof feature>[0]

/**
 * A real Earth for the Universities page hero: a D3 orthographic globe drawn
 * from Natural Earth country shapes (world-atlas countries-110m, vendored in
 * data/countries-110m.json), so the land is the actual world map — continents
 * and country outlines — not a wireframe.
 *
 * The globe is a background layer inside the blue hero: at rest its diameter
 * equals the hero frame's width; when a country chip is picked it spins so
 * that country faces the viewer, the country lights up bold with a glowing
 * border, and the whole globe grows to double the hero width, spilling past
 * the frame. It sits behind the hero text and the filter chips
 * (pointer-events-none, -z-10) and never blocks a click or covers the writing.
 */

const SIZE = 1000
const IDLE_SPIN_DEG_PER_SEC = 5
const FLY_DURATION_MS = 1100

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

const GRATICULE = geoGraticule()

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function CountryGlobe({ countryName }: { countryName: string | null }) {
  const features = useMemo(() => WORLD.features as Feature[], [])

  const [projection] = useState(() =>
    geoOrthographic()
      .scale(SIZE / 2)
      .translate([SIZE / 2, SIZE / 2])
      .clipAngle(90)
      .precision(0.3),
  )
  const [pathGen] = useState(() => geoPath(projection))

  const rotationRef = useRef<[number, number]>([0, 0])
  const animRef = useRef<{
    from: [number, number]
    to: [number, number]
    start: number
    duration: number
  } | null>(null)
  const selectedNameRef = useRef<string | null>(countryName)
  const pathElsRef = useRef<(SVGPathElement | null)[]>([])
  const graticuleElRef = useRef<SVGPathElement | null>(null)

  const selected = useMemo(() => {
    if (!countryName) return null
    const topoName = COUNTRY_NAME_MAP[countryName] ?? countryName
    return (
      features.find(
        (f) => (f.properties as { name?: string } | null)?.name === topoName,
      ) ?? null
    )
  }, [countryName, features])

  // First-paint paths (server render): the map is visible before any frame runs.
  const initialPaths = useMemo(
    () => features.map((f) => pathGen(f) ?? ''),
    [features, pathGen],
  )
  const initialGraticule = useMemo(() => pathGen(GRATICULE()) ?? '', [pathGen])

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
  // Path `d` attributes are written straight to the DOM each frame so the
  // map can spin without re-rendering React 60 times a second.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
      } else if (!selectedNameRef.current && !reduced) {
        rotationRef.current = [
          rotationRef.current[0] + (dt / 1000) * IDLE_SPIN_DEG_PER_SEC,
          rotationRef.current[1],
        ]
      }
      projection.rotate(rotationRef.current)
      for (let i = 0; i < features.length; i++) {
        const el = pathElsRef.current[i]
        if (el) el.setAttribute('d', pathGen(features[i]) ?? '')
      }
      if (graticuleElRef.current) {
        graticuleElRef.current.setAttribute('d', pathGen(GRATICULE()) ?? '')
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [features, pathGen, projection])

  return (
    <div
      aria-hidden="true"
      className="earth-globe pointer-events-none absolute top-1/2 left-1/2 -z-10 aspect-square w-full -translate-x-1/2 -translate-y-1/2"
      style={{ '--earth-scale': countryName ? 2 : 1 } as CSSProperties}
    >
      <span className="sr-only">
        {countryName ? `Globe showing ${countryName}` : 'Globe'}
      </span>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full">
        <defs>
          <radialGradient id="earth-ocean" cx="35%" cy="30%" r="85%">
            <stop offset="0%" stopColor="#5ea3dd" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#2f6fb4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1b4a80" stopOpacity="0.85" />
          </radialGradient>
        </defs>
        {/* Soft halo so the disc reads against the dark-blue hero. */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={SIZE / 2 - 1}
          fill="none"
          stroke="rgba(147, 197, 253, 0.16)"
          strokeWidth={48}
        />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 1} fill="url(#earth-ocean)" />
        <path
          ref={graticuleElRef}
          d={initialGraticule}
          fill="none"
          stroke="rgba(255, 255, 255, 0.13)"
          strokeWidth={1}
        />
        {features.map((f, i) => {
          const name = (f.properties as { name?: string } | null)?.name
          const isSelected = selected !== null && f === selected
          return (
            <path
              key={name ?? i}
              ref={(el) => {
                pathElsRef.current[i] = el
              }}
              d={initialPaths[i]}
              className={isSelected ? 'earth-country-selected' : 'earth-country'}
            />
          )
        })}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={SIZE / 2 - 1}
          fill="none"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  )
}
