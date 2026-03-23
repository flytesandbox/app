Phase 4 support 2

This chat is to start over on Phase 4. Read Phase 4 chat as well as the Phase 4 Support chat. Start over with the Phase 4 instructions as if nothing was done yet. Alot has been done, but the chat drifted badly and led me stray. Now a critical part of the build isn't complete and I cannot move to Phase 5 until Phase 4 is done, tested and validated. 

I’m pulling the project sources and the prior Phase 4 context together, then I’ll rebuild Phase 4 from zero with a hard pass/fail path so you can finish it cleanly.

I’ve confirmed the source-of-truth definition of Phase 4: this phase is only the identity shell, not authorization or feature work. I’m checking the old repo now so the restart path matches the actual app shape instead of drifting again.

The old repo code is for historical purpose only and to give you a scope of the app we're going to build. There is an env for staging and production on github. 

I’ve got the core Phase 4 boundary pinned down now: this restart has to ignore the drift and rebuild only the identity shell path from zero, with staging and production envs already existing in GitHub.

I found the main drift source. The archived repo still has old OIDC-based workflow inputs and old stack assumptions, while the locked rebuild baseline says Clerk is required and OIDC-first assumptions are retired. If Phase 4 copies the old repo literally, it will drift again.

I have the clean restart path now. The first hard gate in this phase is to kill legacy auth drift before you write or deploy anything: if the repo still references OIDC auth inputs, those must be removed or replaced with Clerk equivalents before testing.

Thought for 7m 36s

Got it. Resetting Phase 4 from zero.

Your own source-of-truth says Phase 4 is identity shell only: Clerk sign-in/out, session validation, protected routes, allowed origins, and backend token verification. It is not RBAC, tenant rules, database work, or feature rebuild. It also says each phase needs a goal, exact deliverables, pass/fail, and the next handoff.

One more reset rule: the archived repo is reference only. Your project synopsis says that old repo still carries a prior auth posture with OIDC-style token validation, while the rebuild target is Clerk. So if the new repo still has any OIDC auth wiring, that is drift and it must be removed from the Phase 4 path.

Your process docs also say local/dev is part of the real operating model, and staging must mirror production instead of acting like a second dev box. So this phase must be completed locally first, then validated on staging.

You also asked for very clear, step-by-step instructions with no extra noise, so I’m keeping this tight.

Phase 4 goal

Finish a working Clerk auth shell that does all 5 of these:

Sign in
Sign out
Redirect guests away from protected pages
Verify session tokens in a backend route
Work locally and on staging
Source-of-truth decisions for this restart
Use Clerk, not OIDC.
Do local first, staging second.
Assume the web shell is Next.js App Router.
Do not build roles or permissions yet. That is Phase 5.
Use separate Clerk auth isolation for staging vs production.

Clerk’s current docs say local uses a Development instance, Production uses a Production instance, and if you want a real staging environment, Clerk recommends a separate Clerk application with a separate domain because Clerk does not natively offer a staging instance.

Start here
Step 1 — Fix your local runtime first

In PowerShell, run:

node -v

If the version is below 20.9, stop and upgrade Node first. Current Next.js requires Node.js 20.9 minimum. Your old support chat showed Node 19, which is now below current minimum.

Then open the repo locally.

If your terminal already shows the web app folder, do not cd into it again.
Example: if you already see something like C:\Dev\Repos\app\web>, stay there.

Step 2 — Kill legacy auth drift before you code

From the repo root, search for these strings:

OIDC_
AUTH0
issuer
jwks
audience

If those are part of the auth path for the new repo, remove or replace them from the Phase 4 implementation path. The rebuild target is Clerk, not legacy OIDC.

Step 3 — Set up Clerk correctly for local, staging, and production

Use this model:

Local → Clerk Development instance
Staging → separate Clerk app, using its Production instance on staging.mecplans101.com
Production → your production Clerk app, using its Production instance on the production domain

Clerk says Development instances are not for production workloads, and staging isolation is best done with a separate Clerk application and separate domain.

Step 4 — Install Clerk in the web app

From the web app folder, run:

npm install @clerk/nextjs

