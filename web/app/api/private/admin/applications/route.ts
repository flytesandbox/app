import { AuthzError, requireInternalRole, requirePermission } from '@/lib/authz'

export async function GET() {
  try {
    const internalContext = await requireInternalRole([
      'platform_admin',
      'internal_ops_admin',
      'internal_reviewer',
      'read_only_auditor',
    ])

    await requirePermission('application:view_all')

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
    if (error instanceof AuthzError) {
      return Response.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      )
    }

    throw error
  }
}