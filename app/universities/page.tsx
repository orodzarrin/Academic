import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { CountryGlobe } from '@/components/universities/country-globe'
import {
  QS_2027,
  QS_CHECK_OK,
  QS_EDITION,
  QS_LAST_CHECKED,
  QS_UPDATE_AVAILABLE,
  UNIVERSITIES,
  UNIVERSITIES_BY_COUNTRY,
  UNIVERSITIES_WITH_SITE,
  UNIVERSITIES_WITH_STAFF,
  universityLink,
  universitySlug,
} from '@/lib/universities'

export const metadata: Metadata = {
  title: 'Universities worldwide — QS 2027 top 500',
  description:
    'The QS World University Rankings 2027 top 500, in rank order 1–500. Every row shows the QS rank, university name, country and official site. Supervisor records, research areas and published emails are added a university at a time.',
  alternates: { canonical: '/universities' },
}

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>
}) {
  const params = await searchParams
  const countryFilter = typeof params.country === 'string' ? params.country : undefined
  const activeCountry = UNIVERSITIES_BY_COUNTRY.find(
    (entry) => universitySlug(entry.country) === countryFilter,
  )
  const shown = activeCountry ? activeCountry.universities : UNIVERSITIES

  return (
    <div className="relative overflow-clip">
      <PageHeader
        eyebrow="Universities"
        title="Universities worldwide"
        description="The QS 2027 top 500 in rank order, 1 to 500. Every row shows the QS rank, university name, country and official site link."
        breadcrumbs={[
          { label: 'Academic jobs', href: '/academic' },
          { label: 'Supervisors', href: '/supervisors' },
          { label: 'Universities', href: '/universities' },
        ]}
        background={<CountryGlobe countryName={activeCountry?.country ?? null} />}
      >
        <p className="mt-8 max-w-2xl text-sm text-white/70">
          QS {QS_EDITION} rank for the first {QS_2027.length} · {UNIVERSITIES.length} institutions in{' '}
          {UNIVERSITIES_BY_COUNTRY.length} countries · {UNIVERSITIES_WITH_SITE} with an official
          website · {UNIVERSITIES_WITH_STAFF} with transcribed supervisors. Ranks are from the QS{' '}
          {QS_EDITION} edition; last checked for a newer edition on {QS_LAST_CHECKED}
          {QS_CHECK_OK ? '' : ' (the QS site could not be reached at the last check)' }.
        </p>
      </PageHeader>

      {QS_UPDATE_AVAILABLE ? (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            QS has published a newer edition than {QS_EDITION}. These ranks are from the QS{' '}
            {QS_EDITION} edition and are being updated to the new table.
          </p>
        </div>
      ) : null}

      <section className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4">
          <p className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Filter by country
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            <li>
              <Link
                href="/universities"
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:text-foreground ${!activeCountry ? 'border-primary/60 font-medium text-foreground' : 'text-muted-foreground'}`}
              >
                All countries
                <span className="font-mono text-[10px]">{UNIVERSITIES.length}</span>
              </Link>
            </li>
            {UNIVERSITIES_BY_COUNTRY.map((entry) => (
              <li key={entry.country}>
                <Link
                  href={`/universities?country=${universitySlug(entry.country)}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:text-foreground ${activeCountry?.country === entry.country ? 'border-primary/60 font-medium text-foreground' : 'text-muted-foreground'}`}
                >
                  {entry.country}
                  <span className="font-mono text-[10px]">{entry.universities.length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          The list below is the QS World University Rankings 2027 top 500, sorted in rank order from
          1 to 500; ties share a rank. Every row carries the QS rank, the university name, its
          country, and a link to its official site. Only the top 500 are listed — no university
          below the top 500, and no university from a country without a top-500 university. What a
          ranking can never supply is a person: names, research areas and emails are only ever added
          from a university&rsquo;s own staff pages, so most rows show no supervisors yet — the honest
          state of the directory rather than a missing feature. Ready to write to someone?{' '}
          <Link href="/supervisors" className="text-primary hover:underline">
            Find a supervisor
          </Link>
          .
        </p>

        {activeCountry ? (
          <p className="mt-6 text-sm">
            Showing {shown.length} universities in {activeCountry.country}.{' '}
            <Link href="/universities" className="text-primary hover:underline">
              Show all 500
            </Link>
          </p>
        ) : null}

        <ol className="mt-4 divide-y rounded-xl border bg-card">
          {shown.map((university) => (
            <li
              key={`${university.rank}-${university.name}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
            >
              <span
                className="w-12 shrink-0 font-mono text-xs text-muted-foreground"
                title={`QS World University Rankings 2027: ${university.qsRank}`}
              >
                #{university.qsRank}
              </span>
              <a
                href={universityLink(university)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 font-medium hover:text-primary hover:underline"
                title={`${university.name}${university.domain ? ` — ${university.domain}` : ' — no site recorded'}`}
              >
                {university.name}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">{university.country}</span>
              {university.supervisors > 0 ? (
                <span
                  className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                  title={`${university.supervisors} supervisors transcribed`}
                >
                  {university.supervisors} supervisors
                </span>
              ) : (
                <span className="shrink-0 text-[10px] text-muted-foreground" aria-hidden="true">
                  —
                </span>
              )}
            </li>
          ))}
        </ol>

        <p className="mt-12 border-t pt-6 text-xs leading-relaxed text-muted-foreground">
          Ranks follow the QS World University Rankings 2027, published by QS on TopUniversities.com.
          Institution names, countries and websites come from Wikidata and are reused under CC0. The
          green number beside a university is the count of people transcribed from that
          institution&rsquo;s own pages; a dash means none yet. If you spot a wrong country or a dead
          link,{' '}
          <Link href="/post-a-job" className="text-primary hover:underline">
            send it in
          </Link>{' '}
          and it goes into the next update.
        </p>
      </section>
    </div>
  )
}
