'use client'

import { Globe, MapPin, Search, Briefcase } from 'lucide-react'
import { useState } from 'react'
import { COUNTRIES, getWorldCities } from '@/lib/taxonomy'

const fieldClass =
  'h-12 w-full appearance-none rounded-md border-0 bg-transparent pr-3 pl-10 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function SearchBar() {
  // Country first, then city: the city list is built from the jobs in the
  // chosen country, so it covers the world instead of Australia only.
  const [country, setCountry] = useState('')
  const cities = country ? getWorldCities(country) : []

  return (
    <form
      action="/jobs"
      method="get"
      role="search"
      aria-label="Search PhD Scholarship jobs"
      className="grid gap-2 rounded-xl bg-card p-2 shadow-2xl shadow-black/20 md:grid-cols-[1.4fr_0.8fr_1fr_1fr_auto] md:gap-0 md:divide-x"
    >
      <div className="relative">
        <label htmlFor="search-q" className="sr-only">
          Keywords
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id="search-q"
          name="q"
          type="search"
          placeholder="Job title, keyword or employer"
          className={`${fieldClass} placeholder:text-muted-foreground`}
        />
      </div>

      <div className="relative">
        <label htmlFor="search-sector" className="sr-only">
          Job type
        </label>
        <Briefcase className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <select id="search-sector" name="sector" defaultValue="academic" className={fieldClass}>
          <option value="academic">Academic</option>
        </select>
      </div>

      <div className="relative">
        <label htmlFor="search-country" className="sr-only">
          Country
        </label>
        <Globe className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <select
          id="search-country"
          name="country"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className={fieldClass}
        >
          <option value="">All countries</option>
          {COUNTRIES.map((entry) => (
            <option key={entry.slug} value={entry.slug}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <label htmlFor="search-city" className="sr-only">
          City
        </label>
        <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <select id="search-city" name="city" key={country} defaultValue="" className={fieldClass} disabled={!country}>
          <option value="">{country ? 'All cities' : 'Select a country first'}</option>
          {cities.map((city) => (
            <option key={`${city.country}-${city.slug}`} value={city.slug}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <div className="md:pl-2">
        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent px-6 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Search className="size-4" aria-hidden="true" />
          Search jobs
        </button>
      </div>
    </form>
  )
}
