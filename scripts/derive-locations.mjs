/**
 * Derives the worldwide country/city picker lists from the actual job data
 * (data/jobs.json, data/academic-positions.json, data/phd-scholarships-direct.json).
 *
 * The city filter used to list Australian cities only, because the lists lived
 * in lib/taxonomy.ts as a hardcoded Australian snapshot. Run this after the
 * datasets change to regenerate lib/locations.ts:
 *
 *   node scripts/derive-locations.mjs
 *
 * City slugs can repeat across countries (Cambridge exists in both the United
 * Kingdom and the United States), so each entry carries its country slug and
 * the filter always pairs city + country.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILES = ['data/jobs.json', 'data/academic-positions.json', 'data/phd-scholarships-direct.json']

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// The countries Orod confirmed for the academic site, listed first.
const PINNED = ['Australia', 'United States', 'Canada', 'United Kingdom', 'Italy', 'Germany', 'Spain', 'Ireland']

const jobs = []
for (const file of FILES) {
  const data = JSON.parse(readFileSync(join(root, file), 'utf8'))
  jobs.push(...(Array.isArray(data) ? data : data.jobs))
}

const countries = new Map() // slug -> name
const cities = new Map() // `${countrySlug}::${citySlug}` -> { slug, name, country }
for (const job of jobs) {
  const countryName = (job.country || 'Australia').trim()
  const countrySlug = slugify(countryName)
  countries.set(countrySlug, countryName)
  const citySlug = (job.city || '').trim()
  if (!citySlug) continue
  const cityName = (job.location || citySlug).split(',')[0].trim() || citySlug
  const key = `${countrySlug}::${citySlug}`
  if (!cities.has(key)) cities.set(key, { slug: citySlug, name: cityName, country: countrySlug })
}

const orderedCountries = [
  ...PINNED.map((name) => [slugify(name), name]).filter(([slug]) => countries.has(slug)),
  ...[...countries.entries()].sort((a, b) => a[1].localeCompare(b[1])).filter(([slug]) => !PINNED.some((name) => slugify(name) === slug)),
]

const orderedCities = [...cities.values()].sort(
  (a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name),
)

const out = `// Generated from the live job datasets by scripts/derive-locations.mjs — do not edit by hand.
// Re-run \`node scripts/derive-locations.mjs\` after the datasets change.
// Covers ${orderedCountries.length} countries and ${orderedCities.length} cities found in the data.
export interface Country {
  slug: string
  name: string
}

export interface WorldCity {
  slug: string
  name: string
  /** Slug of the country this city belongs to (city slugs repeat across countries). */
  country: string
}

export const COUNTRIES: Country[] = [
${orderedCountries.map(([slug, name]) => `  { slug: '${slug}', name: '${name.replace(/'/g, "\\'")}' },`).join('\n')}
]

export const WORLD_CITIES: WorldCity[] = [
${orderedCities.map((c) => `  { slug: '${c.slug}', name: '${c.name.replace(/'/g, "\\'")}', country: '${c.country}' },`).join('\n')}
]
`

writeFileSync(join(root, 'lib', 'locations.ts'), out)
console.log(`Wrote lib/locations.ts: ${orderedCountries.length} countries, ${orderedCities.length} cities`)
