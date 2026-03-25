import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  getApplicationStatusLabel,
  getApplicationStepLabel,
  getApplicationTitle,
  getLatestApplicationForTenantUser,
  listRecentApplications,
} from '@/lib/applications'
import { AuthzError, requireSignedIn } from '@/lib/authz'
import { isDatabaseEnabled } from '@/lib/db/config'
import { hasPermission, type Role } from '@/lib/permissions'
import RoleAwareNav from './_components/role-aware-nav'

function isInternalRole(role: Role | null) {
  return (
    role === 'platform_admin' ||
    role === 'internal_ops_admin' ||
    role === 'internal_reviewer' ||
    role === 'read_only_auditor'
  )
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Not available yet'
  }

  return new Date(value).toLocaleString()
}

async function getDashboardContext() {
  try {
    const context = await requireSignedIn()
    const databaseEnabled = isDatabaseEnabled()
    const canSeeApplication =
      !!context.role &&
      !!context.tenantId &&
      hasPermission(context.role, 'application:view_own')
    const canSeeAdminQueue =
      !!context.role &&
      isInternalRole(context.role) &&
      hasPermission(context.role, 'application:view_all')

    const latestApplication =
      databaseEnabled && canSeeApplication && context.tenantId
        ? await getLatestApplicationForTenantUser(context.tenantId, context.userId)
        : null

    const reviewQueue =
      databaseEnabled && canSeeAdminQueue ? await listRecentApplications(5) : []

    return {
      ...context,
      databaseEnabled,
      canSeeApplication,
      canSeeAdminQueue,
      latestApplication,
      reviewQueue,
    }
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect('/sign-in')
    }

    throw error
  }
}

export default async function DashboardHomePage() {
  const {
    role,
    tenantId,
    databaseEnabled,
    canSeeApplication,
    canSeeAdminQueue,
    latestApplication,
    reviewQueue,
  } = await getDashboardContext()

  return (
    <main className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-black/8 bg-[color:var(--surface)] p-8 shadow-[0_20px_70px_rgba(60,39,18,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Signed-in workspace
          </p>
          <h1 className="mt-4 text-4xl">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
            This workspace should help a reviewer understand what to do next,
            not just prove that protected routes exist.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Role
              </p>
              <p className="mt-2 text-lg">{role ?? 'Unresolved'}</p>
            </div>

            <div className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Tenant
              </p>
              <p className="mt-2 text-lg">{tenantId ?? 'None attached'}</p>
            </div>

            <div className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Data mode
              </p>
              <p className="mt-2 text-lg">
                {databaseEnabled ? 'Database-backed' : 'Preview only'}
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-[1.8rem] border border-black/8 bg-[rgba(43,35,27,0.95)] p-6 text-white shadow-[0_18px_50px_rgba(43,35,27,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            What should happen next
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-white/80">
            <p>
              Tenant users should move directly into their application
              workspace, while internal users should see a review queue that
              makes the latest submissions visible.
            </p>
            <p>
              If the database is disabled in this environment, the UI should
              still read clearly enough to support staging UX review.
            </p>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[1.8rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Tenant workspace
          </p>
          <h2 className="mt-3 text-3xl">
            {canSeeApplication ? 'Application progress' : 'Workspace access'}
          </h2>

          {canSeeApplication ? (
            latestApplication ? (
              <div className="mt-5 space-y-3 text-sm leading-6">
                <p className="text-lg font-semibold">
                  {getApplicationTitle(latestApplication)}
                </p>
                <p className="text-[color:var(--muted)]">
                  {getApplicationStatusLabel(latestApplication.status)} ·{' '}
                  {getApplicationStepLabel(latestApplication.currentStep)}
                </p>
                <p className="text-[color:var(--muted)]">
                  Last updated {formatTimestamp(latestApplication.updatedAt)}
                </p>
                <Link
                  href="/dashboard/application"
                  className="mt-3 inline-flex rounded-full bg-[color:var(--accent)] px-4 py-2 font-semibold text-white"
                >
                  Resume workspace
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3 text-sm leading-6 text-[color:var(--muted)]">
                <p>No application draft exists yet.</p>
                <Link
                  href="/dashboard/application"
                  className="inline-flex rounded-full bg-[color:var(--accent)] px-4 py-2 font-semibold text-white"
                >
                  Start the first draft
                </Link>
              </div>
            )
          ) : (
            <p className="mt-5 text-sm leading-6 text-[color:var(--muted)]">
              This user does not yet resolve to a tenant-scoped role with
              application access. Use the live validation screen to confirm the
              current Clerk and role shape.
            </p>
          )}
        </article>

        <article className="rounded-[1.8rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Internal review
          </p>
          <h2 className="mt-3 text-3xl">
            {canSeeAdminQueue ? 'Recent queue activity' : 'Review queue access'}
          </h2>

          {canSeeAdminQueue ? (
            reviewQueue.length > 0 ? (
              <ul className="mt-5 space-y-3 text-sm">
                {reviewQueue.map((application) => (
                  <li
                    key={application.id}
                    className="rounded-[1.2rem] border border-black/8 bg-white/80 p-4"
                  >
                    <p className="font-semibold">
                      {getApplicationTitle(application)}
                    </p>
                    <p className="text-[color:var(--muted)]">
                      {getApplicationStatusLabel(application.status)} · tenant{' '}
                      {application.tenantId}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm leading-6 text-[color:var(--muted)]">
                No applications are visible in the queue yet.
              </p>
            )
          ) : (
            <p className="mt-5 text-sm leading-6 text-[color:var(--muted)]">
              Internal review links stay hidden until an internal role with
              queue visibility is resolved.
            </p>
          )}
        </article>
      </section>

      <RoleAwareNav role={role} tenantId={tenantId} />
    </main>
  )
}
