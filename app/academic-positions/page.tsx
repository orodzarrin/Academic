import type { Metadata } from 'next'
import { JobCard } from '@/components/jobs/job-card'
import { PageHeader } from '@/components/page-header'
import { getAcademicPositions } from '@/lib/academic-positions'
import { formatDate } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Academic Positions in Structural Engineering Australia',
  description:
    'University positions from postdoc to professor — lecturers, research fellows and heads of school at Australian universities.',
  alternates: { canonical: '/academic-positions' },
}

/**
 * Academic Position is its own separate section on this site — not part of the
 * PhD Scholarship listings. The cards link out to the original posting
 * (Jooble / the university careers page) because these roles have no detail
 * page on this site; the PhD listings in data/jobs.json are untouched.
 */
export default async function AcademicPositionsPage() {
  const positions = await getAcademicPositions()
  // The cards follow the site's standard design (posted date, no closing date),
  // so the shared deadline is stated once here instead of on every card.
  const closingDates = [...new Set(positions.map((job) => job.closingDate).filter(Boolean))]
  const sharedClosingDate = closingDates.length === 1 ? closingDates[0] : undefined

  return (
    <>
      <PageHeader
        eyebrow="Academic Position"
        title="Academic positions"
        description="University positions from postdoc to professor — lecturers, research fellows and heads of school at Australian universities. Teaching and research roles, no industry jobs."
        breadcrumbs={[{ label: 'Academic Position', href: '/academic-positions' }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
        {sharedClosingDate && (
          <p className="mb-8 text-sm text-muted-foreground">
            Applications close <time dateTime={sharedClosingDate}>{formatDate(sharedClosingDate)}</time>.
          </p>
        )}
        {positions.length === 0 ? (
          <p className="text-muted-foreground">
            No academic positions are open right now. Check back soon — new university roles are added as they are advertised.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {positions.map((job) => (
              <li key={job.id}>
                <JobCard job={job} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
