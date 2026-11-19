'use client'

import { SlidersHorizontal } from 'lucide-react'
import Form from 'next/form'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  ACADEMIC_ROLES,
  CIVIL_SPECIALISMS,
  COUNTRIES,
  SALARY_OPTIONS,
  WORLD_CITIES,
  getWorldCities,
  inferCountryForCity,
} from '@/lib/taxonomy'
import type { JobFilters as Filters } from '@/lib/types'
import { cn } from '@/lib/utils'

interface JobFiltersProps {
  action: string
  filters: Filters
  lockSector?: boolean
  lockCity?: boolean
  activeCount: number
}

const selectClass =
  'h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b pb-5 last:border-b-0">
      <legend className="mb-3 font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {legend}
      </legend>
      {children}
    </fieldset>
  )
}

function Toggle({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={checked}
        className="size-4 rounded border-input accent-[var(--primary)]"
      />
      {label}
    </label>
  )
}

export function JobFilters({ action, filters, lockSector, lockCity, activeCount }: JobFiltersProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // Country first, then city. A city arriving without a country (an old link)
  // inherits its country when it belongs to exactly one.
  const [country, setCountry] = useState(filters.country ?? inferCountryForCity(filters.city) ?? '')
  // With no country chosen the city list is empty; but when a city is already
  // active and its country is ambiguous (Cambridge: UK and US), keep the full
  // world list so the active selection is not lost on submit.
  const cities = country ? getWorldCities(country) : filters.city ? WORLD_CITIES : []
  const cityDisabled = !country && !filters.city

  function navigate(form: HTMLFormElement) {
    const params = new URLSearchParams()
    for (const [key, value] of new FormData(form)) {
      if (typeof value === 'string' && value.trim()) params.set(key, value.trim())
    }
    const query = params.toString()
    startTransition(() => router.push(query ? `${action}?${query}` : action, { scroll: false }))
  }

  const roleGroups = [{ label: 'Academic', roles: ACADEMIC_ROLES, sector: 'academic' }]

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="job-filters"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md border bg-card text-sm font-medium lg:hidden"
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        {open ? 'Hide filters' : 'Show filters'}
        {activeCount > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{activeCount}</span>
        )}
      </button>

      <Form
        key={JSON.stringify(filters)}
        id="job-filters"
        action={action}
        aria-label="Filter jobs"
        onSubmit={(event) => {
          event.preventDefault()
          navigate(event.currentTarget)
        }}
        onChange={(event) => {
          if ((event.target as HTMLElement).getAttribute('name') !== 'q') navigate(event.currentTarget)
        }}
        className={cn('mt-4 flex-col gap-5 rounded-lg border bg-card p-5 lg:mt-0 lg:flex', open ? 'flex' : 'hidden')}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Filters</h2>
          {activeCount > 0 && (
            <Link href={action} className="text-sm text-primary hover:underline">
              Clear all
            </Link>
          )}
        </div>

        <Fieldset legend="Keywords">
          <label htmlFor="filter-q" className="sr-only">
            Keywords
          </label>
          <input
            id="filter-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="e.g. bridges, timber, CPEng"
            className={selectClass}
          />
        </Fieldset>


        <Fieldset legend="Civil specialism">
          <label htmlFor="filter-specialism" className="sr-only">
            Civil specialism
          </label>
          <select
            id="filter-specialism"
            name="specialism"
            defaultValue={filters.specialism ?? ''}
            className={selectClass}
          >
            <option value="">All specialisms</option>
            {CIVIL_SPECIALISMS.map((specialism) => (
              <option key={specialism.slug} value={specialism.slug}>
                {specialism.name}
              </option>
            ))}
          </select>
        </Fieldset>

        <Fieldset legend="Role">
          <label htmlFor="filter-role" className="sr-only">
            Role
          </label>
          <select id="filter-role" name="role" defaultValue={filters.role ?? ''} className={selectClass}>
            <option value="">All roles</option>
            {roleGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.roles.map((role) => (
                  <option key={role.slug} value={role.slug}>
                    {role.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Fieldset>

        {!lockCity && (
          <Fieldset legend="Location">
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="filter-country" className="mb-1.5 block text-sm">
                  Country
                </label>
                <select
                  id="filter-country"
                  name="country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className={selectClass}
                >
                  <option value="">All countries</option>
                  {COUNTRIES.map((entry) => (
                    <option key={entry.slug} value={entry.slug}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filter-city" className="mb-1.5 block text-sm">
                  City
                </label>
                <select
                  id="filter-city"
                  name="city"
                  key={country}
                  defaultValue={filters.city ?? ''}
                  className={selectClass}
                  disabled={cityDisabled}
                >
                  <option value="">{country || filters.city ? 'All cities' : 'Select a country first'}</option>
                  {cities.map((city) => (
                    <option key={`${city.country}-${city.slug}`} value={city.slug}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Fieldset>
        )}

        <Fieldset legend="Salary range">
          <label htmlFor="filter-salary" className="sr-only">
            Minimum salary
          </label>
          <select id="filter-salary" name="salary" defaultValue={filters.salaryMin ?? ''} className={selectClass}>
            <option value="">Any salary</option>
            {SALARY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Fieldset>

        <Fieldset legend="Work type">
          <div className="flex flex-col">
            <Toggle name="visa" label="Visa sponsorship" checked={filters.visa} />
            <Toggle name="remote" label="Remote" checked={filters.remote} />
            <Toggle name="hybrid" label="Hybrid" checked={filters.hybrid} />
            <Toggle name="fulltime" label="Full time" checked={filters.fullTime} />
          </div>
        </Fieldset>

        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
        >
          {isPending ? 'Updating…' : 'Apply filters'}
        </button>
      </Form>
    </div>
  )
}
