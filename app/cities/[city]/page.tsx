import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JobsListing } from '@/components/jobs/jobs-listing'
import { PageHeader } from '@/components/page-header'
import { parseFilters } from '@/lib/jobs'
import { CITIES, getCity } from '@/lib/taxonomy'

type Params = Promise<{ city: string }>
type SearchParams = Promise<Record<string, string | string[] | undefined>>

export function generateStaticParams() {
  return CITIES.map((city) => ({ city: city.slug }))
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}): Promise<Metadata> {
  const city = getCity((await params).city)
  if (!city) return {}

  const filters = parseFilters(await searchParams)
  const narrowed = Boolean(
    filters.q || filters.role || filters.state || filters.salaryMin || filters.visa || filters.remote || filters.hybrid || filters.fullTime,
  )

  return {
    title: `PhD Scholarships in ${city.name}, ${city.region}`,
    description: `PhD scholarships in structural engineering in ${city.name}. ${city.description}`,
    alternates: { canonical: `/cities/${city.slug}` },
    robots: narrowed ? { index: false, follow: true } : { index: true, follow: true },
  }
}

export default async function CityPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const city = getCity((await params).city)
  if (!city) notFound()

  const filters = parseFilters(await searchParams)

  return (
    <>
      <PageHeader
        eyebrow={`${city.name}, ${city.region}`}
        title={`PhD scholarships in ${city.name}`}
        description={city.description}
        breadcrumbs={[
          { label: 'Cities', href: '/cities' },
          { label: city.name, href: `/cities/${city.slug}` },
        ]}
      />
      <JobsListing action={`/cities/${city.slug}`} filters={{ ...filters, city: city.slug, state: undefined }} lockCity />
    </>
  )
}
