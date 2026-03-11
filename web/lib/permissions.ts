// web/lib/permissions.ts
// Canonical policy map for Phase 5.
// If roles or permissions change, update this file first.

export const ROLES = [
  'platform_admin',
  'internal_ops_admin',
  'internal_reviewer',
  'employer_admin',
  'employer_member',
  'individual_member',
  'advisor_admin',
  'advisor_member',
  'read_only_auditor',
] as const

export type Role = (typeof ROLES)[number]

export const PERMISSIONS = [
  'tenant:view',
  'tenant:manage_members',
  'application:create',
  'application:view_own',
  'application:edit_own',
  'application:submit',
  'application:view_all',
  'application:review',
  'application:change_status',
  'audit:view',
  'system:admin',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  platform_admin: [...PERMISSIONS],

  internal_ops_admin: [
    'tenant:view',
    'application:view_all',
    'application:review',
    'application:change_status',
    'audit:view',
  ],

  internal_reviewer: [
    'application:view_all',
    'application:review',
  ],

  employer_admin: [
    'tenant:view',
    'tenant:manage_members',
    'application:create',
    'application:view_own',
    'application:edit_own',
    'application:submit',
  ],

  employer_member: [
    'tenant:view',
    'application:view_own',
    'application:edit_own',
  ],

  individual_member: [
    'tenant:view',
    'application:view_own',
    'application:edit_own',
  ],

  advisor_admin: [
    'tenant:view',
    'tenant:manage_members',
    'application:view_own',
    'application:edit_own',
  ],

  advisor_member: [
    'tenant:view',
    'application:view_own',
    'application:edit_own',
  ],

  read_only_auditor: [
    'audit:view',
    'application:view_all',
  ],
}

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role)
}

export function isPermission(value: string): value is Permission {
  return PERMISSIONS.includes(value as Permission)
}

export function getPermissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role]
}

export function hasRole(
  currentRole: string | null | undefined,
  allowedRoles: Role | readonly Role[],
): boolean {
  if (!currentRole || !isRole(currentRole)) {
    return false
  }

  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  return allowed.includes(currentRole)
}

export function hasPermission(
  currentRole: string | null | undefined,
  permission: Permission,
): boolean {
  if (!currentRole || !isRole(currentRole)) {
    return false
  }

  return ROLE_PERMISSIONS[currentRole].includes(permission)
}

export function hasAnyPermission(
  currentRole: string | null | undefined,
  permissions: readonly Permission[],
): boolean {
  if (!currentRole || !isRole(currentRole)) {
    return false
  }

  return permissions.some((permission) =>
    ROLE_PERMISSIONS[currentRole].includes(permission),
  )
}

export function hasAllPermissions(
  currentRole: string | null | undefined,
  permissions: readonly Permission[],
): boolean {
  if (!currentRole || !isRole(currentRole)) {
    return false
  }

  return permissions.every((permission) =>
    ROLE_PERMISSIONS[currentRole].includes(permission),
  )
}