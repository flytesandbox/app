import {
  AuthzError,
  requireInternalRole,
  requireSignedIn,
  requireTenantMember,
} from '@/lib/authz'

export async function GET() {
  try {
    const signedInContext = await requireSignedIn()

    try {
      const tenantContext = await requireTenantMember()

      return Response.json(
        {
          ok: true,
          scope: 'tenant',
          userId: tenantContext.userId,
          tenantId: tenantContext.tenantId,
          role: tenantContext.role,
        },
        { status: 200 },
      )
    } catch (error) {
      if (!(error instanceof AuthzError)) {
        throw error
      }

      if (error.status === 401) {
        return Response.json(
          { ok: false, code: error.code, message: error.message },
          { status: 401 },
        )
      }
    }

    try {
      const internalContext = await requireInternalRole([
        'platform_admin',
        'internal_ops_admin',
        'internal_reviewer',
        'read_only_auditor',
      ])

      return Response.json(
        {
          ok: true,
          scope: 'internal',
          userId: internalContext.userId,
          role: internalContext.role,
        },
        { status: 200 },
      )
    } catch (error) {
      if (!(error instanceof AuthzError)) {
        throw error
      }

      return Response.json(
        {
          ok: false,
          code: 'NOT_ALLOWED',
          message:
            'Signed-in user is not allowed. Active tenant context or internal role is required.',
          userId: signedInContext.userId,
        },
        { status: 403 },
      )
    }
  } catch (error) {
    if (error instanceof AuthzError) {
      return Response.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      )
    }

    throw error
  }
}