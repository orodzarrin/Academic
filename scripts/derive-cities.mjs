// Regenerates the data-derived half of CITIES in lib/taxonomy.ts.
//
// The six Australian cities in taxonomy.ts are curated (descriptions kept).
// Every other city on the site comes from the listings themselves, so the
// Browse by City list and the search dropdowns never go stale while the
// listings go worldwide. Run this after the listings change and paste the
// printed block into lib/taxonomy.ts, replacing the derived entries:
//
//   node scripts/derive-cities.mjs
//
// Region for a slug is the location suffix seen most often for that slug
// (ties broken alphabetically); a slug maps to one filter value, so all
// jobs in that city match whichever region is shown.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const AU = new Set(['sydney', 'newcastle', 'melbourne', 'brisbane', 'perth', 'adelaide'])

function load(file) {
  return JSON.parse(readFileSync(join(root, file), 'utf8')).jobs
}

const jobs = [
  ...load('data/jobs.json'),
  ...load('data/phd-scholarships-direct.json'),
  ...load('data/academic-positions.json'),
]

const names = new Map()
const regions = new Map()
for (const job of jobs) {
  const slug = job.city
  if (!slug || AU.has(slug)) continue
  const [name, ...rest] = String(job.location ?? '').split(',')
  names.set(slug, name.trim())
  const region = rest.join(',').trim() || job.country || ''
  if (!regions.has(slug)) regions.set(slug, new Map())
  const counts = regions.get(slug)
  counts.set(region, (counts.get(region) ?? 0) + 1)
}

const entries = [...regions.keys()]
  .sort((a, b) => names.get(a).localeCompare(names.get(b)))
  .map((slug) => {
    const region = [...regions.get(slug).entries()].sort(
      ([r1, c1], [r2, c2]) => c2 - c1 || r1.localeCompare(r2),
    )[0][0]
    const name = names.get(slug)
    return `  { slug: '${slug}', name: '${name}', state: null, region: '${region}', description: 'Academic positions and PhD scholarships in ${name}, ${region}.' },`
  })

console.log(entries.join('\n'))
console.log(`// ${entries.length} derived cities`)
