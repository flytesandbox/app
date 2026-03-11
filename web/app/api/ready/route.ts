export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getDbPool } from '@/lib/db/pool'
import { getServerEnv } from '@/lib/env/server'

function noStoreJson(status: number, body: unknown) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

export async function GET() {
  let env

  try {
    env = getServerEnv()
  } catch (error) {
    console.error('[api/ready] env validation failed', error)

    return noStoreJson(503, {
      ok: false,
      status: 'not-ready',
      reason: 'env_validation_failed',
      checks: {
        env: 'failed',
        database: 'not-run',
      },
    })
  }

  if (!env.databaseEnabled) {
    return noStoreJson(200, {
      ok: true,
      status: 'ready',
      checks: {
        env: 'ok',
        database: 'skipped',
      },
    })
  }

  try {
    const pool = getDbPool()
    await pool.query('SELECT 1 AS ok')

    return noStoreJson(200, {
      ok: true,
      status: 'ready',
      checks: {
        env: 'ok',
        database: 'ok',
      },
    })
  } catch (error) {
    console.error('[api/ready] database readiness check failed', error)

    return noStoreJson(503, {
      ok: false,
      status: 'not-ready',
      reason: 'database_not_ready',
      checks: {
        env: 'ok',
        database: 'failed',
      },
    })
  }
}