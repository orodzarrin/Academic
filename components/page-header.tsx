import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { SITE_URL } from '@/lib/format'

interface Crumb {
  label: string
  href: string
}

interface PageHeaderProps {
  eyebrow: string
  title: string
  description: string
  breadcrumbs: Crumb[]
  children?: React.ReactNode
  /**
   * Optional decorative background rendered inside the hero, above its blue
   * fill but below the text (e.g. the Universities page globe). The hero
   * clips horizontally only, so a background element may spill past the
   * frame's top and bottom edges.
   */
  background?: React.ReactNode
}

export function PageHeader({ eyebrow, title, description, breadcrumbs, children, background }: PageHeaderProps) {
  const crumbs = [{ label: 'Home', href: '/' }, ...breadcrumbs]
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      item: `${SITE_URL}${crumb.href}`,
    })),
  }

  return (
    <section className="relative isolate overflow-x-clip bg-primary text-primary-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="blueprint-grid absolute inset-0 -z-10" aria-hidden="true" />
      {background}
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-white/60">
            {crumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
                {index === crumbs.length - 1 ? (
                  <span aria-current="page" className="text-white/90">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:text-white">
                    {crumb.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <p className="mt-6 font-mono text-xs font-medium tracking-wider text-accent uppercase">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-pretty text-white/75">{description}</p>
        {children}
      </div>
    </section>
  )
}
