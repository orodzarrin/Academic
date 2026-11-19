'use client'

import { Check, ExternalLink, Mail, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CountryLandmark } from '@/components/academics/country-landmark'
import { CvPanel } from '@/components/supervisors/cv-panel'
import { COUNTRY_PHOTOS } from '@/data/country-photos'
import {
  ACADEMICS,
  COUNTRIES,
  DISCIPLINES,
  FIELDS,
  countriesWithData,
  disciplineName,
  disciplineOf,
  groupByCountryAndUniversity,
  subfieldsFor,
  universitiesFor,
  type Academic,
  type AcademicField,
  type CountryCode,
  type Discipline,
} from '@/lib/academics'
import type { CandidateProfile } from '@/lib/cv'
import { followUpMailtoHref, mailtoHref } from '@/lib/supervisor-email'
import { getUniversityUrl } from '@/lib/university-links'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'sjs.supervisors.emailed.v2'
const LEGACY_KEY = 'sjs.supervisors.emailed.v1'
const CV_KEY = 'sjs.supervisors.cv.v1'
const ATTACH_KEY = 'sjs.supervisors.attach.v1'

/** When the first email went out, and when the nudge went out if it has. */
interface EmailedEntry {
  sentAt: string
  followUpAt?: string
}

type EmailedMap = Record<string, EmailedEntry>
type CountryFilter = 'all' | CountryCode
type FieldFilter = 'all' | AcademicField
type DisciplineFilter = 'all' | Discipline

const COUNTRIES_WITH_DATA = countriesWithData()
const COUNTRY_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]))

function shortDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

/** Accepts the older shape, where each id mapped straight to a timestamp. */
function normalizeEmailed(raw: string): EmailedMap {
  const parsed = JSON.parse(raw) as Record<string, string | EmailedEntry>
  const out: EmailedMap = {}

  for (const [personId, value] of Object.entries(parsed ?? {})) {
    if (typeof value === 'string') out[personId] = { sentAt: value }
    else if (value && typeof value.sentAt === 'string') {
      out[personId] = {
        sentAt: value.sentAt,
        followUpAt: typeof value.followUpAt === 'string' ? value.followUpAt : undefined,
      }
    }
  }

  return out
}

