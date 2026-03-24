import Link from 'next/link'

import { hasPermission, type Role } from '@/lib/permissions'

type RoleAwareNavProps = {
  role: Role | null
  tenantId?: string | null
}

function isInternalRole(role: Role | null) {
  return (
    role === 'platform_admin' ||
    role === 'internal_ops_admin' ||
    role === 'internal_reviewer' ||
    role === 'read_only_auditor'
  )
}

export default function RoleAwareNav({
  role,
  tenantId = null,
}: RoleAwareNavProps) {
  const canSeeExternalApp =
    !!role &&
    !!tenantId &&
    hasPermission(role, 'application:view_own')

  const canSeeInternalQueue =
    !!role &&
    isInternalRole(role) &&
    hasPermission(role, 'application:view_all')

  const canManageMembers =
    !!role &&
    !!tenantId &&
    hasPermission(role, 'tenant:manage_members')

  const isAuditor = role === 'read_only_auditor'

  return (
    <nav className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-5 shadow-[0_16px_40px_rgba(60,39,18,0.05)] space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Navigation
        </h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          These links reflect the current role shape, but the real boundary is
          still enforced on the server.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm">
          Dashboard Home
        </Link>

        <Link href="/dashboard/live-check" className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm">
          Live Validation
        </Link>

        {canSeeExternalApp ? (
          <>
            <Link
              href="/dashboard/application"
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm"
            >
              Application workspace
            </Link>

            <Link
              href="/dashboard/application/review"
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm"
            >
              Review and submit
            </Link>
          </>
        ) : null}

        {canManageMembers ? (
          <Link
            href="/dashboard/tenant-members"
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm"
          >
            Team access
          </Link>
        ) : null}

        {canSeeInternalQueue ? (
          <>
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm"
            >
              {isAuditor ? 'Read-only admin' : 'Operations overview'}
            </Link>

            <Link
              href="/dashboard/admin/applications"
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm"
            >
              {isAuditor ? 'Read-only queue' : 'Review queue'}
            </Link>
          </>
        ) : null}
      </div>

      {!role ? (
        <p className="text-sm text-[color:var(--accent-strong)]">
          No application role is resolved yet.
        </p>
      ) : null}

      {role && !tenantId && !isInternalRole(role) ? (
        <p className="text-sm text-[color:var(--accent-strong)]">
          No active tenant is resolved yet, so the tenant workspace stays
          limited until membership is attached.
        </p>
      ) : null}
    </nav>
  )
}
