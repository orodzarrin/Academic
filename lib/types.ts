import type { EmploymentType, Sector, StateCode, WorkArrangement } from './taxonomy'

/**
 * Where a listing came from. `direct` (employer submissions), `careerjet`,
 * `jooble`, `workday` and `pageup` (employer career sites) are the free feeds;
 * `adzuna` is optional and paid. Only `demo` is fabricated.
 */
export type JobSource =
  | 'adzuna'
  | 'careerjet'
  | 'jooble'
  | 'workday'
  | 'pageup'
  | 'direct'
  | 'demo'

/**
 * Mirrors the `jobs` table in scripts/001_create_jobs.sql (snake_case columns
 * map to the camelCase fields below).
 *
 * Salary is optional because live listings frequently omit it. `undefined`
 * means "not advertised" and is never rendered as zero.
 */
export interface Job {
  id: string
  slug: string
  title: string
  roleSlug: string
  sector: Sector
  organisation: string
  department?: string
  city: string
  /** Australian state code only; absent for universities outside Australia. */
  state?: StateCode
  /** Country name, e.g. "Australia", "United Kingdom". Absent on legacy AU-only records. */
  country?: string
  location: string
  salaryMin?: number
  salaryMax?: number
  /** ISO 4217 code of the stipend, e.g. AUD, GBP, USD, EUR, CAD, CHF. Defaults to AUD. */
  salaryCurrency?: string
  salaryPeriod: 'year' | 'scholarship'
  employmentType: EmploymentType
  workArrangement: WorkArrangement
  visaSponsorship: boolean
  featured: boolean
  postedAt: string
  /**
   * Last time the source ad changed. Absent on listings the feed never
   * re-reported: callers fall back to postedAt, so "Updated" never shows a
   * blank or an invented date.
   */
  updatedAt?: string
  /** Absent when the listing states no closing date (open until filled / rolling review). */
  closingDate?: string
  summary: string
  description: string
  responsibilities: string[]
  requirements: string[]
  tags: string[]
  applyUrl: string
  /** Absent on legacy demo seeds; treat anything other than `adzuna` as third-party. */
  source?: JobSource
  externalId?: string
}

export interface JobFilters {
  q?: string
  sector?: Sector
  role?: string
  /** Country slug, e.g. "united-kingdom" — pick a country before a city. */
  country?: string
  city?: string
  state?: StateCode
  salaryMin?: number
  visa?: boolean
  remote?: boolean
  hybrid?: boolean
  fullTime?: boolean
  /** Civil sub-discipline, e.g. structural, geotechnical, water, transport. */
  specialism?: string
}
