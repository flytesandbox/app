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
    <main className="space-y-5">
      <section className="rounded-[2rem] border border-black/8 bg-[color:var(--surface)] p-8 shadow-[0_20px_70px_rgba(60,39,18,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Tenant access
        </p>
        <h1 className="mt-4 text-4xl">Team access</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
          Membership management is still intentionally narrow in this base-app
          slice. This page is here to frame where team access will live without
          pretending the full management feature is already rebuilt.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Role
          </p>
          <p className="mt-2 font-semibold">{permissionContext.role}</p>
        </div>
        <div className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Tenant
          </p>
          <p className="mt-2 font-semibold">{tenantContext.tenantId}</p>
        </div>
      </div>
    </main>
  )
}
