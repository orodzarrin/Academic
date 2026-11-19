import dataset from '@/data/jobs.json'
import directPhdDataset from '@/data/phd-scholarships-direct.json'
import { SAMPLE_JOBS } from './data/sample-jobs'
import { getAcademicPositions } from './academic-positions'
import { ACADEMIC_ROLES, ALL_ROLES, CIVIL_SPECIALISMS, STATES, countrySlug, getWorldCity, inferCountryForCity, isKnownCountry as isKnownCountrySlug, isKnownWorldCity, type Sector, type StateCode } from './taxonomy'
import type { Job, JobFilters } from './types'

/*
 * Data access layer. Every page reads jobs through these async functions.
 *
 * Live listings live in data/jobs.json, which scripts/ingest-jobs.mjs refreshes
 * from the Adzuna AU API on a 6am schedule (see .github/workflows/refresh-jobs.yml).
 * The file is committed so the site stays statically rendered, and each deploy
 * picks up the newest snapshot.
 *
 * The bundled sample listings are only used when NEXT_PUBLIC_DEMO_JOBS=1 and no
 * live data exists yet, so the design can be reviewed before the first sync.
 * Demo data is never served in production and never marked up as a JobPosting.
 */

interface JobsFile {
  generatedAt: string | null
  source: string
  jobs: Job[]
}

const FILE = dataset as unknown as JobsFile
const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_JOBS === '1'

const sydneyDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Australia/Sydney',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function today() {
  return sydneyDate.format(new Date())
}

function byNewest(a: Job, b: Job) {
  return b.postedAt.localeCompare(a.postedAt)
}

function isOpen(job: Job) {
  // No closing date means open until filled / rolling review: still open.
  return !job.closingDate || job.closingDate >= today()
}

/**
 * Jooble returns an empty company for some aggregated ads, and older snapshots
 * stored those as "Unnamed employer". A placeholder is not information, so it is
 * treated as "employer not named" and the organisation line is left out.
 */
const PLACEHOLDER_EMPLOYER =
  /^(unnamed employer|unknown( employer)?|n\/?a|none|not specified|not disclosed|employer confidential)$/i

function withRealEmployer(job: Job): Job {
  const organisation = String(job.organisation ?? '').trim()
  return PLACEHOLDER_EMPLOYER.test(organisation) ? { ...job, organisation: '' } : job
}

const LIVE_JOBS: Job[] = FILE.jobs.filter(isOpen).map(withRealEmployer).sort(byNewest)

/*
 * PhD scholarships sourced directly from official university pages
 * (data/phd-scholarships-direct.json) — each verified live on the
 * university's own site, never from aggregators (no Jooble/LinkedIn/
 * Indeed). Merged here so they appear in the PhD section, search and
 * detail pages. The nightly ingest only rewrites data/jobs.json, so
 * this file is never touched by it. Entries duplicating an existing
 * listing (same title + university) are skipped.
 */
const DIRECT_FILE = directPhdDataset as unknown as JobsFile

