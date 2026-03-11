import { notFound, redirect } from 'next/navigation'

import { AuthzError, requireSignedIn } from '@/lib/authz'
import { hasPermission } from '@/lib/permissions'

function isInternalRole(role: string | null) {
  return (
    role === 'platform_admin' ||
    role === 'internal_ops_admin' ||
    role === 'internal_reviewer' ||
    role === 'read_only_auditor'
  )
}

async function getLiveCheckContext() {
  try {
    const { userId, tenantId, role } = await requireSignedIn()

    const canSeeApplication =
      !!role && !!tenantId && hasPermission(role, 'application:view_own')

    const canSeeAdminQueue =
      !!role &&
      isInternalRole(role) &&
      hasPermission(role, 'application:view_all')

    const canMutateAdmin =
      !!role &&
      isInternalRole(role) &&
      hasPermission(role, 'application:change_status')

    return {
      userId,
      tenantId,
      role,
      canSeeApplication,
      canSeeAdminQueue,
      canMutateAdmin,
    }
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect('/sign-in')
    }

    if (error instanceof Error && error.message.includes('notFound')) {
      notFound()
    }

    throw error
  }
}

export default async function DashboardLiveCheckPage() {
  const {
    userId,
    tenantId,
    role,
    canSeeApplication,
    canSeeAdminQueue,
    canMutateAdmin,
  } = await getLiveCheckContext()

  return (
    <main className="p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Live Validation</h1>
        <p className="text-sm text-gray-600">
          This page proves whether the current signed-in user resolves to a
          real role/tenant shape that can support future pages.
        </p>
      </div>

      <section className="rounded border p-4 space-y-2">
        <h2 className="font-semibold">Resolved Context</h2>
        <p><strong>User ID:</strong> {userId}</p>
        <p><strong>Role:</strong> {role ?? 'unresolved'}</p>
        <p><strong>Tenant ID:</strong> {tenantId ?? 'none'}</p>
        <p><strong>Internal User:</strong> {isInternalRole(role) ? 'yes' : 'no'}</p>
      </section>

      <section className="rounded border p-4 space-y-2">
        <h2 className="font-semibold">Expected Access</h2>
        <p><strong>Can access /dashboard/application:</strong> {canSeeApplication ? 'yes' : 'no'}</p>
        <p><strong>Can access /dashboard/admin/applications:</strong> {canSeeAdminQueue ? 'yes' : 'no'}</p>
        <p><strong>Can call admin mutation route:</strong> {canMutateAdmin ? 'yes' : 'no'}</p>
      </section>

      <section className="rounded border p-4 space-y-2">
        <h2 className="font-semibold">Manual Check Targets</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>/dashboard/application</li>
          <li>/dashboard/admin/applications</li>
          <li>/api/private/me</li>
          <li>/api/private/application</li>
          <li>/api/private/admin/applications</li>
          <li>/api/private/admin/status-change</li>
        </ul>
      </section>
    </main>
  )
}