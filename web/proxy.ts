import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import {
  getOrCreateRequestId,
  REQUEST_ID_HEADER,
  REQUEST_ID_RESPONSE_HEADER,
} from '@/lib/observability/request-id'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/private(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const requestId = getOrCreateRequestId(req.headers.get(REQUEST_ID_HEADER))
  const testScenario = req.headers.get('x-test-auth-scenario')
  const bypassForPhase5Tests =
    process.env.PHASE5_TEST_AUTH === '1' &&
    !!testScenario &&
    testScenario !== 'unauthenticated'

  if (isProtectedRoute(req) && !bypassForPhase5Tests) {
    try {
      await auth.protect()
    } catch (error) {
      if (error instanceof Response) {
        error.headers.set(REQUEST_ID_RESPONSE_HEADER, requestId)
        return error
      }

      throw error
    }
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set(REQUEST_ID_HEADER, requestId)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set(REQUEST_ID_RESPONSE_HEADER, requestId)

  return response
})

export const config = {
  matcher: [
    '/((?!api|trpc|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/api/private(.*)',
  ],
}
