import Link from 'next/link'

import { getServerEnv } from '@/lib/env/server'
import { getReleaseGateSnapshot } from '@/lib/observability/release-gates'
import { getReleaseMetadata } from '@/lib/observability/release'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Release Status | MEC Plans Base App',
  description: 'Human-readable release and runtime status for the deployed app.',
}

function formatTimestamp(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString()
}

export default function ReleaseStatusPage() {
  const release = getReleaseMetadata()
  const releaseGate = getReleaseGateSnapshot(getServerEnv(), release)
  const deploymentModeLabel =
    releaseGate.deploymentMode === 'db-backed'
      ? 'DB-backed staging'
      : 'Preview-mode staging'
  const reviewerWorkflowLabel =
    releaseGate.reviewerWorkflow === 'end-to-end'
      ? 'End-to-end reviewer workflow expected'
      : 'UI review only. Persistence and admin mutations stay out of scope.'

  return (
    <main className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-black/8 bg-[color:var(--surface)] p-8 shadow-[0_20px_70px_rgba(60,39,18,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Release status
          </p>
          <h1 className="mt-4 text-4xl">Current deployed build metadata</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
            This page is meant for humans. The raw machine-readable payloads are
            still available under the API routes, but the main nav should not
            drop reviewers directly into JSON.
          </p>
          <div className="mt-6 inline-flex rounded-full bg-[rgba(127,50,21,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
            {deploymentModeLabel}
          </div>
        </div>

        <aside className="rounded-[1.8rem] border border-black/8 bg-[rgba(43,35,27,0.95)] p-6 text-white shadow-[0_18px_50px_rgba(43,35,27,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            Quick checks
          </p>
          <div className="mt-5 space-y-3 text-sm leading-6 text-white/80">
            <p>Use this page to confirm which build is live before reporting UX issues.</p>
            <p>{reviewerWorkflowLabel}</p>
            <p>
              For machine-readable checks, use <code>/api/health</code>,{' '}
              <code>/api/ready</code>, and <code>/api/release</code>.
            </p>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Environment
          </p>
          <p className="mt-3 text-2xl">{release.appEnv}</p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Image: {release.imageName}
          </p>
        </article>

        <article className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Release SHA
          </p>
          <p className="mt-3 break-all text-sm leading-6">{release.releaseGitSha}</p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Image tag: {release.releaseImageTag}
          </p>
        </article>

        <article className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Deployed at
          </p>
          <p className="mt-3 text-2xl">{formatTimestamp(release.releaseDeployedAt)}</p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Previous good tag: {release.releasePreviousGoodTag}
          </p>
        </article>

        <article className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Release gate mode
          </p>
          <p className="mt-3 text-2xl">{deploymentModeLabel}</p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Ready check expects database={releaseGate.expectedChecks.database}.
          </p>
        </article>
      </section>

      <section className="rounded-[1.8rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Release gates
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
            <p className="text-sm font-semibold">Health and ready</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              A successful staging cut must keep <code>/api/health</code> alive
              and <code>/api/ready</code> at ready with env=ok.
            </p>
          </article>
          <article className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
            <p className="text-sm font-semibold">Database expectation</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Current release gate expects <code>database={releaseGate.expectedChecks.database}</code>.
            </p>
          </article>
          <article className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
            <p className="text-sm font-semibold">Auth sanity</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Unauthenticated access to <code>{releaseGate.authProtection.protectedRoute}</code>{' '}
              should redirect to <code>{releaseGate.authProtection.redirectPath}</code>.
            </p>
          </article>
          <article className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4">
            <p className="text-sm font-semibold">Rollback readiness</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Previous good tag:{' '}
              {releaseGate.rollback.hasPreviousGoodTag
                ? releaseGate.rollback.previousGoodTag
                : 'not recorded yet'}
              .
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Related endpoints
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/api/health"
            className="rounded-full border border-black/10 bg-white/80 px-4 py-2 font-semibold"
          >
            Health JSON
          </Link>
          <Link
            href="/api/ready"
            className="rounded-full border border-black/10 bg-white/80 px-4 py-2 font-semibold"
          >
            Ready JSON
          </Link>
          <Link
            href="/api/release"
            className="rounded-full border border-black/10 bg-white/80 px-4 py-2 font-semibold"
          >
            Release JSON
          </Link>
          <Link
            href="/dashboard/live-check"
            className="rounded-full bg-[color:var(--accent)] px-4 py-2 font-semibold text-white"
          >
            Live validation
          </Link>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Reviewer note
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
          {releaseGate.deploymentMode === 'db-backed'
            ? 'This environment is expected to support real draft persistence, reviewer queue reads, and admin status changes.'
            : 'This environment is intentionally still in preview mode. Layout, navigation, sign-in flow, and release visibility are valid staging checks, but DB-backed draft persistence and reviewer mutations are not expected to be live here yet.'}
        </p>
      </section>
    </main>
  )
}
