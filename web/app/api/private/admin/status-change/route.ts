import { writeAuditEvent } from '@/lib/audit/events'
import {
  APPLICATION_STATUSES,
  getApplicationStatusLabel,
  getApplicationStepLabel,
  updateApplicationStatus,
  type ApplicationStatus,
} from '@/lib/applications'
import { requireInternalRole, requirePermission } from '@/lib/authz'
import { isDatabaseEnabled } from '@/lib/db/config'
import {
  jsonResponse,
  logObservedEvent,
  mapAuthzError,
  withObservedRoute,
} from '@/lib/observability/http'

const REVIEWABLE_STATUSES = new Set<ApplicationStatus>(
  APPLICATION_STATUSES.filter((status) => status !== 'draft'),
)

function readOptionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export const POST = withObservedRoute(
  'api.private.admin.status-change.post',
  async (request, ctx) => {
    const internalContext = await requireInternalRole([
      'platform_admin',
      'internal_ops_admin',
      'internal_reviewer',
      'read_only_auditor',
    ])

    await requirePermission('application:change_status')

    if (!isDatabaseEnabled()) {
      return jsonResponse(ctx, 503, {
        ok: false,
        code: 'DB_DISABLED',
        message: 'Status changes require DATABASE_ENABLED=true.',
      })
    }

    let applicationId: string | null = null
    let nextStatus: string | null = null
    const rawBody = await request.text()

    if (rawBody.trim()) {
      let parsedBody: unknown

      try {
        parsedBody = JSON.parse(rawBody)
      } catch {
        return jsonResponse(ctx, 400, {
          ok: false,
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON when provided.',
        })
      }

      if (parsedBody && typeof parsedBody === 'object') {
        const body = parsedBody as Record<string, unknown>
        applicationId = readOptionalString(body.applicationId, 191)
        nextStatus = readOptionalString(body.nextStatus, 100)
      }
    }

    const parsedApplicationId = applicationId
      ? Number.parseInt(applicationId, 10)
      : Number.NaN

    if (!Number.isInteger(parsedApplicationId) || parsedApplicationId <= 0) {
      return jsonResponse(ctx, 400, {
        ok: false,
        code: 'INVALID_APPLICATION_ID',
        message: 'applicationId must be a positive integer.',
      })
    }

    if (
      !nextStatus ||
      !REVIEWABLE_STATUSES.has(nextStatus as ApplicationStatus)
    ) {
      return jsonResponse(ctx, 400, {
        ok: false,
        code: 'INVALID_NEXT_STATUS',
        message: 'nextStatus must be a valid reviewable application status.',
      })
    }

    const updated = await updateApplicationStatus({
      applicationId: parsedApplicationId,
      nextStatus: nextStatus as Exclude<ApplicationStatus, 'draft'>,
    })

    if (!updated) {
      return jsonResponse(ctx, 404, {
        ok: false,
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application was not found.',
      })
    }

    const auditResult = await writeAuditEvent({
      tenantId: updated.tenantId,
      actorUserId: internalContext.userId,
      actorRole: internalContext.role,
      eventType: 'application.status_changed',
      resourceType: 'application',
      resourceId: String(updated.id),
      metadata: {
        requestId: ctx.requestId,
        nextStatus: updated.status,
        routeId: ctx.routeId,
        currentStep: updated.currentStep,
        outcome: 'mutation_applied',
      },
    })

    if (auditResult.skipped) {
      logObservedEvent('info', 'audit.write.skipped', ctx, {
        eventType: 'application.status_changed',
        reason: 'database_disabled',
      })
    } else {
      logObservedEvent('info', 'audit.write.succeeded', ctx, {
        eventType: 'application.status_changed',
        auditEventId: auditResult.auditEventId,
      })
    }

    return jsonResponse(
      ctx,
      200,
      {
        ok: true,
        mutated: true,
        userId: internalContext.userId,
        role: internalContext.role,
        application: {
          id: updated.id,
          tenantId: updated.tenantId,
          status: updated.status,
          statusLabel: getApplicationStatusLabel(updated.status),
          currentStep: updated.currentStep,
          currentStepLabel: getApplicationStepLabel(updated.currentStep),
          updatedAt: updated.updatedAt,
        },
        audit: auditResult.written ? 'written' : 'skipped',
        auditEventId: auditResult.auditEventId,
      },
    )
  },
  { mapError: mapAuthzError },
)
