import { CITIES, STATES, type Sector, type StateCode } from './taxonomy'
import type { DigestFrequency } from './auth'
import type { JobFilters } from './types'

/*
 * A "list" is a saved search, not a bag of job ids: the board replaces every
 * listing each morning, so a list has to be defined by what the person is
 * looking for, otherwise it would empty itself overnight.
 *
 * This module is shared by the account API, the dashboard and the digest script,
 * so validation and the criteria → filter mapping live in exactly one place.
 */

export const MAX_LISTS = 10

export const DIGEST_FREQUENCIES: DigestFrequency[] = ['daily', 'weekly', 'monthly']

export const DIGEST_LABEL: Record<DigestFrequency, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
}

export interface ListCriteria {
  /** Space-separated; every term must appear somewhere in the ad. */
  keywords?: string
  sector?: Sector
  state?: StateCode
  /** City slug, e.g. `sydney`. */
  city?: string
  minSalary?: number
  visaOnly?: boolean
}

export interface SavedList {
  id: string
  name: string
  criteria: ListCriteria
  createdAt: string
}

export const listsKey = (userId: string) => `lists:${userId}`
export const unsubKey = (token: string) => `unsub:${token}`

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''
}

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] }

export function validateCredentials(input: unknown): Validation<{ email: string; password: string }> {
  const data = (input ?? {}) as Record<string, unknown>
  const email = text(data.email, 200).toLowerCase()
  const password = typeof data.password === 'string' ? data.password : ''
  const errors: string[] = []

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push('Enter a valid email address.')
  if (password.length < 8) errors.push('Use a password of at least 8 characters.')
  if (password.length > 200) errors.push('That password is too long.')

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: { email, password } }
}

export function validateList(
  input: unknown,
): Validation<{ name: string; criteria: ListCriteria }> {
  const data = (input ?? {}) as Record<string, unknown>
  const errors: string[] = []

  const name = text(data.name, 60)
  if (name.length < 2) errors.push('Give the list a name of at least 2 characters.')

  const keywords = text(data.keywords, 120)

  const sectorRaw = text(data.sector, 20)
  const sector = sectorRaw === 'academic' ? (sectorRaw as Sector) : undefined
  if (sectorRaw && !sector) errors.push('Choose academic, or leave it blank.')

  const stateRaw = text(data.state, 3).toUpperCase()
  const state = STATES.some((entry) => entry.code === stateRaw) ? (stateRaw as StateCode) : undefined
  if (stateRaw && !state) errors.push('Choose a valid state, or leave it blank.')

  const cityRaw = text(data.city, 40).toLowerCase()
  const city = CITIES.find((entry) => entry.slug === cityRaw)
  if (cityRaw && !city) errors.push('Choose a city from the list, or leave it blank.')

  if (city && state && city.state && city.state !== state) {
    errors.push(`${city.name} is in ${city.region}, not ${state}. Clear one of the two.`)
  }

  const salaryNumber = Number(data.minSalary)
  const minSalary =
    Number.isFinite(salaryNumber) && salaryNumber >= 20000 && salaryNumber <= 500000
      ? Math.round(salaryNumber / 1000) * 1000
      : undefined
  if (data.minSalary && !minSalary) errors.push('Minimum salary must be between $20,000 and $500,000.')

  const visaOnly = data.visaOnly === true || data.visaOnly === '1' || data.visaOnly === 'true'

  const criteria: ListCriteria = {
    ...(keywords ? { keywords } : {}),
    ...(sector ? { sector } : {}),
    ...(state ? { state } : {}),
    ...(city ? { city: city!.slug } : {}),
    ...(minSalary ? { minSalary } : {}),
    ...(visaOnly ? { visaOnly } : {}),
  }

  // A list with no filters would email everything, every day.
  if (Object.keys(criteria).length === 0) {
    errors.push('Add at least one filter — keywords, academic, location, salary or visa.')
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: { name, criteria } }
}

export function validateDigest(
  input: unknown,
): Validation<{ enabled: boolean; frequency: DigestFrequency }> {
  const data = (input ?? {}) as Record<string, unknown>
  const frequency = text(data.frequency, 20) as DigestFrequency

  if (!DIGEST_FREQUENCIES.includes(frequency)) {
    return { ok: false, errors: ['Choose daily, weekly or monthly.'] }
  }

  return { ok: true, value: { enabled: data.enabled === true, frequency } }
}

/** Same fields the board's own filter bar uses, so a saved list behaves identically. */
export function criteriaToFilters(criteria: ListCriteria): JobFilters {
  return {
    q: criteria.keywords,
    sector: criteria.sector,
    state: criteria.state,
    city: criteria.city,
    salaryMin: criteria.minSalary,
    visa: criteria.visaOnly,
  }
}

export function describeCriteria(criteria: ListCriteria): string {
  const parts: string[] = []

  if (criteria.sector) parts.push('Academic')
  if (criteria.keywords) parts.push(`“${criteria.keywords}”`)
  if (criteria.city) parts.push(CITIES.find((city) => city.slug === criteria.city)?.name ?? criteria.city)
  if (criteria.state) parts.push(criteria.state)
  if (criteria.minSalary) parts.push(`$${Math.round(criteria.minSalary / 1000)}k+`)
  if (criteria.visaOnly) parts.push('Visa sponsorship')

  return parts.join(' · ')
}

/** Human-readable search URL, so "view matches" goes back to the real board. */
export function criteriaToHref(criteria: ListCriteria): string {
  const params = new URLSearchParams()
  if (criteria.keywords) params.set('q', criteria.keywords)
  if (criteria.sector) params.set('sector', criteria.sector)
  if (criteria.state) params.set('state', criteria.state)
  if (criteria.city) params.set('city', criteria.city)
  if (criteria.minSalary) params.set('salary', String(criteria.minSalary))
  if (criteria.visaOnly) params.set('visa', '1')

  const query = params.toString()
  return query ? `/jobs?${query}` : '/jobs'
}