Clerk’s current Next.js setup is: install @clerk/nextjs, add clerkMiddleware(), and wrap the app with ClerkProvider. By default, clerkMiddleware() protects nothing until you opt in.

Step 5 — Create the local env file

Create a .env.local file in the web app root.

Put this in it:

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_JWT_KEY=-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

CLERK_AUTHORIZED_PARTIES=http://localhost:3000

Why these:

Clerk uses a publishable key for frontend and secret key for backend.
CLERK_JWT_KEY is the official env var for networkless JWT session verification.
Next.js only exposes browser env vars if they start with NEXT_PUBLIC_.
Clerk supports NEXT_PUBLIC_CLERK_SIGN_IN_URL and NEXT_PUBLIC_CLERK_SIGN_UP_URL.
Step 6 — Add the same contract to GitHub environments

You said staging and production environments already exist in GitHub. Good.

Add these to each environment:

GitHub staging
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_JWT_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
CLERK_AUTHORIZED_PARTIES=https://staging.mecplans101.com
GitHub production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_JWT_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
CLERK_AUTHORIZED_PARTIES=https://mecplans101.com

Do not reuse staging auth keys in production.

Step 7 — Add the Clerk middleware file

If your Next.js version is 15 or lower, name this file middleware.ts.
If it is newer, use proxy.ts. Clerk’s current docs use proxy.ts and note that Next.js <=15 should still use middleware.ts.

Create this file in the web app root:

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
])

const authorizedParties = (process.env.CLERK_AUTHORIZED_PARTIES || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect()
    }
  },
  {
    authorizedParties,
  }
)

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

This is the right shape because Clerk recommends auth.protect() for protected routes, and recommends explicitly setting authorizedParties as an origin allowlist.

Step 8 — Wrap the app in ClerkProvider

In app/layout.tsx:

import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}

Clerk’s Next.js setup requires ClerkProvider at the app entry point. Missing this is one of the common causes of Clerk auth failures.

Step 9 — Create sign-in and sign-up pages

Create:

app/sign-in/[[...sign-in]]/page.tsx

import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return <SignIn />
}

Create:

app/sign-up/[[...sign-up]]/page.tsx

import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return <SignUp />
}

These routes match Clerk’s current Next.js pattern for dedicated auth pages.

Step 10 — Create one protected page

Create:

app/dashboard/page.tsx

export default function DashboardPage() {
  return <div>Protected dashboard</div>
}

You do not need extra auth code inside this page yet. The middleware should protect it.

Step 11 — Create one backend verification route

Create:

app/api/auth-check/route.ts

import { clerkClient } from '@clerk/nextjs/server'

const authorizedParties = (process.env.CLERK_AUTHORIZED_PARTIES || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)

export async function GET(req: Request) {
  const client = await clerkClient()

  const { isAuthenticated } = await client.authenticateRequest(req, {
    authorizedParties,
    jwtKey: process.env.CLERK_JWT_KEY,
  })

  if (!isAuthenticated) {
    return Response.json({ ok: false }, { status: 401 })
  }

  return Response.json({ ok: true })
}

Clerk’s docs show authenticateRequest() with authorizedParties and jwtKey for backend verification in Next.js route handlers.

Step 12 — Add a simple homepage test

If you need a quick test page, use this in app/page.tsx:

import Link from 'next/link'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from '@clerk/nextjs'

export default function Home() {
  return (
    <main>
      <h1>App</h1>

      <SignedOut>
        <SignInButton mode="modal">
          <button>Sign in</button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <UserButton />
        <div>
          <Link href="/dashboard" prefetch={false}>
            Go to dashboard
          </Link>
        </div>
      </SignedIn>
    </main>
  )
}

Clerk notes that links from public pages to protected pages can throw noisy prefetch errors unless prefetch is disabled.

Local validation

From the web app folder, run:

npm run dev

Then test in this exact order:

Open /
Click Sign in
Complete sign-in
Open /dashboard
Sign out
Try /dashboard again
Open /api/auth-check while signed out
Open /api/auth-check while signed in

Expected results:

Signed out → /dashboard redirects to sign-in
Signed in → /dashboard loads
Signed out → /api/auth-check returns 401
Signed in → /api/auth-check returns 200
Staging validation

