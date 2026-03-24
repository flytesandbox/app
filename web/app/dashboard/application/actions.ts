'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { writeAuditEvent } from '@/lib/audit/events'
import {
  createApplicationDraft,
  getLatestApplicationForTenantUser,
  submitApplication,
  updateApplicationDraft,
  updateApplicationStatus,
  type ApplicationFormData,
  type ApplicationStatus,
} from '@/lib/applications'
import { requireInternalRole, requirePermission, requireTenantMember } from '@/lib/authz'
import { isDatabaseEnabled } from '@/lib/db/config'
import { type Role } from '@/lib/permissions'

type ReviewableApplicationStatus = Exclude<ApplicationStatus, 'draft'>

const REVIEWABLE_STATUSES = new Set<ReviewableApplicationStatus>([
  'submitted',
  'in_review',
  'changes_requested',
  'approved',
])

function readText(formData: FormData, key: string, maxLength: number): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function readApplicationFormData(formData: FormData): ApplicationFormData {
  return {
    companyName: readText(formData, 'companyName', 120),
    contactName: readText(formData, 'contactName', 120),
    contactEmail: readText(formData, 'contactEmail', 191).toLowerCase(),
    employeeCountBand: readText(formData, 'employeeCountBand', 60),
    coverageStartMonth: readText(formData, 'coverageStartMonth', 30),
    planReadiness: readText(formData, 'planReadiness', 60),
    notes: readText(formData, 'notes', 2000),
  }
}

function resolveApplicantType(role: Role): string {
  if (role.startsWith('advisor')) {
    return 'advisor'
  }

  if (role === 'individual_member') {
    return 'individual'
  }

  return 'employer'
}

function revalidateApplicationPaths() {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/application')
  revalidatePath('/dashboard/application/review')
  revalidatePath('/dashboard/admin/applications')
}

function isReviewableStatus(value: string): value is ReviewableApplicationStatus {
  return REVIEWABLE_STATUSES.has(value as ReviewableApplicationStatus)
}

function redirectWithNotice(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`)
}

export async function saveApplicationDraftAction(formData: FormData) {
  const tenantContext = await requireTenantMember()

  if (!isDatabaseEnabled()) {
    redirectWithNotice(
      '/dashboard/application',
      'Database-backed saving is disabled in this environment.',
    )
  }

  const latest = await getLatestApplicationForTenantUser(
    tenantContext.tenantId,
    tenantContext.userId,
  )

  if (latest && latest.status === 'draft') {
    await requirePermission('application:edit_own')
  } else {
    await requirePermission('application:create')
  }

  const currentStep =
    readText(formData, 'currentStep', 40) === 'review'
      ? 'review'
      : 'company_profile'

  const payload = readApplicationFormData(formData)

  const record =
    latest && latest.status === 'draft'
      ? await updateApplicationDraft({
          applicationId: latest.id,
          tenantId: tenantContext.tenantId,
          currentStep,
          data: payload,
        })
      : await createApplicationDraft({
          tenantId: tenantContext.tenantId,
          userId: tenantContext.userId,
          applicantType: resolveApplicantType(tenantContext.role),
          currentStep,
          data: payload,
        })

  await writeAuditEvent({
    tenantId: tenantContext.tenantId,
    actorUserId: tenantContext.userId,
    actorRole: tenantContext.role,
    eventType:
      latest && latest.status === 'draft'
        ? 'application.draft_updated'
        : 'application.draft_created',
    resourceType: 'application',
    resourceId: String(record.id),
    metadata: {
      currentStep,
      status: record.status,
    },
  })

  revalidateApplicationPaths()

  if (currentStep === 'review') {
    redirect('/dashboard/application/review?saved=1')
  }

  redirect('/dashboard/application?saved=1')
}

export async function submitApplicationAction() {
  const tenantContext = await requireTenantMember()
  await requirePermission('application:submit')

  if (!isDatabaseEnabled()) {
    redirectWithNotice(
      '/dashboard/application/review',
      'Database-backed submission is disabled in this environment.',
    )
  }

  const latest = await getLatestApplicationForTenantUser(
    tenantContext.tenantId,
    tenantContext.userId,
  )

  if (!latest) {
    redirectWithNotice(
      '/dashboard/application',
      'Create a draft application before submitting it for review.',
    )
  }

  const record =
    latest.status === 'submitted'
      ? latest
      : await submitApplication({
          applicationId: latest.id,
          tenantId: tenantContext.tenantId,
        })

  await writeAuditEvent({
    tenantId: tenantContext.tenantId,
    actorUserId: tenantContext.userId,
    actorRole: tenantContext.role,
    eventType: 'application.submitted',
    resourceType: 'application',
    resourceId: String(record.id),
    metadata: {
      status: record.status,
    },
  })

  revalidateApplicationPaths()
  redirect('/dashboard/application/review?submitted=1')
}

export async function updateApplicationStatusAction(formData: FormData) {
  const internalContext = await requireInternalRole([
    'platform_admin',
    'internal_ops_admin',
    'internal_reviewer',
  ])
  await requirePermission('application:change_status')

  if (!isDatabaseEnabled()) {
    redirectWithNotice(
      '/dashboard/admin/applications',
      'Database-backed status changes are disabled in this environment.',
    )
  }

  const applicationId = Number.parseInt(readText(formData, 'applicationId', 20), 10)
  const nextStatus = readText(formData, 'nextStatus', 40)

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    redirectWithNotice(
      '/dashboard/admin/applications',
      'A valid application ID is required for status updates.',
    )
  }

  if (!isReviewableStatus(nextStatus)) {
    redirectWithNotice(
      '/dashboard/admin/applications',
      'Choose a valid review status.',
    )
  }

  const updated = await updateApplicationStatus({
    applicationId,
    nextStatus,
  })

  if (!updated) {
    redirectWithNotice(
      '/dashboard/admin/applications',
      'The selected application no longer exists.',
    )
  }

  await writeAuditEvent({
    tenantId: updated.tenantId,
    actorUserId: internalContext.userId,
    actorRole: internalContext.role,
    eventType: 'application.status_changed',
    resourceType: 'application',
    resourceId: String(updated.id),
    metadata: {
      nextStatus: updated.status,
      currentStep: updated.currentStep,
    },
  })

  revalidateApplicationPaths()
  redirect(
    `/dashboard/admin/applications?statusUpdated=${encodeURIComponent(updated.status)}`,
  )
}
