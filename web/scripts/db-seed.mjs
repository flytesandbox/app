import process from 'node:process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import nextEnv from '@next/env'
import mysql from 'mysql2/promise'

const { loadEnvConfig } = nextEnv

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

loadEnvConfig(projectRoot)

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function readBoolean(name, defaultValue = false) {
  const value = process.env[name]?.trim().toLowerCase()

  if (!value) return defaultValue
  if (['1', 'true', 'yes', 'on'].includes(value)) return true
  if (['0', 'false', 'no', 'off'].includes(value)) return false

  throw new Error(
    `${name} must be one of: true/false, 1/0, yes/no, on/off`,
  )
}

function getLocalDatabaseUrl() {
  const enabled = readBoolean('DATABASE_ENABLED', false)

  if (!enabled) {
    throw new Error(
      'DATABASE_ENABLED=false. Refusing to run local seed script against a disabled database.',
    )
  }

  const databaseUrl = requireEnv('DATABASE_URL')
  const parsed = new URL(databaseUrl)

  if (parsed.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL must use mysql://')
  }

  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Refusing to seed non-local database host "${parsed.hostname}". This script is local-only.`,
    )
  }

  return databaseUrl
}

async function main() {
  const databaseUrl = getLocalDatabaseUrl()

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    multipleStatements: false,
  })

  const fakeEmployerTenantId = 'tenant_fake_employer_001'
  const fakeAdvisorTenantId = 'tenant_fake_advisor_001'

  const fakeDraftApplicationId = 1001
  const fakeSubmittedApplicationId = 1002
  const fakeAuditEventId = 9001

  try {
    await connection.beginTransaction()

    // Clean up deterministic seed rows first so the script is idempotent.
    await connection.query(
      'DELETE FROM audit_events WHERE id = ?',
      [fakeAuditEventId],
    )

    await connection.query(
      'DELETE FROM application_uploads WHERE application_id IN (?, ?)',
      [fakeDraftApplicationId, fakeSubmittedApplicationId],
    )

    await connection.query(
      'DELETE FROM applications WHERE id IN (?, ?)',
      [fakeDraftApplicationId, fakeSubmittedApplicationId],
    )

    await connection.query(
      `
        INSERT INTO applications (
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
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      `,
      [
        fakeDraftApplicationId,
        fakeEmployerTenantId,
        'user_fake_employer_owner_001',
        'employer',
        'draft',
        'business_profile',
        JSON.stringify({
          seed_label: 'local_fake_draft_application',
          company_display_name: 'Fake Employer Co',
          contact_display_name: 'Test Contact',
          employee_count_band: '1-24',
          notes: 'Fake local-only seed record. No PHI.',
        }),
        null,
      ],
    )

    await connection.query(
      `
        INSERT INTO applications (
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
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      `,
      [
        fakeSubmittedApplicationId,
        fakeEmployerTenantId,
        'user_fake_employer_owner_001',
        'employer',
        'submitted',
        'review_pending',
        JSON.stringify({
          seed_label: 'local_fake_submitted_application',
          company_display_name: 'Fake Employer Co',
          submission_channel: 'local_seed',
          checklist_complete: true,
          notes: 'Fake local-only submitted record. No PHI.',
        }),
      ],
    )

    await connection.query(
      `
        INSERT INTO audit_events (
          id,
          tenant_id,
          actor_user_id,
          actor_role,
          event_type,
          resource_type,
          resource_id,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
      `,
      [
        fakeAuditEventId,
        fakeAdvisorTenantId,
        'user_fake_advisor_owner_001',
        'advisor_admin',
        'seed.local.audit_event_created',
        'application',
        String(fakeSubmittedApplicationId),
        JSON.stringify({
          seed_label: 'local_fake_audit_event',
          related_employer_tenant_id: fakeEmployerTenantId,
          related_advisor_tenant_id: fakeAdvisorTenantId,
          description: 'Local-only fake audit event for Phase 6 seed validation.',
        }),
      ],
    )

    await connection.commit()

    console.log('Local seed complete.')
    console.log(`Fake employer tenant id: ${fakeEmployerTenantId}`)
    console.log(`Fake advisor tenant id: ${fakeAdvisorTenantId}`)
    console.log(`Fake draft application id: ${fakeDraftApplicationId}`)
    console.log(`Fake submitted application id: ${fakeSubmittedApplicationId}`)
    console.log(`Fake audit event id: ${fakeAuditEventId}`)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error('Local seed failed.')
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})