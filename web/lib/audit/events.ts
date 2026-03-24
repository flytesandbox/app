import 'server-only'

import type { ResultSetHeader, RowDataPacket } from 'mysql2'

import { isDatabaseEnabled } from '@/lib/db/config'
import { dbExecute } from '@/lib/db/query'

type JsonPrimitive = boolean | number | string | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type AuditEventInput = {
  tenantId: string | null
  actorUserId: string | null
  actorRole: string | null
  eventType: string
  resourceType: string
  resourceId?: string | null
  metadata?: Record<string, unknown> | null
}

export type AuditWriteResult = {
  written: boolean
  skipped: boolean
  auditEventId: number | null
}

export type AuditEventRecord = {
  id: number
  tenantId: string | null
  actorUserId: string | null
  actorRole: string | null
  eventType: string
  resourceType: string
  resourceId: string | null
  metadata: JsonValue | null
  createdAt: string
}

type AuditEventRow = RowDataPacket & {
  id: number
  tenant_id: string | null
  actor_user_id: string | null
  actor_role: string | null
  event_type: string
  resource_type: string
  resource_id: string | null
  metadata_json: string | null
  created_at: string | Date
}

function sanitizeString(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength)
}

function sanitizeNullableId(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (!value) {
    return null
  }

  const sanitized = sanitizeString(value, maxLength)
  return sanitized || null
}

function sanitizeJsonValue(value: unknown, depth = 0): JsonValue | undefined {
  if (value === null) {
    return null
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    return value.slice(0, 200)
  }

  if (depth >= 3) {
    return '[truncated]'
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 10)
      .map((entry) => sanitizeJsonValue(entry, depth + 1))
      .filter((entry): entry is JsonValue => entry !== undefined)
  }

  if (typeof value === 'object') {
    const output: Record<string, JsonValue> = {}

    for (const [key, entry] of Object.entries(value).slice(0, 20)) {
      const sanitizedEntry = sanitizeJsonValue(entry, depth + 1)
      if (sanitizedEntry !== undefined) {
        output[key] = sanitizedEntry
      }
    }

    return output
  }

  return String(value)
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): JsonValue | null {
  if (!metadata) {
    return null
  }

  const sanitized = sanitizeJsonValue(metadata)

  if (!sanitized || Array.isArray(sanitized) || typeof sanitized !== 'object') {
    return null
  }

  return sanitized
}

function parseMetadataJson(value: string | null): JsonValue | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as JsonValue
  } catch {
    return null
  }
}

export async function writeAuditEvent(
  input: AuditEventInput,
): Promise<AuditWriteResult> {
  if (!isDatabaseEnabled()) {
    return {
      written: false,
      skipped: true,
      auditEventId: null,
    }
  }

  const tenantId = sanitizeNullableId(input.tenantId, 191)
  const actorUserId = sanitizeNullableId(input.actorUserId, 191)
  const actorRole = sanitizeNullableId(input.actorRole, 100)
  const eventType = sanitizeString(input.eventType, 100)
  const resourceType = sanitizeString(input.resourceType, 100)
  const resourceId = sanitizeNullableId(input.resourceId, 191)
  const metadata = sanitizeMetadata(input.metadata)

  const [result] = await dbExecute<ResultSetHeader>(
    `
      INSERT INTO audit_events (
        tenant_id,
        actor_user_id,
        actor_role,
        event_type,
        resource_type,
        resource_id,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      tenantId,
      actorUserId,
      actorRole,
      eventType,
      resourceType,
      resourceId,
      metadata ? JSON.stringify(metadata) : null,
    ],
  )

  return {
    written: true,
    skipped: false,
    auditEventId: result.insertId ? Number(result.insertId) : null,
  }
}

export async function listRecentAuditEvents(
  limit = 20,
): Promise<AuditEventRecord[]> {
  if (!isDatabaseEnabled()) {
    return []
  }

  const boundedLimit = Math.max(1, Math.min(limit, 100))
  const [rows] = await dbExecute<AuditEventRow[]>(
    `
      SELECT
        id,
        tenant_id,
        actor_user_id,
        actor_role,
        event_type,
        resource_type,
        resource_id,
        metadata_json,
        created_at
      FROM audit_events
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [boundedLimit],
  )

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    eventType: row.event_type,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    metadata: parseMetadataJson(row.metadata_json),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  }))
}