After local passes:

Commit the Phase 4 changes
Push through your existing staging deployment path
Verify the staging environment has the Clerk values added
Open staging.mecplans101.com
Repeat the exact same 8 tests from local

Your project’s success criteria say the rebuild must work locally with safe data, Clerk auth must work end-to-end, secrets must be environment-specific, and staging must validate real deployment behavior.

Pass / fail for Phase 4

Pass only if all are true:

Local auth works
Staging auth works
Protected route blocks guests
Backend route verifies auth correctly
No legacy OIDC auth path remains in the new implementation
Staging and production use separate environment-specific Clerk values

Fail if any are true:

Node is still below 20.9
ClerkProvider is missing
middleware/proxy file is missing or named wrong
protected routes are public
backend auth route does not return 401 signed out
staging uses the wrong Clerk app or wrong domain
old OIDC auth envs are still driving the build
Next phase handoff

When this passes, Phase 4 is done.

Phase 5 starts with authorization only:

roles
permission matrix
backend guards
tenant/resource isolation

That is exactly how your source-of-truth sequences the rebuild.

If you want, the next move is for me to turn this into a strict Phase 4 execution checklist you can follow line by line without thinking.

These instructions are incomplete again. Assume there are no local files. Only a directory called /app, which is located in the C:\Dev\Repos\ directory, which is where all local app files live. 
Stopped thinking
Quick answer
app.zip
Zip Archive
Attached is a copy of the local app files/code that has been developed so far

I’m correcting the starting assumptions first, then I’m checking the attached app snapshot so the rewritten Phase 4 starts from your actual local state instead of guessing.

I found the main problem already: the uploaded local snapshot is not a normal working app folder yet. It currently looks like /app with almost nothing inside web except an app directory, which means the restart instructions must include creating missing base files, not just editing existing ones.

Thought for 4m 37s

Correct. The previous Phase 4 restart was still wrong.

Your actual local starting point is now:

C:\Dev\Repos\app exists
the uploaded snapshot has no runnable app code yet
it only has root env files, an api folder with an env file, and an almost-empty web folder

So Phase 4 cannot start with “edit the existing app.” It has to start with creating the web shell first, then wiring Clerk into it. That matches your source-of-truth: Phase 4 is the identity shell only — sign-in/out, session validation, protected routes, allowed origins, and backend token verification. It is not Phase 5 authorization work.

It also has to be owner-runnable, staging-first, and fail-closed on config, exactly as your project rules say.

What is wrong in the current local snapshot

From the uploaded local snapshot app.zip, these are the blockers:

There is no package.json and no actual Next app yet.
The current env files are in the wrong place for a Next app that will live in C:\Dev\Repos\app\web.
The current frontend env naming is wrong for modern Next + Clerk:
FRONTEND_CLERK_PUBLISHABLE_KEY should be NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
PUBLIC_APP_URL / PUBLIC_API_URL should be NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_API_URL if the browser needs them
Your current api\.env.local appears to have a malformed CLERK_JWT_KEY entry — the public key block is pasted as raw lines instead of being assigned properly.
Do not keep using root-level env files for the web app. Next loads .env* from the app project root, and browser-exposed vars must use NEXT_PUBLIC_.
Phase 4 goal

By the end of this phase, all 5 of these must work:

Sign in
Sign out
Protected route redirect
Backend token verification
Local and staging validation

That is the exact Phase 4 contract in your source-of-truth.

Do this exactly
Step 1 — Check Node first

Open PowerShell and run:

cd C:\Dev\Repos\app
node -v

If the version is below 20.9, stop and upgrade Node before doing anything else. Current Next.js requires Node 20.9 minimum.

Step 2 — Back up the bad env files so they stop interfering

Run this:

cd C:\Dev\Repos\app

New-Item -ItemType Directory -Path .\_phase4_backup -Force | Out-Null

if (Test-Path .\.env) { Move-Item .\.env .\_phase4_backup\root.env.bak -Force }
if (Test-Path .\.env.local) { Move-Item .\.env.local .\_phase4_backup\root.env.local.bak -Force }
if (Test-Path .\api\.env.local) { Move-Item .\api\.env.local .\_phase4_backup\api.env.local.bak -Force }

