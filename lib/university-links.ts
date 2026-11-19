import { UNIVERSITIES_RAW } from '@/data/universities'
import { QS_DOMAINS_RAW } from '@/data/qs-domains'

/*
 * Every university name on the site links to that university's own official
 * website: the organisation line on job cards and job detail pages, and the
 * university headings on the Find a supervisor page.
 *
 * The address comes from the site's own university lists
 * (data/universities.ts, data/qs-domains.ts — official websites from
 * Wikidata), plus a small table of verified official domains for
 * universities the lists carry under a different name or not at all.
 * Nothing is guessed from an aggregator link: the apply-URL fallback only
 * fires for hosts that are plainly a university's own domain.
 */

const EXTRA_DOMAINS: Record<string, string> = {
  'california institute of technology': 'caltech.edu',
  'georgia institute of technology': 'gatech.edu',
  'kth royal institute of technology': 'kth.se',
  'leibniz universitat hannover': 'uni-hannover.de',
  'massachusetts institute of technology': 'mit.edu',
  "queen's university": 'queensu.ca',
  'queensland university of technology': 'qut.edu.au',
  'technische universitat berlin': 'tu-berlin.de',
  'universitat politecnica de catalunya': 'upc.edu',
  'university college london': 'ucl.ac.uk',
  'university of california berkeley': 'berkeley.edu',
  'university of illinois urbana champaign': 'illinois.edu',
  'university of michigan': 'umich.edu',
  'university of new south wales': 'unsw.edu.au',
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseRaw(raw: string, domainIndex: number): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of raw.split('\n')) {
    const parts = line.split('|').map((part) => part.trim())
    if (parts.length <= domainIndex || !parts[0] || !parts[domainIndex]) continue
    map.set(normalizeName(parts[0]), parts[domainIndex])
  }
  return map
}

const DOMAINS = new Map<string, string>([
  ...parseRaw(UNIVERSITIES_RAW, 2),
  ...parseRaw(QS_DOMAINS_RAW, 1),
  ...Object.entries(EXTRA_DOMAINS).map(
    ([name, domain]) => [normalizeName(name), domain] as [string, string],
  ),
])

// Hosts that belong to job boards, aggregators and recruitment systems —
// never a university's own site, so never used as a link target.
const NON_UNIVERSITY_HOSTS = [
  'jooble',
  'linkedin',
  'indeed',
  'careerjet',
  'glassdoor',
  'pageuppeople',
  'workday',
  'successfactors',
  'taleo',
  'varbi',
  'nga.net.au',
]

function universityHostFromApplyUrl(applyUrl: string): string | undefined {
  let host: string
  try {
    host = new URL(applyUrl).hostname.toLowerCase()
  } catch {
    return undefined
  }
  if (NON_UNIVERSITY_HOSTS.some((blocked) => host.includes(blocked))) return undefined
  // A university's own domain: .edu, .edu.au, .ac.uk and other academic
  // second-level domains. Anything else is not trusted as a homepage.
  if (/(^|\.)edu(\.[a-z]{2})?$/.test(host) || /(^|\.)ac\.[a-z]{2}$/.test(host)) return host
  return undefined
}

/**
 * Official homepage URL for a university name, or undefined when no
 * trustworthy address is known. The apply URL is only a fallback for
 * university-hosted posting pages; aggregator links never produce a URL.
 */
export function getUniversityUrl(
  organisation: string | undefined | null,
  applyUrl?: string,
): string | undefined {
  if (!organisation) return undefined
  const domain = DOMAINS.get(normalizeName(organisation))
  if (domain) return `https://${domain}`
  if (applyUrl) {
    const host = universityHostFromApplyUrl(applyUrl)
    if (host) return `https://${host}`
  }
  return undefined
}
