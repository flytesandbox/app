import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  getApplicationStatusLabel,
  getApplicationStepLabel,
  getApplicationTitle,
  getLatestApplicationForTenantUser,
} from '@/lib/applications'
import { AuthzError, requirePermission, requireTenantMember } from '@/lib/authz'
import { isDatabaseEnabled } from '@/lib/db/config'
import RoleAwareNav from '../../_components/role-aware-nav'
import { submitApplicationAction } from '../actions'

type SearchParams = Record<string, string | string[] | undefined>
type PageProps = {
  searchParams?: Promise<SearchParams>
}

function readParam(params: SearchParams, key: string): string | null {
  const value = params[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Not available yet'
  }

  return new Date(value).toLocaleString()
}

async function getReviewPageContext() {
  try {
    const tenantContext = await requireTenantMember()
    const permissionContext = await requirePermission('application:view_own')
    const databaseEnabled = isDatabaseEnabled()
    const latestApplication =
      databaseEnabled && tenantContext.tenantId
        ? await getLatestApplicationForTenantUser(
            tenantContext.tenantId,
            tenantContext.userId,
          )
        : null

    return {
      tenantContext,
      permissionContext,
      databaseEnabled,
      latestApplication,
    }
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect('/dashboard')
    }

    throw error
  }
}

export default async function DashboardApplicationReviewPage({
  searchParams,
}: PageProps) {
  const { tenantContext, permissionContext, databaseEnabled, latestApplication } =
    await getReviewPageContext()
  const params = searchParams ? await searchParams : {}
  const saved = readParam(params, 'saved')
  const submitted = readParam(params, 'submitted')
  const notice = readParam(params, 'notice')

  return (
    <main className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-black/8 bg-[color:var(--surface)] p-8 shadow-[0_20px_70px_rgba(60,39,18,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Review and submit
          </p>
          <h1 className="mt-4 text-4xl">
            {latestApplication
              ? getApplicationTitle(latestApplication)
              : 'Review the application draft'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
            This view should make the draft legible enough for a final check
            before it enters the internal queue.
          </p>
        </div>

        <aside className="rounded-[1.8rem] border border-black/8 bg-[rgba(43,35,27,0.95)] p-6 text-white shadow-[0_18px_50px_rgba(43,35,27,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            Review posture
          </p>
          <div className="mt-5 space-y-3 text-sm leading-6 text-white/80">
            <p>
              The reviewer should understand the tenant, the contact, the
              timing, and the readiness level without digging through shell
              proof content.
            </p>
            <p>
              Current status:{' '}
              <strong className="text-white">
                {latestApplication
                  ? getApplicationStatusLabel(latestApplication.status)
                  : 'No draft yet'}
              </strong>
            </p>
          </div>
        </aside>
      </section>

      {saved ? (
        <div className="rounded-[1.4rem] border border-emerald-700/20 bg-emerald-50 p-4 text-sm text-emerald-900">
          Draft saved and ready for review.
        </div>
      ) : null}

      {submitted ? (
        <div className="rounded-[1.4rem] border border-emerald-700/20 bg-emerald-50 p-4 text-sm text-emerald-900">
          Application submitted to the internal review queue.
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-[1.4rem] border border-[color:var(--accent)]/20 bg-[color:var(--accent)]/8 p-4 text-sm text-[color:var(--accent-strong)]">
          {notice}
        </div>
      ) : null}

      {!databaseEnabled ? (
        <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 text-sm leading-6 text-[color:var(--muted)] shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
          This environment is in preview mode. The review layout is still
          visible for UX testing, but submission stays disabled until
          `DATABASE_ENABLED=true`.
        </div>
      ) : null}

      {latestApplication ? (
        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.8rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.3rem] border border-black/8 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Status
                </p>
                <p className="mt-2 text-lg">{getApplicationStatusLabel(latestApplication.status)}</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {getApplicationStepLabel(latestApplication.currentStep)}
                </p>
              </div>
              <div className="rounded-[1.3rem] border border-black/8 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Submitted
                </p>
                <p className="mt-2 text-lg">{formatTimestamp(latestApplication.submittedAt)}</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Updated {formatTimestamp(latestApplication.updatedAt)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.3rem] border border-black/8 bg-white/80 p-4 text-sm leading-6">
                <p><strong>Company:</strong> {latestApplication.data.companyName || 'Not set'}</p>
                <p><strong>Contact:</strong> {latestApplication.data.contactName || 'Not set'}</p>
                <p><strong>Email:</strong> {latestApplication.data.contactEmail || 'Not set'}</p>
              </div>
              <div className="rounded-[1.3rem] border border-black/8 bg-white/80 p-4 text-sm leading-6">
                <p><strong>Employee band:</strong> {latestApplication.data.employeeCountBand || 'Not set'}</p>
                <p><strong>Coverage target:</strong> {latestApplication.data.coverageStartMonth || 'Not set'}</p>
                <p><strong>Readiness:</strong> {latestApplication.data.planReadiness || 'Not set'}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.3rem] border border-black/8 bg-white/80 p-4 text-sm leading-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Planning notes
              </p>
              <p className="mt-3 whitespace-pre-wrap text-[color:var(--foreground)]">
                {latestApplication.data.notes || 'No planning notes captured yet.'}
              </p>
            </div>
          </article>

          <div className="space-y-5">
            <article className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
              <h2 className="text-2xl">Ready for handoff?</h2>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                Once this draft reads clearly, submit it so the internal queue
                can pick it up. If more work is needed, jump back into the
                workspace and keep refining it.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/application"
                  className="rounded-full border border-black/10 bg-white/80 px-4 py-2 font-semibold"
                >
                  Back to workspace
                </Link>

                <form action={submitApplicationAction}>
                  <button
                    type="submit"
                    className="rounded-full bg-[color:var(--accent)] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!databaseEnabled || latestApplication.status !== 'draft'}
                  >
                    {latestApplication.status === 'draft'
                      ? 'Submit for review'
                      : 'Already submitted'}
                  </button>
                </form>
              </div>
            </article>

            <RoleAwareNav
              role={permissionContext.role}
              tenantId={tenantContext.tenantId}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-[1.8rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 text-sm leading-6 text-[color:var(--muted)] shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
          No application draft exists yet. Start in the workspace first, then
          return here when the base details are ready for review.
          <div className="mt-4">
            <Link
              href="/dashboard/application"
              className="inline-flex rounded-full bg-[color:var(--accent)] px-4 py-2 font-semibold text-white"
            >
              Open workspace
            </Link>
          </div>
        </section>
      )}
    </main>
  )
}
