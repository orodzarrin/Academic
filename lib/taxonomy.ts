import { COUNTRIES, WORLD_CITIES } from './locations'

export type Sector = 'academic'
export type StateCode = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT'
export type WorkArrangement = 'onsite' | 'hybrid' | 'remote'
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'scholarship'

export interface Role {
  slug: string
  name: string
  sector: Sector
}

export const ACADEMIC_ROLES: Role[] = [
  { slug: 'phd-scholarship', name: 'PhD Scholarships', sector: 'academic' },
]

export const ALL_ROLES = [...ACADEMIC_ROLES]

export interface City {
  slug: string
  name: string
  // Australian state code for Australian cities, null elsewhere.
  state: StateCode | null
  // Display region after the city name: the state code (Sydney, NSW) or the
  // country / province (Dublin, Ireland; Toronto, ON).
  region: string
  description: string
}

export const CITIES: City[] = [
  {
    slug: 'sydney',
    name: 'Sydney',
    state: 'NSW',
    region: 'NSW',
    description:
      'Australia’s largest engineering market, with major transport, high-rise and infrastructure programs alongside leading research universities.',
  },
  {
    slug: 'newcastle',
    name: 'Newcastle',
    state: 'NSW',
    region: 'NSW',
    description:
      'A growing hub for structural research, port and energy infrastructure, and regional consulting work in the Hunter.',
  },
  {
    slug: 'melbourne',
    name: 'Melbourne',
    state: 'VIC',
    region: 'VIC',
    description:
      'Home to large rail, tunnel and building projects plus world-class structural engineering research groups.',
  },
  {
    slug: 'brisbane',
    name: 'Brisbane',
    state: 'QLD',
    region: 'QLD',
    description:
      'Rapid growth in transport, bridges and venue infrastructure ahead of the 2032 Olympic and Paralympic Games.',
  },
  {
    slug: 'perth',
    name: 'Perth',
    state: 'WA',
    region: 'WA',
    description:
      'Strong demand from resources, marine and heavy industrial structures, with active university research in offshore engineering.',
  },
  {
    slug: 'adelaide',
    name: 'Adelaide',
    state: 'SA',
    region: 'SA',
    description:
      'Defence, health and road infrastructure investment driving steady demand for structural and civil engineers.',
  },

  // Cities below are derived from the listings themselves
  // (data/jobs.json, data/phd-scholarships-direct.json,
  // data/academic-positions.json) — regenerate with
  // `node scripts/derive-cities.mjs` after the listings change, so every
  // city with a live role appears in Browse by City and the search filters.
  { slug: 'aachen', name: 'Aachen', state: null, region: 'Germany', description: 'Academic positions and PhD scholarships in Aachen, Germany.' },
  { slug: 'ann-arbor', name: 'Ann Arbor', state: null, region: 'MI', description: 'Academic positions and PhD scholarships in Ann Arbor, MI.' },
  { slug: 'atlanta', name: 'Atlanta', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in Atlanta, United States.' },
  { slug: 'austin', name: 'Austin', state: null, region: 'TX', description: 'Academic positions and PhD scholarships in Austin, TX.' },
  { slug: 'barcelona', name: 'Barcelona', state: null, region: 'Spain', description: 'Academic positions and PhD scholarships in Barcelona, Spain.' },
  { slug: 'berkeley', name: 'Berkeley', state: null, region: 'CA', description: 'Academic positions and PhD scholarships in Berkeley, CA.' },
  { slug: 'berlin', name: 'Berlin', state: null, region: 'Germany', description: 'Academic positions and PhD scholarships in Berlin, Germany.' },
  { slug: 'blacksburg', name: 'Blacksburg', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in Blacksburg, United States.' },
  { slug: 'cambridge', name: 'Cambridge', state: null, region: 'United Kingdom', description: 'Academic positions and PhD scholarships in Cambridge, United Kingdom.' },
  { slug: 'college-station', name: 'College Station', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in College Station, United States.' },
  { slug: 'cork', name: 'Cork', state: null, region: 'Ireland', description: 'Academic positions and PhD scholarships in Cork, Ireland.' },
  { slug: 'dublin', name: 'Dublin', state: null, region: 'Ireland', description: 'Academic positions and PhD scholarships in Dublin, Ireland.' },
  { slug: 'edmonton', name: 'Edmonton', state: null, region: 'AB', description: 'Academic positions and PhD scholarships in Edmonton, AB.' },
  { slug: 'galway', name: 'Galway', state: null, region: 'Ireland', description: 'Academic positions and PhD scholarships in Galway, Ireland.' },
  { slug: 'ghent', name: 'Ghent', state: null, region: 'Belgium', description: 'Academic positions and PhD scholarships in Ghent, Belgium.' },
  { slug: 'glasgow', name: 'Glasgow', state: null, region: 'United Kingdom', description: 'Academic positions and PhD scholarships in Glasgow, United Kingdom.' },
  { slug: 'halifax', name: 'Halifax', state: null, region: 'Canada', description: 'Academic positions and PhD scholarships in Halifax, Canada.' },
  { slug: 'hannover', name: 'Hannover', state: null, region: 'Germany', description: 'Academic positions and PhD scholarships in Hannover, Germany.' },
  { slug: 'ithaca', name: 'Ithaca', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in Ithaca, United States.' },
  { slug: 'kingston', name: 'Kingston', state: null, region: 'Canada', description: 'Academic positions and PhD scholarships in Kingston, Canada.' },
  { slug: 'leeds', name: 'Leeds', state: null, region: 'United Kingdom', description: 'Academic positions and PhD scholarships in Leeds, United Kingdom.' },
  { slug: 'london', name: 'London', state: null, region: 'United Kingdom', description: 'Academic positions and PhD scholarships in London, United Kingdom.' },
  { slug: 'los-angeles', name: 'Los Angeles', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in Los Angeles, United States.' },
  { slug: 'manchester', name: 'Manchester', state: null, region: 'United Kingdom', description: 'Academic positions and PhD scholarships in Manchester, United Kingdom.' },
  { slug: 'milan', name: 'Milan', state: null, region: 'Italy', description: 'Academic positions and PhD scholarships in Milan, Italy.' },
  { slug: 'montreal', name: 'Montreal', state: null, region: 'QC', description: 'Academic positions and PhD scholarships in Montreal, QC.' },
  { slug: 'new-york', name: 'New York', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in New York, United States.' },
  { slug: 'nottingham', name: 'Nottingham', state: null, region: 'United Kingdom', description: 'Academic positions and PhD scholarships in Nottingham, United Kingdom.' },
  { slug: 'oxford', name: 'Oxford', state: null, region: 'United Kingdom', description: 'Academic positions and PhD scholarships in Oxford, United Kingdom.' },
  { slug: 'pasadena', name: 'Pasadena', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in Pasadena, United States.' },
  { slug: 'pittsburgh', name: 'Pittsburgh', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in Pittsburgh, United States.' },
  { slug: 'princeton', name: 'Princeton', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in Princeton, United States.' },
  { slug: 'sheffield', name: 'Sheffield', state: null, region: 'United Kingdom', description: 'Academic positions and PhD scholarships in Sheffield, United Kingdom.' },
  { slug: 'southampton', name: 'Southampton', state: null, region: 'United Kingdom', description: 'Academic positions and PhD scholarships in Southampton, United Kingdom.' },
  { slug: 'stanford', name: 'Stanford', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in Stanford, United States.' },
  { slug: 'stockholm', name: 'Stockholm', state: null, region: 'Sweden', description: 'Academic positions and PhD scholarships in Stockholm, Sweden.' },
  { slug: 'toronto', name: 'Toronto', state: null, region: 'ON', description: 'Academic positions and PhD scholarships in Toronto, ON.' },
  { slug: 'urbana-champaign', name: 'Urbana-Champaign', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in Urbana-Champaign, United States.' },
  { slug: 'vancouver', name: 'Vancouver', state: null, region: 'BC', description: 'Academic positions and PhD scholarships in Vancouver, BC.' },
  { slug: 'waterloo', name: 'Waterloo', state: null, region: 'ON', description: 'Academic positions and PhD scholarships in Waterloo, ON.' },
  { slug: 'west-lafayette', name: 'West Lafayette', state: null, region: 'United States', description: 'Academic positions and PhD scholarships in West Lafayette, United States.' },
  { slug: 'zurich', name: 'Zurich', state: null, region: 'Switzerland', description: 'Academic positions and PhD scholarships in Zurich, Switzerland.' },
]

export const STATES: { code: StateCode; name: string }[] = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' },
]

export const SALARY_OPTIONS = [
  { value: 40000, label: '$40k+' },
  { value: 80000, label: '$80k+' },
  { value: 100000, label: '$100k+' },
  { value: 120000, label: '$120k+' },
  { value: 150000, label: '$150k+' },
  { value: 180000, label: '$180k+' },
]

export function getRole(slug: string) {
  return ALL_ROLES.find((role) => role.slug === slug)
}

export function getCity(slug: string) {
  return CITIES.find((city) => city.slug === slug)
}

// Worldwide locations, derived from the live job datasets (see
// scripts/derive-locations.mjs). The old CITIES list above is Australian
// only and must not be used for the job filters.
export { COUNTRIES, WORLD_CITIES } from './locations'
export type { Country, WorldCity } from './locations'

/** Slug for a job's country name; legacy records without a country are Australian. */
export function countrySlug(country?: string) {
  const slug = (country || 'Australia')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'australia'
}

export function getCountry(slug?: string) {
  return COUNTRIES.find((country) => country.slug === slug)
}

export function isKnownCountry(slug?: string) {
  return !slug || COUNTRIES.some((country) => country.slug === slug)
}

/** Cities in one country, alphabetically. Without a country, every city. */
export function getWorldCities(countrySlug?: string) {
  const cities = countrySlug
    ? WORLD_CITIES.filter((city) => city.country === countrySlug)
    : WORLD_CITIES
  return [...cities].sort((a, b) => a.name.localeCompare(b.name))
}

/** A city slug can repeat across countries (Cambridge: UK and US), so the country disambiguates. */
export function getWorldCity(slug: string, countrySlug?: string) {
  const matches = WORLD_CITIES.filter((city) => city.slug === slug)
  if (countrySlug) return matches.find((city) => city.country === countrySlug)
  return matches[0]
}

/** The country for a city slug, when it belongs to exactly one country. */
export function inferCountryForCity(slug?: string) {
  if (!slug) return undefined
  const countries = [...new Set(WORLD_CITIES.filter((city) => city.slug === slug).map((city) => city.country))]
  return countries.length === 1 ? countries[0] : undefined
}

export function isKnownWorldCity(slug?: string, countrySlug?: string) {
  if (!slug) return true
  return WORLD_CITIES.some((city) => city.slug === slug && (!countrySlug || city.country === countrySlug))
}

/**
 * The civil/structural sub-disciplines a listing is filed under.
 *
 * Feeds rarely label the discipline, so a listing is matched on its own words:
 * title, summary, department and tags. "Bridge" sits only under structural,
 * otherwise a bridge engineer would appear in transport as well and the counts
 * would double.
 */
export interface Specialism {
  slug: string
  name: string
  keywords: string[]
}

export const CIVIL_SPECIALISMS: Specialism[] = [
  {
    slug: 'structural',
    name: 'Structural & bridges',
    keywords: ['structural', 'bridge', 'steel', 'concrete', 'timber', 'seismic', 'earthquake'],
  },
  {
    slug: 'geotechnical',
    name: 'Geotechnical & tunnelling',
    keywords: ['geotechnical', 'geotech', 'foundation', 'soil', 'piling', 'tunnel'],
  },
  {
    slug: 'water',
    name: 'Water & drainage',
    keywords: ['water', 'hydraulic', 'hydrology', 'drainage', 'wastewater', 'stormwater', 'flood'],
  },
  {
    slug: 'transport',
    name: 'Transport & roads',
    keywords: ['transport', 'traffic', 'road', 'highway', 'rail', 'pavement'],
  },
  {
    slug: 'construction',
    name: 'Construction & project management',
    keywords: ['construction', 'site engineer', 'project manager', 'contracts', 'planning'],
  },
  {
    slug: 'environmental',
    name: 'Environmental & sustainability',
    keywords: ['environmental', 'sustainability', 'climate', 'carbon'],
  },
  {
    slug: 'materials',
    name: 'Materials & durability',
    keywords: ['materials', 'durability', 'corrosion', 'asphalt'],
  },
  {
    slug: 'surveying',
    name: 'Surveying & geospatial',
    keywords: ['survey', 'geospatial', 'gis', 'lidar'],
  },
]

export function getSpecialism(slug: string) {
  return CIVIL_SPECIALISMS.find((specialism) => specialism.slug === slug)
}
