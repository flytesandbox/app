export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { jsonResponse, withObservedRoute } from '@/lib/observability/http'
import { getReleaseMetadata } from '@/lib/observability/release'

export const GET = withObservedRoute('api.release.get', async (_request, ctx) =>
  jsonResponse(ctx, 200, {
    ok: true,
    service: 'web',
    release: getReleaseMetadata(),
    timestamp: new Date().toISOString(),
  }),
)
