import { redirect } from 'next/navigation'

import { AuthzError, requirePermission, requireTenantMember } from '@/lib/authz'
import RoleAwareNav from '../_components/role-aware-nav'

async function getApplicationPageContext() {
  try {
    const tenantContext = await requireTenantMember()
    const permissionContext = await requirePermission('application:view_own')

    return { tenantContext, permissionContext }
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect('/dashboard')
    }

    throw error
  }
}

export default async function DashboardApplicationPage() {
  const { tenantContext, permissionContext } = await getApplicationPageContext()

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Application</h1>
      <p>This is the tenant-scoped application workspace.</p>

      <div className="space-y-1 text-sm">
        <p><strong>Role:</strong> {permissionContext.role}</p>
        <p><strong>Tenant:</strong> {tenantContext.tenantId}</p>
        <p><strong>User:</strong> {tenantContext.userId}</p>
      </div>

      <RoleAwareNav
        role={permissionContext.role}
        tenantId={tenantContext.tenantId}
      />
    </main>
  )
}