export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getServerEnv } from '@/lib/env/server'
import { jsonResponse, withObservedRoute } from '@/lib/observability/http'
import { getReleaseGateSnapshot } from '@/lib/observability/release-gates'
import { getReleaseMetadata } from '@/lib/observability/release'

export const GET = withObservedRoute('api.release.get', async (_request, ctx) => {
  const release = getReleaseMetadata()
  const releaseGate = getReleaseGateSnapshot(getServerEnv(), release)

  return jsonResponse(ctx, 200, {
    ok: true,
    service: 'web',
    release,
    releaseGate,
    timestamp: new Date().toISOString(),
  })
})
