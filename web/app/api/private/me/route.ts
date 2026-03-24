import {
  requireInternalRole,
  requireSignedIn,
  requireTenantMember,
} from '@/lib/authz'
import {
  jsonResponse,
  mapAuthzError,
  withObservedRoute,
} from '@/lib/observability/http'

export const GET = withObservedRoute(
  'api.private.me.get',
  async (_request, ctx) => {
    const signedIn = await requireSignedIn()

    try {
      const tenantUser = await requireTenantMember()

      return jsonResponse(
        ctx,
        200,
        {
          ok: true,
          scope: 'tenant',
          userId: tenantUser.userId,
          tenantId: tenantUser.tenantId,
          role: tenantUser.role,
        },
      )
    } catch (error) {
      const mapped = mapAuthzError(error)
      if (!mapped || mapped.status === 401) {
        throw error
      }
    }

    try {
      const internalUser = await requireInternalRole([
        'platform_admin',
        'internal_ops_admin',
        'internal_reviewer',
        'read_only_auditor',
      ])

      return jsonResponse(
        ctx,
        200,
        {
          ok: true,
          scope: 'internal',
          userId: internalUser.userId,
          tenantId: internalUser.tenantId,
          role: internalUser.role,
        },
      )
    } catch (error) {
      const mapped = mapAuthzError(error)
      if (!mapped || mapped.status === 401) {
        throw error
      }
    }

    return jsonResponse(
      ctx,
      403,
      {
        ok: false,
        code: 'NOT_ALLOWED',
        message:
          'Signed-in user is authenticated but has neither tenant access nor an approved internal role.',
        userId: signedIn.userId,
        tenantId: signedIn.tenantId,
        role: signedIn.role,
      },
    )
  },
  { mapError: mapAuthzError },
)
