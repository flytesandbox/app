import { redirect } from 'next/navigation'

import { AuthzError, requireSignedIn } from '@/lib/authz'
import RoleAwareNav from './_components/role-aware-nav'

async function getDashboardContext() {
  try {
    return await requireSignedIn()
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect('/sign-in')
    }

    throw error
  }
}

export default async function DashboardHomePage() {
  const { role, tenantId } = await getDashboardContext()

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>This is the protected authenticated shell.</p>

      <div className="space-y-1 text-sm">
        <p><strong>Role:</strong> {role ?? 'unresolved'}</p>
        <p><strong>Tenant:</strong> {tenantId ?? 'none'}</p>
      </div>

      <RoleAwareNav role={role} tenantId={tenantId} />
    </main>
  )
}