Do not delete them yet. We may reuse values from them.

Step 3 — Remove the incomplete web folder and create the real web app

Run this:

cd C:\Dev\Repos\app

if (Test-Path .\web) { Remove-Item .\web -Recurse -Force }

npx create-next-app@latest web

When it asks questions, answer like this:

TypeScript: Yes
ESLint: Yes
React Compiler: No
Tailwind CSS: Yes
src/ directory: No
App Router: Yes
Customize import alias: No

That gives you the correct Next app shell for this phase. Current Next docs still recommend create-next-app, and the default modern setup is App Router with TypeScript and ESLint.

Step 4 — Install Clerk

Run:

cd C:\Dev\Repos\app\web
npm install @clerk/nextjs

Clerk’s current Next setup is still @clerk/nextjs with ClerkProvider plus clerkMiddleware() route protection.

Step 5 — Create the only env file the web app should use

Create this file:

C:\Dev\Repos\app\web\.env.local

Put this in it:

NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
CLERK_SECRET_KEY=sk_test_REPLACE_ME
CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----\nREPLACE_ME\n-----END PUBLIC KEY-----"

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

CLERK_AUTHORIZED_PARTIES=http://localhost:3000

Use values from your Clerk dashboard or from your backed-up local env files, but rename them to the correct keys above.

Why this matters:

the correct frontend key name for Next is NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
the backend key stays CLERK_SECRET_KEY
CLERK_JWT_KEY is the correct variable for networkless JWT verification
Clerk recommends using environment variables for sign-in/sign-up redirect URLs
Next only exposes browser vars that start with NEXT_PUBLIC_
multiline env values must be quoted or use \n escapes, not pasted loose on separate lines.
Step 6 — Replace app/layout.tsx

Open:

C:\Dev\Repos\app\web\app\layout.tsx

Replace it with:

import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata = {
  title: 'App',
  description: 'Phase 4 identity shell',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}

ClerkProvider is required in the app shell.

Step 7 — Replace app/page.tsx

Open:

C:\Dev\Repos\app\web\app\page.tsx

Replace it with:

import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

export default function Home() {
  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Phase 4 Identity Shell</h1>

      <SignedOut>
        <SignInButton mode="modal">
          <button className="rounded border px-4 py-2">Sign in</button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <div className="flex items-center gap-4">
          <UserButton />
          <Link href="/dashboard" prefetch={false} className="rounded border px-4 py-2">
            Go to dashboard
          </Link>
        </div>
      </SignedIn>
    </main>
  )
}

Clerk specifically warns that links from public pages to protected pages can produce noisy prefetch issues unless prefetch={false} is used.

Step 8 — Create the sign-in page

Create:

C:\Dev\Repos\app\web\app\sign-in\[[...sign-in]]\page.tsx

Paste this:

import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return <SignIn />
}
Step 9 — Create the sign-up page

Create:

C:\Dev\Repos\app\web\app\sign-up\[[...sign-up]]\page.tsx

Paste this:

import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return <SignUp />
}
Step 10 — Create the protected dashboard page

Create:

C:\Dev\Repos\app\web\app\dashboard\page.tsx

Paste this:

export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Protected dashboard</h1>
    </main>
  )
}
Step 11 — Create the backend auth-check route

Create:

C:\Dev\Repos\app\web\app\api\auth-check\route.ts

Paste this:

import { clerkClient } from '@clerk/nextjs/server'

const authorizedParties = (process.env.CLERK_AUTHORIZED_PARTIES || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)

export async function GET(req: Request) {
  const client = await clerkClient()

  const { isAuthenticated } = await client.authenticateRequest(req, {
    authorizedParties,
    jwtKey: process.env.CLERK_JWT_KEY,
  })

  if (!isAuthenticated) {
    return Response.json({ ok: false }, { status: 401 })
  }

  return Response.json({ ok: true }, { status: 200 })
}

This matches Clerk’s current documented authenticateRequest() pattern for backend token verification, including authorizedParties and jwtKey.

Step 12 — Create route protection file

