import type { Job } from '../types'
import { getCity, getRole } from '../taxonomy'

type Seed = Omit<
  Job,
  'id' | 'slug' | 'state' | 'location' | 'description' | 'responsibilities' | 'requirements' | 'applyUrl'
> &
  Partial<Pick<Job, 'responsibilities' | 'requirements'>> & { suburb?: string }

const ACADEMIC_RESPONSIBILITIES = [
  'Deliver high-quality undergraduate and postgraduate teaching in structural engineering',
  'Lead and grow an externally funded research program (ARC, industry partnerships)',
  'Supervise honours, masters and PhD research students',
  'Contribute to school service, accreditation and Engineers Australia requirements',
]

const ACADEMIC_REQUIREMENTS = [
  'PhD in structural or civil engineering, or a closely related discipline',
  'Track record of publications in leading structural engineering journals',
  'Demonstrated ability to teach core structural mechanics and design subjects',
  'Eligibility for chartered status with Engineers Australia is desirable',
]

const RESEARCH_RESPONSIBILITIES = [
  'Conduct experimental, numerical or analytical research within the project team',
  'Publish findings in high-impact journals and present at international conferences',
  'Collaborate with industry partners and assist with laboratory testing programs',
  'Support supervision of research students',
]

const SCHOLARSHIP_REQUIREMENTS = [
  'First-class honours or equivalent in civil or structural engineering',
  'Strong background in structural mechanics, materials or computational modelling',
  'Excellent written and verbal communication skills',
  'Domestic and international applicants are encouraged to apply',
]

const seeds: Seed[] = [
  {
    title: 'PhD Scholarship – Offshore & Marine Structures',
    roleSlug: 'phd-scholarship',
    sector: 'academic',
    organisation: 'University of Western Australia',
    department: 'Oceans Graduate School',
    city: 'perth',
    salaryMin: 37000,
    salaryMax: 42000,
    salaryPeriod: 'scholarship',
    employmentType: 'scholarship',
    workArrangement: 'onsite',
    visaSponsorship: false,
    featured: false,
    postedAt: '2026-10-23',
    closingDate: '2026-12-15',
    summary:
      'Fully funded PhD investigating fatigue behaviour of offshore wind foundations, with tuition fee offset.',
    responsibilities: RESEARCH_RESPONSIBILITIES,
    requirements: SCHOLARSHIP_REQUIREMENTS,
    tags: ['Offshore Wind', 'Fatigue', 'Tuition Covered'],
  },
  {
    title: 'PhD Scholarship – Low-Carbon Concrete',
    roleSlug: 'phd-scholarship',
    sector: 'academic',
    organisation: 'University of Adelaide',
    department: 'School of Architecture & Civil Engineering',
    city: 'adelaide',
    salaryMin: 36000,
    salaryMax: 40000,
    salaryPeriod: 'scholarship',
    employmentType: 'scholarship',
    workArrangement: 'onsite',
    visaSponsorship: false,
    featured: false,
    postedAt: '2026-10-19',
    closingDate: '2026-11-30',
    summary:
      'Research geopolymer and blended-cement concretes for structural applications with industry co-supervision.',
    responsibilities: RESEARCH_RESPONSIBILITIES,
    requirements: SCHOLARSHIP_REQUIREMENTS,
    tags: ['Materials', 'Sustainability', 'Industry Top-up'],
  },
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const SAMPLE_JOBS: Job[] = seeds.map((seed, index) => {
  const city = getCity(seed.city)!
  const role = getRole(seed.roleSlug)!
  const { suburb, ...rest } = seed

  return {
    ...rest,
    id: String(index + 1),
    slug: `${slugify(seed.title)}-${slugify(seed.organisation)}-${index + 1}`,
    state: city.state ?? undefined,
    location: `${suburb ?? city.name}, ${city.region}`,
    description: `${seed.organisation} is seeking an outstanding ${role.name.replace(/s$/, '')} to join ${
      seed.department ?? 'its structural engineering team'
    } in ${city.name}. ${seed.summary} This is an excellent opportunity to advance your career within Australia’s structural engineering ${
      'research community'
    }.`,
    responsibilities:
      seed.responsibilities ?? RESEARCH_RESPONSIBILITIES,
    requirements: seed.requirements ?? SCHOLARSHIP_REQUIREMENTS,
    applyUrl: '#apply',
  }
})
