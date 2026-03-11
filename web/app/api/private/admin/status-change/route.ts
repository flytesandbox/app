import { AuthzError, requireInternalRole, requirePermission } from '@/lib/authz'

export async function POST() {
  try {
    const internalContext = await requireInternalRole([
      'platform_admin',
      'internal_ops_admin',
      'internal_reviewer',
      'read_only_auditor',
    ])

    await requirePermission('application:change_status')

    return Response.json(
      {
        ok: true,
        mutated: true,
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