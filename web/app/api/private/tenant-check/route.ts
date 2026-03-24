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
  'api.private.tenant-check.get',
  async (_request, ctx) => {
    const signedInContext = await requireSignedIn()

    try {
      const tenantContext = await requireTenantMember()

      return jsonResponse(
        ctx,
        200,
        {
          ok: true,
          scope: 'tenant',
          userId: tenantContext.userId,
          tenantId: tenantContext.tenantId,
          role: tenantContext.role,
        },
      )
    } catch (error) {
      const mapped = mapAuthzError(error)
      if (!mapped) {
        throw error
      }

      if (mapped.status === 401) {
        return jsonResponse(ctx, mapped.status, mapped.body)
      }
    }

    try {
      const internalContext = await requireInternalRole([
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
          userId: internalContext.userId,
          role: internalContext.role,
        },
      )
    } catch (error) {
      const mapped = mapAuthzError(error)
      if (!mapped) {
        throw error
      }

      return jsonResponse(
        ctx,
        403,
        {
          ok: false,
          code: 'NOT_ALLOWED',
          message:
            'Signed-in user is not allowed. Active tenant context or internal role is required.',
          userId: signedInContext.userId,
        },
      )
    }
  },
  { mapError: mapAuthzError },
)
