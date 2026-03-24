import {
  getApplicationStatusLabel,
  getApplicationStepLabel,
  getApplicationTitle,
  getLatestApplicationForTenantUser,
} from '@/lib/applications'
import {
  assertTenantAccess,
  requirePermission,
  requireTenantMember,
} from '@/lib/authz'
import { isDatabaseEnabled } from '@/lib/db/config'
import {
  jsonResponse,
  mapAuthzError,
  withObservedRoute,
} from '@/lib/observability/http'

export const GET = withObservedRoute(
  'api.private.application.get',
  async (request, ctx) => {
    const tenantContext = await requireTenantMember()
    const permissionContext = await requirePermission('application:view_own')

    const { searchParams } = new URL(request.url)
    const recordTenantId = searchParams.get('recordTenantId')

    if (recordTenantId) {
      await assertTenantAccess(recordTenantId)
    }

    if (!isDatabaseEnabled()) {
      return jsonResponse(ctx, 200, {
        ok: true,
        scope: 'tenant',
        mode: 'preview',
        userId: tenantContext.userId,
        tenantId: tenantContext.tenantId,
        role: permissionContext.role,
        application: null,
      })
    }

    const latestApplication = await getLatestApplicationForTenantUser(
      tenantContext.tenantId,
      tenantContext.userId,
    )

    return jsonResponse(
      ctx,
      200,
      {
        ok: true,
        scope: 'tenant',
        mode: 'live',
        userId: tenantContext.userId,
        tenantId: tenantContext.tenantId,
        role: permissionContext.role,
        application: latestApplication
          ? {
              id: latestApplication.id,
              title: getApplicationTitle(latestApplication),
              status: latestApplication.status,
              statusLabel: getApplicationStatusLabel(latestApplication.status),
              currentStep: latestApplication.currentStep,
              currentStepLabel: getApplicationStepLabel(
                latestApplication.currentStep,
              ),
              submittedAt: latestApplication.submittedAt,
              updatedAt: latestApplication.updatedAt,
              data: latestApplication.data,
            }
          : null,
      },
    )
  },
  { mapError: mapAuthzError },
)
