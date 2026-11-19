import Link from 'next/link'
import { LiveBadge } from '@/components/live/live-badge'
import { LiveStatus } from '@/components/live/live-status'
import { SearchBar } from '@/components/home/search-bar'

interface HeroProps {
  stats: { total: number; academic: number; visa: number }
  /** Data snapshot time (data/jobs.json generatedAt) for the freshness line. */
  updatedAt: string | null
}

export function Hero({ stats, updatedAt }: HeroProps) {
  const statItems = [
    { label: 'Live roles', value: stats.total },
    { label: 'Academic', value: stats.academic },
    { label: 'Visa sponsored', value: stats.visa },
  ]

  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <div className="hero-grid absolute inset-0 -z-10 pointer-events-none" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 pt-16 pb-14 sm:px-6 md:pt-24 md:pb-20 lg:px-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 font-mono text-xs tracking-wider text-white/80 uppercase">
          <LiveBadge />
        </p>

        <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Academic <span className="text-accent">Opportunity</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-white/80">
          Explore academic positions and fully funded PhD scholarships in structural and civil
          engineering, and find a supervisor.
        </p>

        <div className="mt-10 max-w-5xl">
          <SearchBar />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-white/80">
          <span>Popular:</span>
          <Link
            href="/academic-positions"
            className="rounded-full border border-white/20 px-3 py-1 transition-colors hover:border-accent hover:text-white"
          >
            Academic Positions
          </Link>
          <Link
            href="/academic?role=phd-scholarship"
            className="rounded-full border border-white/20 px-3 py-1 transition-colors hover:border-accent hover:text-white"
          >
            PhD Scholarships
          </Link>
          <Link
            href="/universities"
            className="rounded-full border border-white/20 px-3 py-1 transition-colors hover:border-accent hover:text-white"
          >
            Universities worldwide
          </Link>
          <Link
            href="/supervisors"
            className="rounded-full border border-accent/60 bg-accent/10 px-3 py-1 font-medium text-white transition-colors hover:border-accent"
          >
            Find a supervisor
          </Link>
        </div>

        <dl className="mt-14 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/15 bg-white/15 sm:grid-cols-3">
          {statItems.map((item) => (
            <div key={item.label} className="bg-primary/80 px-5 py-4 backdrop-blur">
              <dt className="font-mono text-[11px] tracking-wider text-white/75 uppercase">
                {item.label}
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>

        <LiveStatus updatedAt={updatedAt} />
      </div>
    </section>
  )
}