function SupervisorCard({
  person,
  entry,
  onEmail,
  onFollowUp,
  profile,
  attachCv,
}: {
  person: Academic
  entry: EmailedEntry | null
  onEmail: () => void
  onFollowUp: () => void
  profile?: CandidateProfile | null
  attachCv: boolean
}) {
  const href = mailtoHref(person, profile ?? undefined, { attachCv })
  const followUpHref = followUpMailtoHref(person, profile, { attachCv, sentAt: entry?.sentAt })

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-lg border bg-card p-5 transition-colors',
        entry && 'border-emerald-300 bg-emerald-50/60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold">{person.name}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{person.title}</p>
        </div>
        {entry && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            <Check className="size-3" aria-hidden="true" />
            {entry.followUpAt ? 'Followed up' : 'Emailed'}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{person.researchFocus}</p>

      {entry && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-emerald-800">
          <span>Sent {shortDate(entry.sentAt)}</span>
          {entry.followUpAt ? (
            <span>· followed up {shortDate(entry.followUpAt)}</span>
          ) : followUpHref ? (
            <>
              <span aria-hidden="true">·</span>
              <a href={followUpHref} onClick={onFollowUp} className="font-medium underline">
                Send a follow-up
              </a>
            </>
          ) : null}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-sm">
        {href ? (
          <a
            href={href}
            onClick={onEmail}
            className="inline-flex items-center gap-1.5 font-medium break-all text-primary hover:underline"
          >
            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
            {person.email}
          </a>
        ) : (
          // A guessed address sends a student's enquiry to a stranger with a
          // similar name, so an unpublished one stays empty.
          <span className="text-xs text-muted-foreground">Email not published</span>
        )}

        {person.orcid ? (
          <a
            href={`https://orcid.org/${person.orcid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            title={`ORCID ${person.orcid}`}
          >
            ORCID
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        ) : null}

        <a
          href={person.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Profile
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
    </article>
  )
}

export function SupervisorExplorer({
  pageSize = 24,
  id = 'supervisors',
  showDirectoryLink = true,
}: {
  pageSize?: number
  id?: string
  showDirectoryLink?: boolean
}) {
  const [country, setCountry] = useState<CountryFilter>('all')
  const [university, setUniversity] = useState('all')
  const [discipline, setDiscipline] = useState<DisciplineFilter>('all')
  const [field, setField] = useState<FieldFilter>('all')
  const [shown, setShown] = useState(pageSize)
  const [emailed, setEmailed] = useState<EmailedMap>({})
  const [cv, setCv] = useState<CandidateProfile | null>(null)
  const [attachCv, setAttachCv] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY)
      if (raw) setEmailed(normalizeEmailed(raw))
    } catch {
      // Private mode or a blocked store: the list simply stays empty.
    }
    try {
      const stored = window.localStorage.getItem(CV_KEY)
      if (stored) setCv(JSON.parse(stored) as CandidateProfile)
    } catch {
      // A corrupt entry just means no CV is loaded.
    }
    if (window.localStorage.getItem(ATTACH_KEY) === 'false') setAttachCv(false)
    setReady(true)
  }, [])

  function persist(next: EmailedMap) {
    setEmailed(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      window.localStorage.removeItem(LEGACY_KEY)
    } catch {
      // Nothing to do - the tick is still shown for this visit.
    }
  }

  const markEmailed = (person: Academic) => {
    // Following up does not reset the record of the first email; it adds to it.
    if (emailed[person.id]) return
    persist({ ...emailed, [person.id]: { sentAt: new Date().toISOString() } })
  }

  const markFollowedUp = (person: Academic) => {
    const entry = emailed[person.id]
    if (!entry) return
    persist({ ...emailed, [person.id]: { ...entry, followUpAt: new Date().toISOString() } })
  }

  function saveCv(next: CandidateProfile | null) {
    setCv(next)
    try {
      if (next) window.localStorage.setItem(CV_KEY, JSON.stringify(next))
      else window.localStorage.removeItem(CV_KEY)
    } catch {
      // The CV still applies for this visit.
    }
  }

  function saveAttach(next: boolean) {
    setAttachCv(next)
    try {
      window.localStorage.setItem(ATTACH_KEY, String(next))
    } catch {
      // The choice still applies for this visit.
    }
  }

  const removeEmailed = (personId: string) => {
    const next = { ...emailed }
    delete next[personId]
    persist(next)
  }

  const universities = useMemo(
    () => universitiesFor(country === 'all' ? undefined : country),
    [country],
  )

  // The second dropdown only offers what the first one allows.
  const subfields = useMemo(
    () => subfieldsFor(discipline === 'all' ? undefined : discipline),
    [discipline],
  )

  const people = useMemo(
    () =>
      ACADEMICS.filter(
        (person) =>
          (country === 'all' || person.country === country) &&
          (university === 'all' || person.university === university) &&
          (discipline === 'all' || disciplineOf(person.field) === discipline) &&
          (field === 'all' || person.field === field),
      ),
    [country, university, discipline, field],
  )

  const groups = useMemo(
    () => groupByCountryAndUniversity(people.slice(0, shown)),
    [people, shown],
  )
  const emailedPeople = useMemo(
    () =>
      Object.entries(emailed)
        .sort(([, a], [, b]) => b.sentAt.localeCompare(a.sentAt))
        .map(([personId, entry]) => ({ person: ACADEMICS.find((p) => p.id === personId), entry }))
        .filter((row): row is { person: Academic; entry: EmailedEntry } => Boolean(row.person)),
    [emailed],
  )

  const active =
    country !== 'all' || university !== 'all' || discipline !== 'all' || field !== 'all'
  const selectedCountry = country === 'all' ? null : COUNTRY_BY_CODE.get(country)
  // The site is Australian, so "all countries" still carries a home-country backdrop.
  const backdrop = COUNTRY_PHOTOS[selectedCountry?.code ?? 'AU']

  function updateCountry(next: CountryFilter) {
    setCountry(next)
    setUniversity('all')
    setShown(pageSize)
  }

  return (
    <section id={id} className="relative scroll-mt-24 overflow-hidden border-y bg-muted/40 py-14 md:py-16">
      <CountryLandmark code={selectedCountry?.code ?? 'AU'} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium tracking-wider text-accent uppercase">
              {selectedCountry ? selectedCountry.name : 'Supervisors'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Find your supervisor
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {ACADEMICS.length} lecturers, associate professors and professors at{' '}
              {new Set(ACADEMICS.map((person) => person.university)).size} universities in{' '}
              {COUNTRIES_WITH_DATA.length} countries — their research focus, and an enquiry email
              already written to each one. Add your CV and the email fills with your own details;
              filter by country, university or field, pick the people whose work fits, and the ones
              you have written to turn green.
            </p>
          </div>

          {showDirectoryLink && (
            <Link
              href="/supervisors"
              className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-4 text-sm font-semibold transition-colors hover:border-primary/40"
            >
              Open the full directory
            </Link>
          )}
        </div>

        <div className="mt-8 rounded-xl border bg-card p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Country
              </span>
              <select
                value={country}
                onChange={(event) => updateCountry(event.target.value as CountryFilter)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All countries ({ACADEMICS.length})</option>
                {COUNTRIES_WITH_DATA.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.name} (
                    {ACADEMICS.filter((person) => person.country === entry.code).length})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                University
              </span>
              <select
                value={university}
                onChange={(event) => {
                  setUniversity(event.target.value)
                  setShown(pageSize)
                }}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All universities</option>
                {universities.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Field of study
              </span>
              <select
                value={discipline}
                onChange={(event) => {
                  setDiscipline(event.target.value as DisciplineFilter)
                  setField('all')
                  setShown(pageSize)
                }}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All fields</option>
                {DISCIPLINES.map((entry) => (
                  <option key={entry.slug} value={entry.slug}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                PhD specialisation
              </span>
              <select
                value={field}
                onChange={(event) => {
                  setField(event.target.value as FieldFilter)
                  setShown(pageSize)
                }}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All specialisations</option>
                {subfields.map((entry) => (
                  <option key={entry.slug} value={entry.slug}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              {active && (
                <button
                  type="button"
                  onClick={() => {
                    updateCountry('all')
                    setDiscipline('all')
                    setField('all')
                  }}
                  className="h-10 rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        <CvPanel
          profile={cv}
          onChange={saveCv}
          onClear={() => saveCv(null)}
          attachCv={attachCv}
          onAttachChange={saveAttach}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <p className="text-sm text-muted-foreground">
              {people.length} {people.length === 1 ? 'supervisor' : 'supervisors'}
              {field !== 'all' && ` in ${FIELDS.find((entry) => entry.slug === field)?.name.toLowerCase()}`}
              {field === 'all' && discipline !== 'all' && ` in ${disciplineName(discipline).toLowerCase()}`}
              {university !== 'all' && ` at ${university}`}
            </p>

            {groups.length === 0 ? (
              <p className="mt-8 rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                {discipline !== 'all' &&
                !ACADEMICS.some((person) => disciplineOf(person.field) === discipline)
                  ? `No supervisors in ${disciplineName(discipline).toLowerCase()} yet. The filter covers the whole engineering faculty, but people are only added from staff pages that publish an address — so this section fills up a university at a time.`
                  : 'Nobody matches those filters yet. Try a wider country, field of study or specialisation.'}
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.country.code} className="mt-8 first:mt-6">
                  <h3 className="flex items-center gap-3 text-sm font-semibold">
                    {group.country.name}
                    <span className="h-px flex-1 bg-border" aria-hidden="true" />
                    <span className="font-mono text-xs text-muted-foreground">
                      {group.universities.reduce((total, entry) => total + entry.people.length, 0)}
                    </span>
                  </h3>

                  {group.universities.map((entry) => (
                    <div key={entry.university} className="mt-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-base font-semibold tracking-tight">
                          {(() => {
                            const universityUrl = getUniversityUrl(entry.university)
                            return universityUrl ? (
                              <a
                                href={universityUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline decoration-muted-foreground/50 underline-offset-2 hover:text-primary"
                              >
                                {entry.university}
                              </a>
                            ) : (
                              entry.university
                            )
                          })()}
                        </h4>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {entry.state} · {entry.people.length}
                        </p>
                      </div>

                      {entry.byField.map((section) => (
                        <div key={section.field} className="mt-4">
                          <h5 className="flex items-center gap-3 font-mono text-[10px] font-medium tracking-wider uppercase">
                            <span className="text-accent">{section.name}</span>
                            <span className="h-px flex-1 bg-border" aria-hidden="true" />
                          </h5>
                          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                            {section.people.map((person) => (
                              <li key={person.id}>
                                <SupervisorCard
                                  person={person}
                                  entry={ready ? (emailed[person.id] ?? null) : null}
                                  onEmail={() => markEmailed(person)}
                                  onFollowUp={() => markFollowedUp(person)}
                                  profile={cv}
                                  attachCv={attachCv}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}

            {shown < people.length && (
              <button
                type="button"
                onClick={() => setShown(shown + pageSize)}
                className="mt-8 h-10 rounded-md border bg-card px-4 text-sm font-semibold transition-colors hover:border-primary/40"
              >
                Show more ({people.length - shown} left)
              </button>
            )}

            <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
              Background photograph:{' '}
              <a
                href={backdrop.source}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                {backdrop.credit}
              </a>{' '}
              / Wikimedia Commons, {backdrop.license}.
            </p>
          </div>

          <aside className="self-start lg:sticky lg:top-24">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Emailed ({emailedPeople.length})</h3>
                {emailedPeople.length > 0 && (
                  <button
                    type="button"
                    onClick={() => persist({})}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Saved in this browser. Clicking an address writes the email; two weeks later, send
                the follow-up from here.
              </p>

              {emailedPeople.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Nobody yet. Once you email someone, their card turns green and they appear here,
                  so you never write to the same supervisor twice.
                </p>
              ) : (
                <ul className="mt-4 space-y-3.5">
                  {emailedPeople.map(({ person, entry }) => {
                    const href = followUpMailtoHref(person, cv, {
                      attachCv,
                      sentAt: entry.sentAt,
                    })
                    return (
                      <li key={person.id} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{person.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{person.university}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Sent {shortDate(entry.sentAt)}
                          </p>
                          {entry.followUpAt ? (
                            <p className="text-[11px] text-emerald-700">
                              Follow-up sent {shortDate(entry.followUpAt)}
                            </p>
                          ) : href ? (
                            <a
                              href={href}
                              onClick={() => markFollowedUp(person)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            >
                              <Mail className="size-3" aria-hidden="true" />
                              Follow up
                            </a>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEmailed(person.id)}
                          aria-label={`Remove ${person.name} from the emailed list`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {emailedPeople.length > 0 && (
                <p className="mt-4 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Give it ten days to two weeks before following up. One short nudge is enough — no
                  reply usually means a full group, not a lost email.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-xl border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">Before you send</p>
              <p className="mt-1">
                Fill in the brackets, attach your CV and transcript, and mention one specific paper or
                project of theirs. A generic email to twenty professors gets answered by none of them.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