function titleKey(job: Job) {
  return `${job.organisation}::${job.title}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const DIRECT_PHDS: Job[] = DIRECT_FILE.jobs
  .filter(isOpen)
  .map(withRealEmployer)
  .filter(
    (job) =>
      !LIVE_JOBS.some((live) => live.slug === job.slug || titleKey(live) === titleKey(job)),
  )

const ALL_LIVE_JOBS: Job[] = [...LIVE_JOBS, ...DIRECT_PHDS].sort(byNewest)

export const IS_DEMO_DATA = LIVE_JOBS.length === 0 && DEMO_ENABLED
export const DATA_UPDATED_AT = FILE.generatedAt
export const HAS_LIVE_DATA = LIVE_JOBS.length > 0

const JOBS: Job[] = IS_DEMO_DATA
  ? SAMPLE_JOBS.filter((job) => ACADEMIC_ROLES.some((role) => role.slug === job.roleSlug)).sort(byNewest)
  : ALL_LIVE_JOBS

function matchesFilters(job: Job, filters: JobFilters) {
  if (filters.sector && job.sector !== filters.sector) return false
  if (filters.role && job.roleSlug !== filters.role) return false

  // The feed never labels the sub-discipline, so the listing's own words decide it.
  if (filters.specialism) {
    const specialism = CIVIL_SPECIALISMS.find((entry) => entry.slug === filters.specialism)
    if (specialism) {
      const haystack = [job.title, job.summary, job.department ?? '', ...job.tags]
        .join(' ')
        .toLowerCase()
      if (!specialism.keywords.some((keyword) => haystack.includes(keyword))) return false
    }
  }

  // Country first, then city: city slugs repeat across countries
  // (Cambridge is in both the UK and the US), so the pair disambiguates.
  if (filters.country && countrySlug(job.country) !== filters.country) return false
  if (filters.city && job.city !== filters.city) return false
  if (filters.state && job.state !== filters.state) return false
  if (filters.visa && !job.visaSponsorship) return false
  if (filters.fullTime && job.employmentType !== 'full-time') return false

  // Listings without an advertised salary cannot satisfy a salary filter.
  if (filters.salaryMin) {
    if (!job.salaryMax || job.salaryMax < filters.salaryMin) return false
  }

  if (filters.remote || filters.hybrid) {
    const allowed = [filters.remote && 'remote', filters.hybrid && 'hybrid'].filter(Boolean)
    if (!allowed.includes(job.workArrangement)) return false
  }

  if (filters.q) {
    const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean)
    const haystack = [
      job.title,
      job.organisation,
      job.department,
      job.location,
      job.summary,
      ...job.tags,
    ]
      .join(' ')
      .toLowerCase()
    if (!terms.every((term) => haystack.includes(term))) return false
  }

  return true
}

export async function getJobs(filters: JobFilters = {}): Promise<Job[]> {
  return JOBS.filter((job) => matchesFilters(job, filters))
}

export async function getJobBySlug(slug: string): Promise<Job | undefined> {
  // Academic positions live in a separate dataset, but their detail pages
  // are served by the same /jobs/[slug] route, so fall back to them here.
  return JOBS.find((job) => job.slug === slug) ?? (await getAcademicPositions()).find((job) => job.slug === slug)
}

export async function getFeaturedJobs(limit = 6): Promise<Job[]> {
  const featured = JOBS.filter((job) => job.featured)
  return (featured.length > 0 ? featured : JOBS).slice(0, limit)
}

export async function getLatestJobs(sector: Sector, limit = 4): Promise<Job[]> {
  return JOBS.filter((job) => job.sector === sector).slice(0, limit)
}

export async function getVisaSponsoredJobs(limit = 4): Promise<Job[]> {
  return JOBS.filter((job) => job.visaSponsorship).slice(0, limit)
}

export async function getRelatedJobs(job: Job, limit = 3): Promise<Job[]> {
  return JOBS.filter((other) => other.id !== job.id && other.sector === job.sector)
    .sort(
      (a, b) =>
        Number(b.roleSlug === job.roleSlug) - Number(a.roleSlug === job.roleSlug) || byNewest(a, b),
    )
    .slice(0, limit)
}

export async function getJobCounts() {
  const counts = {
    total: JOBS.length,
    academic: 0,
    visa: 0,
    byCity: {} as Record<string, number>,
    byRole: {} as Record<string, number>,
  }

  for (const job of JOBS) {
    counts[job.sector]++
    if (job.visaSponsorship) counts.visa++
    counts.byCity[job.city] = (counts.byCity[job.city] ?? 0) + 1
    counts.byRole[job.roleSlug] = (counts.byRole[job.roleSlug] ?? 0) + 1
  }

  return counts
}

export async function getAllJobSlugs(): Promise<
  { slug: string; postedAt: string; closingDate?: string }[]
> {
  const positions = await getAcademicPositions()
  return [...JOBS, ...positions].map(({ slug, postedAt, closingDate }) => ({ slug, postedAt, closingDate }))
}

/** Used to reject junk filter values instead of serving a soft-404. */
export function isKnownRole(slug?: string) {
  return !slug || ALL_ROLES.some((role) => role.slug === slug)
}

export function isKnownCountry(slug?: string) {
  return isKnownCountrySlug(slug)
}

export function isKnownCity(slug?: string) {
  return isKnownWorldCity(slug)
}

type RawSearchParams = Record<string, string | string[] | undefined>

export function parseFilters(params: RawSearchParams): JobFilters {
  const get = (key: string) => {
    const value = params[key]
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined
  }
  const sector = get('sector')
  const state = get('state')
  const salary = Number(get('salary'))
  const rawCountry = get('country')
  const country = isKnownCountrySlug(rawCountry) ? rawCountry : undefined
  const rawCity = get('city')
  // A city that does not belong to the chosen country is kept, so the pair
  // honestly matches nothing (0 jobs) instead of silently dropping the city
  // and showing the whole country's listings.
  const city = rawCity && getWorldCity(rawCity) ? rawCity : undefined
  const resolvedCountry = country ?? inferCountryForCity(rawCity)

  return {
    q: get('q')?.slice(0, 100),
    sector: sector === 'academic' ? sector : undefined,
    role: get('role'),
    country: resolvedCountry,
    city,
    state: STATES.some((s) => s.code === state) ? (state as StateCode) : undefined,
    salaryMin: Number.isFinite(salary) && salary > 0 ? salary : undefined,
    visa: get('visa') === '1',
    remote: get('remote') === '1',
    hybrid: get('hybrid') === '1',
    fullTime: get('fulltime') === '1',
    specialism: CIVIL_SPECIALISMS.some((entry) => entry.slug === get('specialism'))
      ? get('specialism')
      : undefined,
  }
}

/** True when a search-params object narrows the result set in any way. */
export function hasActiveFilters(filters: JobFilters) {
  return Object.values(filters).some((value) => Boolean(value))
}
