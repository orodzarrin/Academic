'use client'

import { useEffect, useRef, useState } from 'react'

type Phase = 'rest' | 'fly' | 'settle'

/**
 * Small spinning globe that lives at the bottom-right of the blue hero on the
 * Universities page. Whenever a country chip is picked it spins, flies
 * forward and grows until it spills past the hero frame's bottom edge, then
 * settles there while that country stays selected. Picking "All countries"
 * shrinks it back to its small resting size. Decorative only — it never
 * intercepts clicks (pointer-events-none) and the filter itself is unchanged.
 */
export function CountryGlobe({ countryName }: { countryName: string | null }) {
  const [phase, setPhase] = useState<Phase>(countryName ? 'fly' : 'rest')
  const [animKey, setAnimKey] = useState(0)
  const previousCountry = useRef<string | null>(countryName)

  useEffect(() => {
    const previous = previousCountry.current
    previousCountry.current = countryName
    if (countryName && countryName !== previous) {
      setPhase('fly')
      setAnimKey((key) => key + 1)
    } else if (!countryName && previous) {
      setPhase('settle')
      setAnimKey((key) => key + 1)
    }
  }, [countryName])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -top-16 right-4 z-20 sm:-top-20 sm:right-8 lg:right-12"
    >
      <span className="sr-only">
        {countryName ? `Globe flying to ${countryName}` : 'Globe'}
      </span>
      <div
        key={animKey}
        className={phase === 'fly' ? 'globe-fly' : phase === 'settle' ? 'globe-settle' : undefined}
      >
        <svg
          viewBox="0 0 100 100"
          className="size-14 drop-shadow-[0_10px_16px_rgba(2,20,50,0.45)] sm:size-16"
        >
          <defs>
            <radialGradient id="country-globe-ocean" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#8ec9f7" />
              <stop offset="55%" stopColor="#3b8bd6" />
              <stop offset="100%" stopColor="#174a86" />
            </radialGradient>
            <clipPath id="country-globe-clip">
              <circle cx="50" cy="50" r="47" />
            </clipPath>
          </defs>
          <circle cx="50" cy="50" r="47" fill="url(#country-globe-ocean)" />
          <g
            clipPath="url(#country-globe-clip)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.4"
            fill="none"
            className="globe-wire"
          >
            <ellipse cx="50" cy="50" rx="16" ry="47" />
            <ellipse cx="50" cy="50" rx="32" ry="47" />
            <line x1="3" y1="32" x2="97" y2="32" />
            <line x1="3" y1="50" x2="97" y2="50" />
            <line x1="3" y1="68" x2="97" y2="68" />
            <ellipse cx="50" cy="50" rx="47" ry="18" />
          </g>
          <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
          <ellipse cx="36" cy="28" rx="18" ry="10" fill="rgba(255,255,255,0.28)" transform="rotate(-18 36 28)" />
        </svg>
      </div>
    </div>
  )
}
