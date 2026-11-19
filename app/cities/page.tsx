import type { Metadata } from 'next'
import { CityGrid } from '@/components/home/city-grid'
import { PageHeader } from '@/components/page-header'
import { getJobCounts } from '@/lib/jobs'

export const metadata: Metadata = {
  title: 'Structural Engineering Jobs by City',
  description:
    'Browse PhD scholarships in structural engineering by city, in Australia and around the world.',
  alternates: { canonical: '/cities' },
}

export default async function CitiesPage() {
  const counts = await getJobCounts()
  return (
    <>
      <PageHeader
        eyebrow="Browse by city"
        title="Structural engineering jobs by city"
        description="Explore PhD scholarships in Australia's major engineering hubs and at universities worldwide."
        breadcrumbs={[{ label: 'Cities', href: '/cities' }]}
      />
      <CityGrid counts={counts.byCity} />
    </>
  )
}
