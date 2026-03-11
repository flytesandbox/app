import { notFound } from 'next/navigation'

import { AuthzError, requireInternalRole } from '@/lib/authz'
import RoleAwareNav from '../_components/role-aware-nav'

async function getAdminPageContext() {
  try {
    return await requireInternalRole()
  } catch (error) {
    if (error instanceof AuthzError) {
      notFound()
    }

    throw error
  }
}

export default async function DashboardAdminPage() {
  const { role, userId, tenantId } = await getAdminPageContext()

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p>This is the internal admin area inside the dashboard shell.</p>

      <div className="space-y-1 text-sm">
        <p><strong>Role:</strong> {role}</p>
        <p><strong>User:</strong> {userId}</p>
        <p><strong>Tenant:</strong> {tenantId ?? 'none'}</p>
      </div>

      <RoleAwareNav role={role} tenantId={tenantId} />
    </main>
  )
}