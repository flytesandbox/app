import { clerkClient } from '@clerk/nextjs/server'

import { getServerEnv } from '@/lib/env/server'

export async function GET(req: Request) {
  const env = getServerEnv()
  const client = await clerkClient()

  const { isAuthenticated } = await client.authenticateRequest(req, {
    authorizedParties: env.clerkAuthorizedParties,
    jwtKey: env.clerkJwtKey,
  })

  if (!isAuthenticated) {
    return Response.json({ ok: false }, { status: 401 })
  }

  return Response.json({ ok: true }, { status: 200 })
}