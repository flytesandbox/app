import 'server-only'

import type { ServerEnv } from '@/lib/env/server'

import type { ReleaseMetadata } from './release'

export type DeploymentMode = 'preview' | 'db-backed'

export type ReleaseGateSnapshot = {
  deploymentMode: DeploymentMode
  reviewerWorkflow: 'ui-review-only' | 'end-to-end'
  expectedChecks: {
    env: 'ok'
    database: 'skipped' | 'ok'
  }
  authProtection: {
    protectedRoute: '/dashboard/live-check'
    unauthenticatedOutcome: 'redirect'
    redirectPath: '/sign-in'
  }
  rollback: {
    previousGoodTag: string
    hasPreviousGoodTag: boolean
  }
}

// Keep this snapshot narrowly focused on deploy-time release expectations.
// Broader compliance, threat, and efficiency analysis belongs in Support.
export function getReleaseGateSnapshot(
  env: Pick<ServerEnv, 'databaseEnabled'>,
  release: Pick<ReleaseMetadata, 'releasePreviousGoodTag'>,
): ReleaseGateSnapshot {
  const deploymentMode: DeploymentMode = env.databaseEnabled
    ? 'db-backed'
    : 'preview'
  const previousGoodTag = release.releasePreviousGoodTag

  return {
    deploymentMode,
    reviewerWorkflow:
      deploymentMode === 'db-backed' ? 'end-to-end' : 'ui-review-only',
    expectedChecks: {
      env: 'ok',
      database: deploymentMode === 'db-backed' ? 'ok' : 'skipped',
    },
    authProtection: {
      protectedRoute: '/dashboard/live-check',
      unauthenticatedOutcome: 'redirect',
      redirectPath: '/sign-in',
    },
    rollback: {
      previousGoodTag,
      hasPreviousGoodTag: previousGoodTag !== 'unknown',
    },
  }
}
