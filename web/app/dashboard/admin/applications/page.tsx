import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  getApplicationStatusLabel,
  getApplicationTitle,
  listRecentApplications,
} from '@/lib/applications'
import { AuthzError, requireInternalRole, requirePermission } from '@/lib/authz'
import { isDatabaseEnabled } from '@/lib/db/config'
import { hasPermission } from '@/lib/permissions'
import RoleAwareNav from '../../_components/role-aware-nav'
import { updateApplicationStatusAction } from '@/app/dashboard/application/actions'

type SearchParams = Record<string, string | string[] | undefined>
type PageProps = {
  searchParams?: Promise<SearchParams>
}

function readParam(params: SearchParams, key: string): string | null {
  const value = params[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

async function getAdminApplicationsContext() {
  try {
    const internalContext = await requireInternalRole([
      'platform_admin',
      'internal_ops_admin',
      'internal_reviewer',
      'read_only_auditor',
    ])

    await requirePermission('application:view_all')

    const databaseEnabled = isDatabaseEnabled()
    const applications = databaseEnabled ? await listRecentApplications(12) : []

    return {
      ...internalContext,
      databaseEnabled,
      applications,
      canChangeStatus: hasPermission(
        internalContext.role,
        'application:change_status',
      ),
    }
  } catch (error) {
    if (error instanceof AuthzError) {
      notFound()
    }

    throw error
  }
}

export default async function DashboardAdminApplicationsPage({
  searchParams,
}: PageProps) {
  const internalContext = await getAdminApplicationsContext()
  const params = searchParams ? await searchParams : {}
  const notice = readParam(params, 'notice')
  const statusUpdated = readParam(params, 'statusUpdated')

  return (
    <main className="space-y-5">
      <section className="rounded-[2rem] border border-black/8 bg-[color:var(--surface)] p-8 shadow-[0_20px_70px_rgba(60,39,18,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Internal queue
        </p>
        <h1 className="mt-4 text-4xl">Admin applications</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
          The queue now reflects the first real Phase 9 application slice. This
          is where reviewers can see recent tenant work and move it through the
          next decision.
        </p>
      </section>

      {statusUpdated ? (
        <div className="rounded-[1.4rem] border border-emerald-700/20 bg-emerald-50 p-4 text-sm text-emerald-900">
          Application status updated to <strong>{statusUpdated.replace(/_/g, ' ')}</strong>.
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-[1.4rem] border border-[color:var(--accent)]/20 bg-[color:var(--accent)]/8 p-4 text-sm text-[color:var(--accent-strong)]">
          {notice}
        </div>
      ) : null}

      {!internalContext.databaseEnabled ? (
        <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 text-sm leading-6 text-[color:var(--muted)] shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
          This environment is running in preview mode. The queue layout is still
          visible for UX review, but status updates stay disabled until
          `DATABASE_ENABLED=true`.
        </div>
      ) : null}

      {internalContext.applications.length > 0 ? (
        <section className="grid gap-4">
          {internalContext.applications.map((application) => (
            <article
              key={application.id}
              className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    {application.applicantType} application #{application.id}
                  </p>
                  <h2 className="text-2xl">{getApplicationTitle(application)}</h2>
                  <p className="text-sm leading-6 text-[color:var(--muted)]">
                    {getApplicationStatusLabel(application.status)} · tenant{' '}
                    {application.tenantId} · updated {formatTimestamp(application.updatedAt)}
                  </p>
                  <div className="grid gap-2 text-sm text-[color:var(--foreground)] md:grid-cols-2">
                    <p><strong>Contact:</strong> {application.data.contactName || 'Not set'}</p>
                    <p><strong>Email:</strong> {application.data.contactEmail || 'Not set'}</p>
                    <p><strong>Employee band:</strong> {application.data.employeeCountBand || 'Not set'}</p>
                    <p><strong>Coverage target:</strong> {application.data.coverageStartMonth || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:w-[18rem]">
                  <Link
                    href="/dashboard/live-check"
                    className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-center text-sm font-semibold"
                  >
                    Open live validation
                  </Link>

                  {internalContext.canChangeStatus ? (
                    <form action={updateApplicationStatusAction} className="grid gap-2">
                      <input type="hidden" name="applicationId" value={application.id} />
                      <button
                        type="submit"
                        name="nextStatus"
                        value="in_review"
                        className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold"
                        disabled={!internalContext.databaseEnabled}
                      >
                        Mark in review
                      </button>
                      <button
                        type="submit"
                        name="nextStatus"
                        value="changes_requested"
                        className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold"
                        disabled={!internalContext.databaseEnabled}
                      >
                        Request changes
                      </button>
                      <button
                        type="submit"
                        name="nextStatus"
                        value="approved"
                        className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                        disabled={!internalContext.databaseEnabled}
                      >
                        Approve
                      </button>
                    </form>
                  ) : (
                    <p className="rounded-[1.2rem] border border-black/8 bg-white/70 p-3 text-sm text-[color:var(--muted)]">
                      Read-only role. Status changes remain hidden.
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 text-sm leading-6 text-[color:var(--muted)] shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
          No application data is available yet. Create a tenant draft first,
          then return here to review the queue.
        </div>
      )}

      <RoleAwareNav
        role={internalContext.role}
        tenantId={internalContext.tenantId}
      />
    </main>
  )
}
