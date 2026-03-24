export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getDbPool } from '@/lib/db/pool'
import { getServerEnv } from '@/lib/env/server'
import {
  jsonResponse,
  logObservedEvent,
  withObservedRoute,
} from '@/lib/observability/http'
import { getReleaseMetadata } from '@/lib/observability/release'

export const GET = withObservedRoute('api.ready.get', async (_request, ctx) => {
  const release = getReleaseMetadata()
  let env

  try {
    env = getServerEnv()
  } catch {
    logObservedEvent('warn', 'readiness.env_validation_failed', ctx)

    return jsonResponse(ctx, 503, {
      ok: false,
      status: 'not-ready',
      reason: 'env_validation_failed',
      release,
      checks: {
        env: 'failed',
        database: 'not-run',
      },
    })
  }

  if (!env.databaseEnabled) {
    logObservedEvent('info', 'readiness.database_skipped', ctx)

    return jsonResponse(ctx, 200, {
      ok: true,
      status: 'ready',
      release,
      checks: {
        env: 'ok',
        database: 'skipped',
      },
    })
  }

  try {
    const pool = getDbPool()
    await pool.query('SELECT 1 AS ok')

    return jsonResponse(ctx, 200, {
      ok: true,
      status: 'ready',
      release,
      checks: {
        env: 'ok',
        database: 'ok',
      },
    })
  } catch {
    logObservedEvent('error', 'readiness.database_not_ready', ctx)

    return jsonResponse(ctx, 503, {
      ok: false,
      status: 'not-ready',
      reason: 'database_not_ready',
      release,
      checks: {
        env: 'ok',
        database: 'failed',
      },
    })
  }
})
