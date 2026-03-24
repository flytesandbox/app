import { clerkClient } from '@clerk/nextjs/server'

import { getServerEnv } from '@/lib/env/server'
import {
  jsonResponse,
  logObservedEvent,
  withObservedRoute,
} from '@/lib/observability/http'

export const GET = withObservedRoute(
  'api.auth-check.get',
  async (request, ctx) => {
    const env = getServerEnv()
    const client = await clerkClient()

    const { isAuthenticated } = await client.authenticateRequest(request, {
      authorizedParties: env.clerkAuthorizedParties,
      jwtKey: env.clerkJwtKey,
    })

    if (!isAuthenticated) {
      logObservedEvent('warn', 'auth-check.unauthenticated', ctx)
      return jsonResponse(ctx, 401, { ok: false })
    }

    return jsonResponse(ctx, 200, { ok: true })
  },
)
