import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JobsListing } from '@/components/jobs/jobs-listing'
import { PageHeader } from '@/components/page-header'
import { hasActiveFilters, isKnownCity, isKnownCountry, isKnownRole, parseFilters } from '@/lib/jobs'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams
}): Promise<Metadata> {
  const filters = parseFilters(await searchParams)

  return {
    title: 'Search PhD Scholarships in Australia',
    description:
      'Search every PhD scholarship in structural engineering. Filter by city, state, salary, visa sponsorship, remote, hybrid and full-time roles.',
    alternates: { canonical: '/jobs' },
    // Filtered permutations are duplicates of /jobs: crawlable, never indexed.
    robots: hasActiveFilters(filters)
      ? { index: false, follow: true }
      : { index: true, follow: true },
  }
}

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams)

  if (!isKnownRole(filters.role) || !isKnownCountry(filters.country) || !isKnownCity(filters.city)) notFound()

  return (
    <>
      <PageHeader
        eyebrow="All jobs"
        title="Search PhD scholarships"
        description="PhD scholarships across Australia and beyond. Refine by city, state, salary, visa sponsorship and work arrangement."
        breadcrumbs={[{ label: 'All jobs', href: '/jobs' }]}
      />
      <JobsListing action="/jobs" filters={filters} />
    </>
  )
}
