import {
  getApplicationStatusLabel,
  getApplicationStepLabel,
  getApplicationTitle,
  listRecentApplications,
} from '@/lib/applications'
import { requireInternalRole, requirePermission } from '@/lib/authz'
import { isDatabaseEnabled } from '@/lib/db/config'
import {
  jsonResponse,
  mapAuthzError,
  withObservedRoute,
} from '@/lib/observability/http'

export const GET = withObservedRoute(
  'api.private.admin.applications.get',
  async (_request, ctx) => {
    const internalContext = await requireInternalRole([
      'platform_admin',
      'internal_ops_admin',
      'internal_reviewer',
      'read_only_auditor',
    ])

    await requirePermission('application:view_all')

    if (!isDatabaseEnabled()) {
      return jsonResponse(
        ctx,
        200,
        {
          ok: true,
          scope: 'internal',
          mode: 'preview',
          userId: internalContext.userId,
          role: internalContext.role,
          count: 0,
          applications: [],
        },
      )
    }

    const applications = await listRecentApplications(12)

    return jsonResponse(
      ctx,
      200,
      {
        ok: true,
        scope: 'internal',
        mode: 'live',
        userId: internalContext.userId,
        role: internalContext.role,
        count: applications.length,
        applications: applications.map((application) => ({
          id: application.id,
          title: getApplicationTitle(application),
          tenantId: application.tenantId,
          createdByUserId: application.createdByUserId,
          applicantType: application.applicantType,
          status: application.status,
          statusLabel: getApplicationStatusLabel(application.status),
          currentStep: application.currentStep,
          currentStepLabel: getApplicationStepLabel(application.currentStep),
          submittedAt: application.submittedAt,
          updatedAt: application.updatedAt,
        })),
      },
    )
  },
  { mapError: mapAuthzError },
)
