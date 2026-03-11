import {
  assertTenantAccess,
  AuthzError,
  requirePermission,
  requireTenantMember,
} from '@/lib/authz'

export async function GET(request: Request) {
  try {
    const tenantContext = await requireTenantMember()
    const permissionContext = await requirePermission('application:view_own')

    const { searchParams } = new URL(request.url)
    const recordTenantId = searchParams.get('recordTenantId')

    if (recordTenantId) {
      await assertTenantAccess(recordTenantId)
    }

    return Response.json(
      {
        ok: true,
        scope: 'tenant',
        userId: tenantContext.userId,
        tenantId: tenantContext.tenantId,
        role: permissionContext.role,
      },
      { status: 200 },
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