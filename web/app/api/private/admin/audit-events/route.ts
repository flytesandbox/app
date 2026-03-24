import { listRecentAuditEvents } from '@/lib/audit/events'
import { requireInternalRole, requirePermission } from '@/lib/authz'
import { isDatabaseEnabled } from '@/lib/db/config'
import {
  jsonResponse,
  logObservedEvent,
  mapAuthzError,
  withObservedRoute,
} from '@/lib/observability/http'

function readLimit(searchParams: URLSearchParams): number | null {
  const raw = searchParams.get('limit')

  if (!raw) {
    return 20
  }

  const parsed = Number.parseInt(raw, 10)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }

  return Math.min(parsed, 100)
}

export const GET = withObservedRoute(
  'api.private.admin.audit-events.get',
  async (request, observation) => {
    const internalContext = await requireInternalRole([
      'platform_admin',
      'internal_ops_admin',
      'read_only_auditor',
    ])

    await requirePermission('audit:view')

    if (!isDatabaseEnabled()) {
      logObservedEvent('warn', 'audit.query.skipped', observation, {
        reason: 'database_disabled',
      })

      return jsonResponse(observation, 503, {
        ok: false,
        code: 'AUDIT_DB_DISABLED',
        message: 'Audit event query requires DATABASE_ENABLED=true.',
      })
    }

    const { searchParams } = new URL(request.url)
    const limit = readLimit(searchParams)

    if (limit === null) {
      return jsonResponse(observation, 400, {
        ok: false,
        code: 'INVALID_LIMIT',
        message: 'limit must be a positive integer.',
      })
    }

    const events = await listRecentAuditEvents(limit)

    return jsonResponse(observation, 200, {
      ok: true,
      userId: internalContext.userId,
      role: internalContext.role,
      count: events.length,
      events,
    })
  },
  { mapError: mapAuthzError },
)
