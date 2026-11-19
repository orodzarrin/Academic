// Generated from the live job datasets by scripts/derive-locations.mjs — do not edit by hand.
// Re-run `node scripts/derive-locations.mjs` after the datasets change.
// Covers 11 countries and 48 cities found in the data.
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
  { slug: 'australia', name: 'Australia' },
  { slug: 'united-states', name: 'United States' },
  { slug: 'canada', name: 'Canada' },
  { slug: 'united-kingdom', name: 'United Kingdom' },
  { slug: 'italy', name: 'Italy' },
  { slug: 'germany', name: 'Germany' },
  { slug: 'spain', name: 'Spain' },
  { slug: 'ireland', name: 'Ireland' },
  { slug: 'belgium', name: 'Belgium' },
  { slug: 'sweden', name: 'Sweden' },
  { slug: 'switzerland', name: 'Switzerland' },
]

export const WORLD_CITIES: WorldCity[] = [
  { slug: 'adelaide', name: 'Adelaide', country: 'australia' },
  { slug: 'brisbane', name: 'Brisbane', country: 'australia' },
  { slug: 'melbourne', name: 'Melbourne', country: 'australia' },
  { slug: 'perth', name: 'Perth', country: 'australia' },
  { slug: 'sydney', name: 'Sydney', country: 'australia' },
  { slug: 'ghent', name: 'Ghent', country: 'belgium' },
  { slug: 'edmonton', name: 'Edmonton', country: 'canada' },
  { slug: 'halifax', name: 'Halifax', country: 'canada' },
  { slug: 'kingston', name: 'Kingston', country: 'canada' },
  { slug: 'montreal', name: 'Montreal', country: 'canada' },
  { slug: 'toronto', name: 'Toronto', country: 'canada' },
  { slug: 'vancouver', name: 'Vancouver', country: 'canada' },
  { slug: 'waterloo', name: 'Waterloo', country: 'canada' },
  { slug: 'aachen', name: 'Aachen', country: 'germany' },
  { slug: 'berlin', name: 'Berlin', country: 'germany' },
  { slug: 'hannover', name: 'Hannover', country: 'germany' },
  { slug: 'cork', name: 'Cork', country: 'ireland' },
  { slug: 'dublin', name: 'Dublin', country: 'ireland' },
  { slug: 'galway', name: 'Galway', country: 'ireland' },
  { slug: 'milan', name: 'Milan', country: 'italy' },
  { slug: 'barcelona', name: 'Barcelona', country: 'spain' },
  { slug: 'stockholm', name: 'Stockholm', country: 'sweden' },
  { slug: 'zurich', name: 'Zurich', country: 'switzerland' },
  { slug: 'cambridge', name: 'Cambridge', country: 'united-kingdom' },
  { slug: 'glasgow', name: 'Glasgow', country: 'united-kingdom' },
  { slug: 'leeds', name: 'Leeds', country: 'united-kingdom' },
  { slug: 'london', name: 'London', country: 'united-kingdom' },
  { slug: 'manchester', name: 'Manchester', country: 'united-kingdom' },
  { slug: 'nottingham', name: 'Nottingham', country: 'united-kingdom' },
  { slug: 'oxford', name: 'Oxford', country: 'united-kingdom' },
  { slug: 'sheffield', name: 'Sheffield', country: 'united-kingdom' },
  { slug: 'southampton', name: 'Southampton', country: 'united-kingdom' },
  { slug: 'ann-arbor', name: 'Ann Arbor', country: 'united-states' },
  { slug: 'atlanta', name: 'Atlanta', country: 'united-states' },
  { slug: 'austin', name: 'Austin', country: 'united-states' },
  { slug: 'berkeley', name: 'Berkeley', country: 'united-states' },
  { slug: 'blacksburg', name: 'Blacksburg', country: 'united-states' },
  { slug: 'cambridge', name: 'Cambridge', country: 'united-states' },
  { slug: 'college-station', name: 'College Station', country: 'united-states' },
  { slug: 'ithaca', name: 'Ithaca', country: 'united-states' },
  { slug: 'los-angeles', name: 'Los Angeles', country: 'united-states' },
  { slug: 'new-york', name: 'New York', country: 'united-states' },
  { slug: 'pasadena', name: 'Pasadena', country: 'united-states' },
  { slug: 'pittsburgh', name: 'Pittsburgh', country: 'united-states' },
  { slug: 'princeton', name: 'Princeton', country: 'united-states' },
  { slug: 'stanford', name: 'Stanford', country: 'united-states' },
  { slug: 'urbana-champaign', name: 'Urbana-Champaign', country: 'united-states' },
  { slug: 'west-lafayette', name: 'West Lafayette', country: 'united-states' },
]
