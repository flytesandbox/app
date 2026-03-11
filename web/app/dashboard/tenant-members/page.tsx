import { redirect } from 'next/navigation'

import { AuthzError, requirePermission, requireTenantMember } from '@/lib/authz'

async function getTenantMembersPageContext() {
  try {
    const tenantContext = await requireTenantMember()
    const permissionContext = await requirePermission('tenant:manage_members')

    return { tenantContext, permissionContext }
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect('/dashboard')
    }

    throw error
  }
}

export default async function DashboardTenantMembersPage() {
  const { tenantContext, permissionContext } =
    await getTenantMembersPageContext()

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Tenant Members</h1>
      <p>This is the tenant member management surface.</p>

      <div className="space-y-1 text-sm">
        <p><strong>Role:</strong> {permissionContext.role}</p>
        <p><strong>Tenant:</strong> {tenantContext.tenantId}</p>
      </div>
    </main>
  )
}