import {
  AuthzError,
  requireInternalRole,
  requireSignedIn,
  requireTenantMember,
} from '@/lib/authz'

export async function GET() {
  try {
    const signedIn = await requireSignedIn()

    try {
      const tenantUser = await requireTenantMember()

      return Response.json(
        {
          ok: true,
          scope: 'tenant',
          userId: tenantUser.userId,
          tenantId: tenantUser.tenantId,
          role: tenantUser.role,
        },
        { status: 200 },
      )
    } catch (error) {
      if (!(error instanceof AuthzError) || error.status === 401) {
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

      return Response.json(
        {
          ok: true,
          scope: 'internal',
          userId: internalUser.userId,
          tenantId: internalUser.tenantId,
          role: internalUser.role,
        },
        { status: 200 },
      )
    } catch (error) {
      if (!(error instanceof AuthzError) || error.status === 401) {
        throw error
      }
    }

    return Response.json(
      {
        ok: false,
        code: 'NOT_ALLOWED',
        message:
          'Signed-in user is authenticated but has neither tenant access nor an approved internal role.',
        userId: signedIn.userId,
        tenantId: signedIn.tenantId,
        role: signedIn.role,
      },
      { status: 403 },
    )
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