import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'

import {
  hasPermission as roleHasPermission,
  isRole,
  type Permission,
  type Role,
} from '@/lib/permissions'
import {
  getTestAuthContext,
  isPhase5TestAuthEnabled,
  parseTestAuthScenario,
} from '@/lib/test-auth'

const INTERNAL_ROLES = [
  'platform_admin',
  'internal_ops_admin',
  'internal_reviewer',
  'read_only_auditor',
] as const

const EXTERNAL_ROLES = [
  'employer_admin',
  'employer_member',
  'individual_member',
  'advisor_admin',
  'advisor_member',
] as const

type InternalRole = (typeof INTERNAL_ROLES)[number]
type ExternalRole = (typeof EXTERNAL_ROLES)[number]
type ClerkAuthState = Awaited<ReturnType<typeof auth>>
type ClerkHas = ClerkAuthState['has']
type ClerkOrgRole = ClerkAuthState['orgRole']
type SessionClaimsLike = Record<string, unknown> | null | undefined

export class AuthzError extends Error {
  readonly status: 401 | 403
  readonly code: string

  constructor(status: 401 | 403, code: string, message: string) {
    super(message)
    this.name = 'AuthzError'
    this.status = status
    this.code = code
  }
}

function unauthenticated(message = 'Authentication required'): never {
  throw new AuthzError(401, 'UNAUTHENTICATED', message)
}

function forbidden(code: string, message: string): never {
  throw new AuthzError(403, code, message)
}

function isInternalRole(role: Role | null): role is InternalRole {
  return role !== null && INTERNAL_ROLES.includes(role as InternalRole)
}

function isExternalRole(role: Role | null): role is ExternalRole {
  return role !== null && EXTERNAL_ROLES.includes(role as ExternalRole)
}

function normalizeRole(value: unknown): Role | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (isRole(trimmed)) {
    return trimmed
  }

  if (trimmed.startsWith('org:')) {
    const stripped = trimmed.slice(4)
    if (isRole(stripped)) {
      return stripped
    }
  }

  return null
}

function getNestedValue(
  source: SessionClaimsLike,
  path: readonly string[],
): unknown {
  let current: unknown = source

  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    current = (current as Record<string, unknown>)[key]
  }

  return current
}

function resolveRoleFromClaims(
  orgRole: ClerkOrgRole | null | undefined,
  sessionClaims: SessionClaimsLike,
): Role | null {
  const candidates: unknown[] = [
    orgRole,
    getNestedValue(sessionClaims, ['metadata', 'role']),
    getNestedValue(sessionClaims, ['public_metadata', 'role']),
    getNestedValue(sessionClaims, ['publicMetadata', 'role']),
    getNestedValue(sessionClaims, ['app_metadata', 'role']),
    getNestedValue(sessionClaims, ['appMetadata', 'role']),
  ]

  for (const candidate of candidates) {
    const normalized = normalizeRole(candidate)
    if (normalized) {
      return normalized
    }
  }

  return null
}

export type AuthzContext = {
  userId: string
  tenantId: string | null
  role: Role | null
  clerkOrgRole: ClerkOrgRole | null
  has: ClerkHas
}

async function getTestAuthOverride(): Promise<
  AuthzContext | 'UNAUTHENTICATED' | null
> {
  if (!isPhase5TestAuthEnabled()) {
    return null
  }

  const headerStore = await headers()
  const scenario = parseTestAuthScenario(
    headerStore.get('x-test-auth-scenario'),
  )

  if (!scenario) {
    return null
  }

  if (scenario === 'unauthenticated') {
    return 'UNAUTHENTICATED'
  }

  const context = getTestAuthContext(scenario)

  return {
    userId: context.userId,
    tenantId: context.tenantId,
    role: context.role,
    clerkOrgRole: context.role ? (`org:${context.role}` as ClerkOrgRole) : null,
    has: (() => true) as ClerkHas,
  }
}

export async function requireSignedIn(): Promise<AuthzContext> {
  const testOverride = await getTestAuthOverride()

  if (testOverride === 'UNAUTHENTICATED') {
    unauthenticated()
  }

  if (testOverride) {
    return testOverride
  }

  const authState = await auth()
  const { isAuthenticated, userId, orgId, orgRole, sessionClaims, has } =
    authState

  if (!isAuthenticated || !userId) {
    unauthenticated()
  }

  const role = resolveRoleFromClaims(orgRole, sessionClaims)

  return {
    userId,
    tenantId: orgId ?? null,
    role,
    clerkOrgRole: orgRole ?? null,
    has,
  }
}

export async function requireTenantMember(): Promise<
  AuthzContext & { tenantId: string; role: ExternalRole }
> {
  const context = await requireSignedIn()

  if (!context.tenantId) {
    forbidden('TENANT_REQUIRED', 'Active tenant is required')
  }

  if (!isExternalRole(context.role)) {
    forbidden(
      'TENANT_MEMBER_REQUIRED',
      'External tenant membership is required',
    )
  }

  if (context.clerkOrgRole && !context.has({ role: context.clerkOrgRole })) {
    forbidden(
      'CLERK_ROLE_CHECK_FAILED',
      'Active organization role check failed',
    )
  }

  return {
    ...context,
    tenantId: context.tenantId,
    role: context.role,
  }
}

export async function requirePermission(
  permission: Permission,
): Promise<AuthzContext & { role: Role }> {
  const context = await requireSignedIn()

  if (!context.role) {
    forbidden('ROLE_REQUIRED', 'Application role could not be resolved')
  }

  if (isExternalRole(context.role) && !context.tenantId) {
    forbidden(
      'TENANT_REQUIRED',
      'Active tenant is required for external roles',
    )
  }

  if (!roleHasPermission(context.role, permission)) {
    forbidden(
      'MISSING_PERMISSION',
      `Missing required permission: ${permission}`,
    )
  }

  return {
    ...context,
    role: context.role,
  }
}

export async function requireInternalRole(
  allowedRoles: readonly InternalRole[] = INTERNAL_ROLES,
): Promise<AuthzContext & { role: InternalRole }> {
  const context = await requireSignedIn()

  if (!isInternalRole(context.role)) {
    forbidden('INTERNAL_ROLE_REQUIRED', 'Internal role required')
  }

  if (!allowedRoles.includes(context.role)) {
    forbidden(
      'INTERNAL_ROLE_REQUIRED',
      'Required internal role is not present',
    )
  }

  return {
    ...context,
    role: context.role,
  }
}

export async function assertTenantAccess(
  recordTenantId: string | null | undefined,
): Promise<AuthzContext & { tenantId: string; role: ExternalRole }> {
  const context = await requireTenantMember()

  if (!recordTenantId) {
    forbidden('RECORD_TENANT_REQUIRED', 'Record tenantId is required')
  }

  if (context.tenantId !== recordTenantId) {
    forbidden('CROSS_TENANT_ACCESS', 'Cross-tenant access denied')
  }

  return context
}