import 'server-only'

import type { ResultSetHeader, RowDataPacket } from 'mysql2'

import { isDatabaseEnabled } from '@/lib/db/config'
import { dbExecute } from '@/lib/db/query'

export const APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'in_review',
  'changes_requested',
  'approved',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export type ApplicationFormData = {
  companyName: string
  contactName: string
  contactEmail: string
  employeeCountBand: string
  coverageStartMonth: string
  planReadiness: string
  notes: string
}

export type ApplicationRecord = {
  id: number
  tenantId: string
  createdByUserId: string
  applicantType: string
  status: ApplicationStatus
  currentStep: string
  data: ApplicationFormData
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

type ApplicationRow = RowDataPacket & {
  id: number
  tenant_id: string
  created_by_user_id: string
  applicant_type: string
  status: string
  current_step: string
  data_json: string | ApplicationFormData | null
  submitted_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

export const EMPTY_APPLICATION_FORM: ApplicationFormData = {
  companyName: '',
  contactName: '',
  contactEmail: '',
  employeeCountBand: '',
  coverageStartMonth: '',
  planReadiness: '',
  notes: '',
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: 'Draft in progress',
  submitted: 'Submitted for review',
  in_review: 'Internal review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
}

const STEP_LABELS: Record<string, string> = {
  company_profile: 'Company profile',
  review: 'Review and confirm',
  submitted: 'Awaiting internal review',
  internal_review: 'Internal review',
  changes_requested: 'Needs updates',
  approved: 'Ready for handoff',
}

function normalizeDate(value: string | Date | null): string | null {
  if (!value) {
    return null
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, maxLength)
}

function sanitizeEmail(value: unknown): string {
  const email = sanitizeText(value, 191)
  return email.toLowerCase()
}

export function sanitizeApplicationFormData(
  value: Partial<ApplicationFormData> | null | undefined,
): ApplicationFormData {
  return {
    companyName: sanitizeText(value?.companyName, 120),
    contactName: sanitizeText(value?.contactName, 120),
    contactEmail: sanitizeEmail(value?.contactEmail),
    employeeCountBand: sanitizeText(value?.employeeCountBand, 60),
    coverageStartMonth: sanitizeText(value?.coverageStartMonth, 30),
    planReadiness: sanitizeText(value?.planReadiness, 60),
    notes: sanitizeText(value?.notes, 2000),
  }
}

function parseApplicationStatus(value: string): ApplicationStatus {
  if ((APPLICATION_STATUSES as readonly string[]).includes(value)) {
    return value as ApplicationStatus
  }

  return 'draft'
}

function parseStoredApplicationData(
  value: ApplicationRow['data_json'],
): ApplicationFormData {
  if (!value) {
    return EMPTY_APPLICATION_FORM
  }

  if (typeof value === 'string') {
    try {
      return sanitizeApplicationFormData(JSON.parse(value) as ApplicationFormData)
    } catch {
      return EMPTY_APPLICATION_FORM
    }
  }

  return sanitizeApplicationFormData(value)
}

function mapRow(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    createdByUserId: row.created_by_user_id,
    applicantType: row.applicant_type,
    status: parseApplicationStatus(row.status),
    currentStep: row.current_step,
    data: parseStoredApplicationData(row.data_json),
    submittedAt: normalizeDate(row.submitted_at),
    createdAt: normalizeDate(row.created_at) ?? new Date().toISOString(),
    updatedAt: normalizeDate(row.updated_at) ?? new Date().toISOString(),
  }
}

function requireDatabaseEnabled() {
  if (!isDatabaseEnabled()) {
    throw new Error('Database-backed application flows require DATABASE_ENABLED=true.')
  }
}

async function getApplicationById(id: number): Promise<ApplicationRecord | null> {
  const [rows] = await dbExecute<ApplicationRow[]>(
    `
      SELECT
        id,
        tenant_id,
        created_by_user_id,
        applicant_type,
        status,
        current_step,
        data_json,
        submitted_at,
        created_at,
        updated_at
      FROM applications
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )

  return rows[0] ? mapRow(rows[0]) : null
}

export async function getLatestApplicationForTenantUser(
  tenantId: string,
  userId: string,
): Promise<ApplicationRecord | null> {
  requireDatabaseEnabled()

  const [rows] = await dbExecute<ApplicationRow[]>(
    `
      SELECT
        id,
        tenant_id,
        created_by_user_id,
        applicant_type,
        status,
        current_step,
        data_json,
        submitted_at,
        created_at,
        updated_at
      FROM applications
      WHERE tenant_id = ? AND created_by_user_id = ?
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `,
    [tenantId, userId],
  )

  return rows[0] ? mapRow(rows[0]) : null
}

export async function listRecentApplications(
  limit = 8,
): Promise<ApplicationRecord[]> {
  requireDatabaseEnabled()

  const boundedLimit = Math.max(1, Math.min(limit, 50))
  const [rows] = await dbExecute<ApplicationRow[]>(
    `
      SELECT
        id,
        tenant_id,
        created_by_user_id,
        applicant_type,
        status,
        current_step,
        data_json,
        submitted_at,
        created_at,
        updated_at
      FROM applications
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
    `,
    [boundedLimit],
  )

  return rows.map(mapRow)
}

export async function createApplicationDraft(input: {
  tenantId: string
  userId: string
  applicantType: string
  currentStep: string
  data: Partial<ApplicationFormData>
}): Promise<ApplicationRecord> {
  requireDatabaseEnabled()

  const [result] = await dbExecute<ResultSetHeader>(
    `
      INSERT INTO applications (
        tenant_id,
        created_by_user_id,
        applicant_type,
        status,
        current_step,
        data_json
      )
      VALUES (?, ?, ?, 'draft', ?, ?)
    `,
    [
      input.tenantId,
      input.userId,
      input.applicantType,
      input.currentStep,
      JSON.stringify(sanitizeApplicationFormData(input.data)),
    ],
  )

  return (await getApplicationById(Number(result.insertId))) as ApplicationRecord
}

export async function updateApplicationDraft(input: {
  applicationId: number
  tenantId: string
  currentStep: string
  data: Partial<ApplicationFormData>
}): Promise<ApplicationRecord> {
  requireDatabaseEnabled()

  await dbExecute<ResultSetHeader>(
    `
      UPDATE applications
      SET
        status = 'draft',
        current_step = ?,
        data_json = ?,
        submitted_at = NULL
      WHERE id = ? AND tenant_id = ?
      LIMIT 1
    `,
    [
      input.currentStep,
      JSON.stringify(sanitizeApplicationFormData(input.data)),
      input.applicationId,
      input.tenantId,
    ],
  )

  return (await getApplicationById(input.applicationId)) as ApplicationRecord
}

export async function submitApplication(input: {
  applicationId: number
  tenantId: string
}): Promise<ApplicationRecord> {
  requireDatabaseEnabled()

  await dbExecute<ResultSetHeader>(
    `
      UPDATE applications
      SET
        status = 'submitted',
        current_step = 'submitted',
        submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP(3))
      WHERE id = ? AND tenant_id = ?
      LIMIT 1
    `,
    [input.applicationId, input.tenantId],
  )

  return (await getApplicationById(input.applicationId)) as ApplicationRecord
}

export async function updateApplicationStatus(input: {
  applicationId: number
  nextStatus: Exclude<ApplicationStatus, 'draft'>
}): Promise<ApplicationRecord | null> {
  requireDatabaseEnabled()

  const nextStep =
    input.nextStatus === 'submitted'
      ? 'submitted'
      : input.nextStatus === 'in_review'
        ? 'internal_review'
        : input.nextStatus === 'changes_requested'
          ? 'changes_requested'
          : 'approved'

  await dbExecute<ResultSetHeader>(
    `
      UPDATE applications
      SET
        status = ?,
        current_step = ?,
        submitted_at = CASE
          WHEN ? = 'submitted' THEN COALESCE(submitted_at, CURRENT_TIMESTAMP(3))
          ELSE submitted_at
        END
      WHERE id = ?
      LIMIT 1
    `,
    [input.nextStatus, nextStep, input.nextStatus, input.applicationId],
  )

  return getApplicationById(input.applicationId)
}

export function getApplicationStatusLabel(status: ApplicationStatus): string {
  return STATUS_LABELS[status]
}

export function getApplicationStepLabel(step: string): string {
  return STEP_LABELS[step] ?? step.replace(/_/g, ' ')
}

export function getApplicationTitle(record: Pick<ApplicationRecord, 'data' | 'applicantType'>): string {
  if (record.data.companyName) {
    return record.data.companyName
  }

  return `${record.applicantType[0]?.toUpperCase() ?? 'A'}${record.applicantType.slice(1)} application`
}
