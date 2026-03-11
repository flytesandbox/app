import 'server-only'

import type { Role } from '@/lib/permissions'

export type TestAuthScenario =
  | 'unauthenticated'
  | 'employer'
  | 'reviewer'
  | 'auditor'

type TestAuthContext = {
  userId: string
  tenantId: string | null
  role: Role | null
}

const TEST_AUTH_CONTEXTS: Record<
  Exclude<TestAuthScenario, 'unauthenticated'>,
  TestAuthContext
> = {
  employer: {
    userId: 'test-employer-user',
    tenantId: 'tenant-employer-a',
    role: 'employer_admin',
  },
  reviewer: {
    userId: 'test-reviewer-user',
    tenantId: null,
    role: 'internal_reviewer',
  },
  auditor: {
    userId: 'test-auditor-user',
    tenantId: null,
    role: 'read_only_auditor',
  },
}

export function isPhase5TestAuthEnabled(): boolean {
  return process.env.PHASE5_TEST_AUTH === '1'
}

export function parseTestAuthScenario(
  value: string | null | undefined,
): TestAuthScenario | null {
  if (!value) {
    return null
  }

  if (
    value === 'unauthenticated' ||
    value === 'employer' ||
    value === 'reviewer' ||
    value === 'auditor'
  ) {
    return value
  }

  return null
}

export function getTestAuthContext(
  scenario: Exclude<TestAuthScenario, 'unauthenticated'>,
): TestAuthContext {
  return TEST_AUTH_CONTEXTS[scenario]
}