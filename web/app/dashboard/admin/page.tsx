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
    <main className="space-y-5">
      <section className="rounded-[2rem] border border-black/8 bg-[color:var(--surface)] p-8 shadow-[0_20px_70px_rgba(60,39,18,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Internal operations
        </p>
        <h1 className="mt-4 text-4xl">Admin overview</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
          Internal roles now land in an operations view instead of a bare proof
          page. The review queue remains the primary next stop.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Role
          </p>
          <p className="mt-2 font-semibold">{role}</p>
        </div>
        <div className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            User
          </p>
          <p className="mt-2 font-semibold">{userId}</p>
        </div>
        <div className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Tenant
          </p>
          <p className="mt-2 font-semibold">{tenantId ?? 'No tenant context'}</p>
        </div>
      </div>

      <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 text-sm leading-6 text-[color:var(--muted)] shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
        <p>
          Use the review queue to inspect the latest applications, update
          status, and verify the reviewer-facing flow before broader feature
          work resumes.
        </p>
      </div>

      <RoleAwareNav role={role} tenantId={tenantId} />
    </main>
  )
}
