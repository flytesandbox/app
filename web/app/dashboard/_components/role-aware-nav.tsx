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

  const isAuditor = role === 'read_only_auditor'

  return (
    <nav className="rounded border p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Navigation
        </h2>
        <p className="text-sm text-gray-600">
          Convenience only. Server-side guards still enforce access.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="rounded border px-3 py-2">
          Dashboard Home
        </Link>

        <Link href="/dashboard/live-check" className="rounded border px-3 py-2">
          Live Validation
        </Link>

        {canSeeExternalApp ? (
          <>
            <Link
              href="/dashboard/application"
              className="rounded border px-3 py-2"
            >
              My Application
            </Link>

            <Link
              href="/dashboard/application/review"
              className="rounded border px-3 py-2"
            >
              Review Application
            </Link>
          </>
        ) : null}

        {canSeeInternalQueue ? (
          <>
            <Link
              href="/dashboard/admin"
              className="rounded border px-3 py-2"
            >
              {isAuditor ? 'Read-Only Admin' : 'Admin Area'}
            </Link>

            <Link
              href="/dashboard/admin/applications"
              className="rounded border px-3 py-2"
            >
              {isAuditor ? 'Read-Only Queue' : 'Applications Queue'}
            </Link>
          </>
        ) : null}
      </div>

      {!role ? (
        <p className="text-sm text-amber-700">
          No application role is resolved yet.
        </p>
      ) : null}

      {role && !tenantId && !isInternalRole(role) ? (
        <p className="text-sm text-amber-700">
          No active tenant is resolved yet, so tenant-scoped links stay limited.
        </p>
      ) : null}
    </nav>
  )
}