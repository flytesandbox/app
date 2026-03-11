import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/private(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const testScenario = req.headers.get('x-test-auth-scenario')
  const bypassForPhase5Tests =
    process.env.PHASE5_TEST_AUTH === '1' &&
    !!testScenario &&
    testScenario !== 'unauthenticated'

  if (isProtectedRoute(req) && !bypassForPhase5Tests) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!api|trpc|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/api/private(.*)',
  ],
}