Because current Clerk docs say:

use proxy.ts for modern Next
use middleware.ts only if you are on Next 15 or lower

Create this file:

C:\Dev\Repos\app\web\proxy.ts

Paste this:

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/api/auth-check(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

If your generated package.json shows Next 15.x instead of 16.x, use the exact same code but name the file middleware.ts instead. Clerk’s docs are explicit on that.

Step 13 — Run it locally

Run:

cd C:\Dev\Repos\app\web
npm run dev

Then open:

http://localhost:3000

Step 14 — Local pass/fail test

Run these tests in order:

Open /
Click Sign in
Complete sign in
Open /dashboard
Confirm dashboard loads
Open /api/auth-check
Confirm it returns {"ok":true}
Sign out
Open /dashboard again
Confirm you are redirected to sign-in
Open /api/auth-check
Confirm it returns 401

If any of those fail, Phase 4 is not done.

Step 15 — Fix GitHub environment variables before staging

Your project requires staging and production to stay environment-specific and fail closed.

So in GitHub:

Staging environment

Set these exact names:

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_JWT_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
CLERK_AUTHORIZED_PARTIES=https://staging.mecplans101.com
NEXT_PUBLIC_APP_URL=https://staging.mecplans101.com
Production environment

Set these exact names:

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_JWT_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
CLERK_AUTHORIZED_PARTIES=https://mecplans101.com
NEXT_PUBLIC_APP_URL=https://mecplans101.com

Important: NEXT_PUBLIC_* values are bundled into the client at build time, so they must be correct for the environment when the build happens.

Step 16 — Clerk staging rule

For staging, use a separate Clerk application with a separate domain if you want proper staging isolation. Clerk’s current docs say Clerk only has Development and Production instances, and staging is done by creating a separate Clerk app on a separate domain.

So the correct pattern is:

local → Clerk Development instance
staging → separate Clerk app, production instance, staging.mecplans101.com
production → main Clerk app, production instance, production domain
Step 17 — Staging validation

After local passes:

Commit the Phase 4 files
Push to GitHub
Deploy to staging through your normal GitHub Action
Run the same 12 checks on staging.mecplans101.com

If staging fails but local works, the issue is almost certainly env wiring or deploy config, not Clerk UI code.

Pass / fail for this restarted Phase 4
Pass

Phase 4 is complete only if all are true:

local sign-in works
local sign-out works
/dashboard is protected
/api/auth-check returns 200 signed in
/api/auth-check returns 401 signed out
staging does the same thing
staging and production use separate environment-specific values
Fail

Phase 4 is still incomplete if any are true:

Node is below 20.9
the web app still has no package.json
env files are still being read from C:\Dev\Repos\app\ instead of C:\Dev\Repos\app\web\
old env names like FRONTEND_CLERK_PUBLISHABLE_KEY are still in use
CLERK_JWT_KEY is still pasted malformed
protected routes are public
staging uses the wrong Clerk keys or wrong authorized party

If any of the old env files were ever committed to GitHub, rotate the Clerk secret immediately. Next’s docs explicitly warn that .env files should almost never be committed.

This is now the correct Phase 4 restart path from your actual local state.

C:\Dev\Repos\app\web>npm run dev

> web@0.1.0 dev
> next dev

▲ Next.js 16.1.6 (Turbopack)
- Local:         http://localhost:3000
- Network:       http://172.17.112.1:3000
- Environments: .env.local

✓ Starting...
Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry

✓ Ready in 3.3s
○ Compiling / ...
⨯ ./app/page.tsx:2:1
Export SignedIn doesn't exist in target module
  1 | import Link from 'next/link'
> 2 | import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  3 |
  4 | export default function Home() {
  5 |   return (

The export SignedIn was not found in module [project]/node_modules/@clerk/nextjs/dist/esm/index.js [app-rsc] (ecmascript).
Did you mean to import SignIn?
All exports of the module are statically known (It doesn't have dynamic exports). So it's known statically that the requested export doesn't exist.

Good. This is now a real Phase 4 issue, not drift. The app shell is running, and the first failure is a Clerk API mismatch in app/page.tsx, so I’m checking Clerk’s current Next.js exports before changing anything.

Thought for 33s

That error is the result of a Clerk version change, not your Next setup.

Clerk Core 3 removed SignedIn and SignedOut and replaced them with a single Show component. Clerk’s current Next.js quickstart now uses Show when="signed-in" and Show when="signed-out", while UserButton, SignInButton, and SignUpButton still exist.

Replace C:\Dev\Repos\app\web\app\page.tsx with this:

import Link from 'next/link'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'

export default function Home() {
  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Phase 4 Identity Shell</h1>

      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="rounded border px-4 py-2">Sign in</button>
        </SignInButton>
      </Show>

      <Show when="signed-in">
        <div className="flex items-center gap-4">
          <UserButton />
          <Link
            href="/dashboard"
            prefetch={false}
            className="rounded border px-4 py-2"
          >
            Go to dashboard
          </Link>
        </div>
      </Show>
    </main>
  )
}

That matches Clerk’s current API: Show handles signed-in and signed-out rendering, and prefetch={false} is still the right move for links from public pages to protected pages.

Then search the whole web app for any other legacy Clerk control components, because the same error will hit the next file that still imports them. In PowerShell:

cd C:\Dev\Repos\app\web
findstr /spin /c:"SignedIn" /c:"SignedOut" /c:"Protect" *.ts *.tsx

Anything it finds should be converted to Show, because Clerk’s upgrade guide says Protect, SignedIn, and SignedOut were consolidated into Show.

After you save the file, next dev should recompile automatically. If it throws a new error next, paste that one exactly.

So am i to understand that if the 12 test pass and I can push code to github(envs, secrets, var all added) that concludes Phase 4? I cannot test CI to staging.domain yet as those structures have not been built yet. 

I’m checking your own phase rules against the current constraint, because the answer here should be a hard project control decision, not guesswork.

Thought for 27s

Yes — with one correction.

Phase 4 can be considered complete enough to move to Phase 5 if the local identity shell passes fully.
It is not fully deployment-validated yet, but that is because your build order puts CI/CD and staging deploy in Phase 7, not Phase 4. Your source-of-truth defines Phase 4 as Clerk shell work only: sign-in/out, session validation, protected routes, allowed origins, and backend token verification.

Your phase sequence also says CI/CD, staging deploy, smoke tests, and promotion rules are Phase 7 work, not Phase 4.

So the clean ruling is:

Phase 4 is complete if all of this is true locally
sign-in works
sign-out works
protected routes block guests
backend token verification works
allowed origins / authorized parties are configured
the app boots from the correct env contract
the Clerk config is set in local and GitHub environment definitions
no legacy OIDC auth path is still driving the new shell

That matches the actual defined scope of Phase 4.

What it does not mean

It does not mean the rebuild is validated end-to-end yet.

Your overall rebuild success standard still requires:

push to staging through GitHub Actions
staging mirroring production closely enough to validate real behavior
Clerk working end-to-end there
secrets being environment-specific and validated before deploy

But that is broader than Phase 4. That crosses into Phase 7 CI/CD and Phase 10 release gates.

The right status label

Use this:

Phase 4: Passed locally / staging validation deferred until Phase 7

That is the honest status.

Can you move to Phase 5?

Yes, if the 12 local tests pass and the auth shell is working cleanly.

You do not need to block Phase 5 just because CI-to-staging is not built yet, because that would contradict your own phase order. The sequence is identity shell first, then authorization/tenant rules, then database architecture, then CI/CD.

The trap to avoid

Do not mentally mark auth as “fully proven.”
Mark it as:

implemented and locally verified now
staging verification required later when Phase 7 exists

That keeps you from drifting again while still letting the build move forward. Your own docs warn that staging validation is required before production, but not that staging deploy must be built before Phase 5 starts.

Bottom line

Yes: if the 12 local tests pass, and the GitHub env/secrets contract is in place, you can call Phase 4 complete and move to Phase 5.

No: that does not conclude deployment validation. That part remains open until Phase 7 builds the staging pipeline and you rerun Phase 4 auth checks on staging.

Paste me the current results of the 12 local tests and I’ll give you a hard Phase 4 pass/fail ruling.