import { notFound } from 'next/navigation'

import { AuthzError, requireInternalRole, requirePermission } from '@/lib/authz'
import RoleAwareNav from '../../_components/role-aware-nav'

async function getAdminApplicationsContext() {
  try {
    const internalContext = await requireInternalRole([
      'platform_admin',
      'internal_ops_admin',
      'internal_reviewer',
      'read_only_auditor',
    ])

    await requirePermission('application:view_all')

    return internalContext
  } catch (error) {
    if (error instanceof AuthzError) {
      notFound()
    }

    throw error
  }
}

export default async function DashboardAdminApplicationsPage() {
  const internalContext = await getAdminApplicationsContext()

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin Applications</h1>
      <p>This is the internal applications review surface.</p>

      <div className="space-y-1 text-sm">
        <p><strong>Role:</strong> {internalContext.role}</p>
        <p><strong>User:</strong> {internalContext.userId}</p>
        <p><strong>Tenant:</strong> {internalContext.tenantId ?? 'none'}</p>
      </div>

      <RoleAwareNav
        role={internalContext.role}
        tenantId={internalContext.tenantId}
      />
    </main>
  )
}