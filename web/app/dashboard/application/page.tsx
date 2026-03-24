import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  EMPTY_APPLICATION_FORM,
  getApplicationStatusLabel,
  getApplicationStepLabel,
  getApplicationTitle,
  getLatestApplicationForTenantUser,
} from '@/lib/applications'
import { AuthzError, requirePermission, requireTenantMember } from '@/lib/authz'
import { isDatabaseEnabled } from '@/lib/db/config'
import { hasPermission } from '@/lib/permissions'
import RoleAwareNav from '../_components/role-aware-nav'
import { saveApplicationDraftAction } from './actions'

type SearchParams = Record<string, string | string[] | undefined>
type PageProps = {
  searchParams?: Promise<SearchParams>
}

function readParam(params: SearchParams, key: string): string | null {
  const value = params[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Not available yet'
  }

  return new Date(value).toLocaleString()
}

async function getApplicationPageContext() {
  try {
    const tenantContext = await requireTenantMember()
    const permissionContext = await requirePermission('application:view_own')
    const databaseEnabled = isDatabaseEnabled()
    const latestApplication =
      databaseEnabled && tenantContext.tenantId
        ? await getLatestApplicationForTenantUser(
            tenantContext.tenantId,
            tenantContext.userId,
          )
        : null

    return {
      tenantContext,
      permissionContext,
      databaseEnabled,
      latestApplication,
      canCreateDraft: hasPermission(permissionContext.role, 'application:create'),
    }
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect('/dashboard')
    }

    throw error
  }
}

export default async function DashboardApplicationPage({
  searchParams,
}: PageProps) {
  const {
    tenantContext,
    permissionContext,
    databaseEnabled,
    latestApplication,
    canCreateDraft,
  } = await getApplicationPageContext()
  const params = searchParams ? await searchParams : {}
  const saved = readParam(params, 'saved')
  const notice = readParam(params, 'notice')

  const formData = latestApplication?.data ?? EMPTY_APPLICATION_FORM
  const disablePersistence =
    !databaseEnabled ||
    ((!latestApplication || latestApplication.status !== 'draft') && !canCreateDraft)
  const primaryButtonLabel =
    latestApplication?.status === 'draft' ? 'Save draft' : 'Create draft'

  return (
    <main className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-black/8 bg-[color:var(--surface)] p-8 shadow-[0_20px_70px_rgba(60,39,18,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Tenant application
          </p>
          <h1 className="mt-4 text-4xl">
            {latestApplication
              ? getApplicationTitle(latestApplication)
              : 'Start the first application draft'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
            This is the first real tenant-side workflow beyond the shell. It is
            meant to feel like a working base application, even when an
            environment is only in preview mode.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Role
              </p>
              <p className="mt-2 text-lg">{permissionContext.role}</p>
            </div>
            <div className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Status
              </p>
              <p className="mt-2 text-lg">
                {latestApplication
                  ? getApplicationStatusLabel(latestApplication.status)
                  : 'Not started'}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-black/8 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Last updated
              </p>
              <p className="mt-2 text-lg">
                {formatTimestamp(latestApplication?.updatedAt ?? null)}
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-[1.8rem] border border-black/8 bg-[rgba(43,35,27,0.95)] p-6 text-white shadow-[0_18px_50px_rgba(43,35,27,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            Workflow shape
          </p>
          <ol className="mt-5 space-y-3 text-sm leading-6 text-white/80">
            <li>1. Capture the company profile and first readiness details.</li>
            <li>2. Save the draft before moving deeper into the project.</li>
            <li>3. Review the draft and submit it for internal review.</li>
          </ol>
          <div className="mt-6 rounded-[1.2rem] border border-white/10 bg-white/10 p-4 text-sm leading-6">
            <p>
              Tenant: <strong>{tenantContext.tenantId}</strong>
            </p>
            <p>
              Current step:{' '}
              <strong>
                {latestApplication
                  ? getApplicationStepLabel(latestApplication.currentStep)
                  : 'Company profile'}
              </strong>
            </p>
          </div>
        </aside>
      </section>

      {saved ? (
        <div className="rounded-[1.4rem] border border-emerald-700/20 bg-emerald-50 p-4 text-sm text-emerald-900">
          Draft saved successfully.
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-[1.4rem] border border-[color:var(--accent)]/20 bg-[color:var(--accent)]/8 p-4 text-sm text-[color:var(--accent-strong)]">
          {notice}
        </div>
      ) : null}

      {!databaseEnabled ? (
        <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 text-sm leading-6 text-[color:var(--muted)] shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
          This environment is in preview mode. The form layout is still visible
          for UI review, but draft persistence is disabled until
          `DATABASE_ENABLED=true`.
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <form
          action={saveApplicationDraftAction}
          className="rounded-[1.8rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-semibold">Company name</span>
              <input
                name="companyName"
                required
                defaultValue={formData.companyName}
                placeholder="Example Manufacturing Group"
                className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-semibold">Primary contact</span>
              <input
                name="contactName"
                required
                defaultValue={formData.contactName}
                placeholder="Jordan Hayes"
                className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-semibold">Contact email</span>
              <input
                type="email"
                name="contactEmail"
                required
                defaultValue={formData.contactEmail}
                placeholder="jordan@example.com"
                className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-semibold">Employee count band</span>
              <select
                name="employeeCountBand"
                defaultValue={formData.employeeCountBand}
                className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3"
              >
                <option value="">Select a band</option>
                <option value="1-24">1-24</option>
                <option value="25-74">25-74</option>
                <option value="75-199">75-199</option>
                <option value="200+">200+</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-semibold">Coverage target month</span>
              <input
                name="coverageStartMonth"
                defaultValue={formData.coverageStartMonth}
                placeholder="January 2027"
                className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-semibold">Plan readiness</span>
              <select
                name="planReadiness"
                defaultValue={formData.planReadiness}
                className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3"
              >
                <option value="">Select readiness</option>
                <option value="exploring">Exploring options</option>
                <option value="budgeting">Budgeting and planning</option>
                <option value="ready_to_submit">Ready to submit</option>
              </select>
            </label>
          </div>

          <label className="mt-5 block space-y-2 text-sm">
            <span className="font-semibold">Planning notes</span>
            <textarea
              name="notes"
              defaultValue={formData.notes}
              rows={6}
              placeholder="Capture the context the review team should understand before they see the first draft."
              className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3"
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              name="currentStep"
              value="company_profile"
              className="rounded-full bg-[color:var(--accent)] px-5 py-3 font-semibold text-white shadow-[0_14px_36px_rgba(127,50,21,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disablePersistence}
            >
              {primaryButtonLabel}
            </button>
            <button
              type="submit"
              name="currentStep"
              value="review"
              className="rounded-full border border-black/10 bg-white/80 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disablePersistence}
            >
              Save and continue
            </button>
            <Link
              href="/dashboard/application/review"
              className="rounded-full border border-black/10 bg-white/80 px-5 py-3 font-semibold"
            >
              Open review
            </Link>
          </div>
        </form>

        <div className="space-y-5">
          <article className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_16px_40px_rgba(60,39,18,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Draft health
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--muted)]">
              <p>
                Use this screen to capture the essentials before a reviewer sees
                the application for the first time.
              </p>
              <p>
                The goal is clarity: enough context to shape the queue and the
                follow-up conversation, without pretending the full product is
                already rebuilt.
              </p>
            </div>
          </article>

          <RoleAwareNav
            role={permissionContext.role}
            tenantId={tenantContext.tenantId}
          />
        </div>
      </section>
    </main>
  )
}
