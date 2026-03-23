Read phase 1-3 chats, and all project sources. 
- app-main.zip is the cannon of the repo before deleting it and starting the new one. Note: this only exists for reference. Remember that we are starting over from scratch and following the Phases. 
- app-main (1).zip is legacy and should not be read. 
- Any files have been committed to the new repo on github and will not be found in Sources. 

Assume instructions from the previous Phases have been executed. 

Begin phase 4 instructions.

I’m pulling the phase history and source docs first, then I’ll turn that into a strict Phase 4 execution map with exact steps, outputs, and pass/fail gates.

I found the old repo’s auth-prep docs. I’m using them as reference only, not as the implementation target, so Phase 4 stays aligned to the rebuild order instead of inheriting old stack drift.

Thought for 4m 10s

I reviewed the project sources and Phase 1–3 context, used app-main.zip only as reference, and ignored app-main (1).zip as instructed.

Phase 4 is now the Identity shell. The locked order for this rebuild is controls/architecture → environments → identity/secrets/network, and the Phase 4 objective is to integrate Clerk at the shell level for sign-in/out, session validation, protected routes, allowed origins, and backend token verification before moving into authorization rules.

Phase 4 goal

Stand up a working Clerk authentication shell across local, staging, and production-shaped environments so the app can prove identity correctly, reject unauthenticated access correctly, and hand a verified session to the backend. Phase 4 is authentication only. Authorization, roles, tenant rules, and resource permissions stay in Phase 5.

Locked decisions for this phase
Clerk is the only auth provider in the rebuild. Do not build dual-mode auth.
Use same-origin auth by default behind Traefik when possible. That keeps browser → app/API auth simpler and lets Clerk session cookies flow automatically on same-origin requests. For cross-origin calls, session tokens must be sent in the Authorization header.
Public routes stay public. Keep the future employer application flow public-facing. Protect only the authenticated app shell and admin shell in this phase. This matches the two-experience product model in the source-of-truth.
Backend verifies sessions. Frontend state is not the source of truth. The backend must verify the session token.
Secrets stay environment-specific and fail closed on startup.
Do this in order
1) Create the Clerk application boundary

In Clerk Dashboard:

Create the app instance for this rebuild.
Set the app domains for:
local
staging.mecplans101.com
your eventual production domain
Set sign-in and sign-up paths.
Set post-login redirect target to your protected shell path, such as /app.

Clerk supports framework-level redirect URL configuration using public env vars for sign-in/sign-up and fallback/force redirects.

2) Lock the route classes now

Use these route classes:

Public

/
/sign-in
/sign-up
/health
/ready
/ichra/setup and any future public application routes

Protected

/app
/app/*
/admin
/admin/*
/account
/api/auth/me
/api/internal/*

Do not protect the public ICHRA intake flow in Phase 4.

3) Turn on the minimum Clerk auth settings

In Clerk:

Enable your primary sign-in method.
Turn on email verification if you are using email auth.
Enable at least one MFA method.
Keep MFA working in the shell even if role-based enforcement comes later.

Clerk’s current docs show MFA support and dashboard setup for enabling second-factor strategies.

4) Create the Phase 4 env contract

Create a single source-of-truth auth env contract in the repo docs.

Browser/public env

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or VITE_CLERK_PUBLISHABLE_KEY
framework-appropriate public sign-in URL
framework-appropriate public sign-up URL
framework-appropriate post-sign-in redirect URL
framework-appropriate post-sign-up redirect URL

Server-only env

CLERK_SECRET_KEY
CLERK_JWT_KEY
CLERK_AUTHORIZED_PARTIES
CLERK_SIGN_IN_URL for server redirects where applicable

authenticateRequest() can verify sessions networklessly when given jwtKey, and Clerk recommends explicitly setting authorizedParties to restrict trusted origins.

5) Put the secrets in the right places

Local

.env.local
never commit it

GitHub environment secrets

staging Clerk keys
production Clerk keys

Do not

hardcode keys
reuse prod secrets in staging
commit secrets anywhere

That matches the project’s fail-closed secret handling model.

6) Install Clerk in the web app

Have Codex do the framework-specific install for your actual web stack.

Required outcome:

app wrapped in Clerk provider
/sign-in page works
/sign-up page works
signed-in user can reach /app
signed-out user is redirected away from protected shell routes
7) Add backend session verification

This is mandatory for Phase 4.

Use Clerk’s backend verification path, not a UI-only check.

Same-origin

browser requests to same-origin API will carry the Clerk session automatically via cookie

Cross-origin

manually pass the session token as Authorization: Bearer ...

Verification pattern

verify request on the backend
use authorizedParties
use CLERK_JWT_KEY
reject unauthenticated API calls with 401

Clerk’s current docs show authenticateRequest() with authorizedParties and jwtKey for backend verification.

8) Use the right protection method for API vs pages

If your backend is Express:

use clerkMiddleware() for all requests
use getAuth() or equivalent backend auth read for API routes
do not use requireAuth() for API routes
use redirect-based protection only for full-page protected UI routes

Clerk’s Express docs are explicit on this.

9) Add one auth test endpoint

Create:

GET /api/auth/me

Behavior:

signed out → 401
signed in → 200 plus minimal safe identity data:
Clerk user ID
email
session status

Do not return roles yet.
Do not query your app database yet.
Do not sync app users yet.

That comes later.

10) Add one visible signed-in shell page

Create /app with:

signed-in indicator
user email
sign-out button
link to /admin only as a placeholder
no business features

Create /admin as protected but empty except:

“Authenticated”
user info
“Authorization rules begin in Phase 5”
11) Test local first

Local pass sequence:

Start app locally.
Open public home page.
Open /app while signed out.
Confirm redirect to sign-in.
Sign in.
Confirm redirect into /app.
Call /api/auth/me.
Confirm 200.
Sign out.
Call /api/auth/me again.
Confirm 401.
12) Test staging next

Because staging must mirror production behavior, run the same auth flow on staging using the staging domain and staging Clerk keys. The source-of-truth is explicit that staging must use the same auth flow shape as production.

What not to build in Phase 4

Do not do any of this yet:

roles
tenant isolation logic
internal vs external permission rules
feature flags by role
DB-backed app user records
admin impersonation
custom auth bypasses
multiple auth providers

The project source is explicit: Clerk handles authentication; backend authorization and tenant/resource rules come in Phase 5.

Phase 4 deliverables

By the end of this phase, the repo should contain:

Clerk wired into the web shell
sign-in page
sign-up page
sign-out action
protected /app
protected /admin
backend session verification
/api/auth/me
environment variable contract doc
local env example file with placeholders only
staging/prod GitHub secrets populated
local and staging auth smoke-test checklist
Pass / fail exit criteria

Pass

unauthenticated users cannot access protected shell routes
authenticated users can access /app
backend rejects unauthenticated API requests
backend accepts authenticated API requests
local works
staging works
no secrets are committed
same auth path shape exists in local and staging
no role logic has leaked into Phase 4

Fail

frontend alone decides auth state
API trusts the browser without backend verification
staging uses different auth wiring than local/prod
secrets are copied ad hoc
app still supports old dual-auth assumptions
protected routes can be opened while signed out

The project defines success here as Clerk auth working end-to-end, secrets being environment-specific and validated before deploy, and staging behaving close enough to production to validate real behavior.

Ready-to-paste Codex prompt
Phase 4 — Identity Shell

Read the current repo only. Do not invent architecture outside the repo. Implement Phase 4 identity shell for the rebuild using Clerk as the only authentication provider.

Objective:
Integrate Clerk at the shell level only:
- sign-in
- sign-up
- sign-out
- session validation
- protected routes
- backend token/session verification
- allowed origins / authorized parties
- minimal MFA-ready flow

Hard rules:
- Do not implement authorization, RBAC, tenant isolation, or permission matrix in this phase.
- Do not add multiple auth providers.
- Do not add custom admin auth bypasses.
- Do not add DB-backed user sync yet.
- Do not commit secrets.
- Keep public ICHRA intake/setup routes public.
- Protect only authenticated shell routes and internal API routes.

Required deliverables:
1. Clerk provider integrated into the web app.
2. Public sign-in route.
3. Public sign-up route.
4. Protected /app route.
5. Protected /admin route placeholder.
6. Sign-out action in authenticated shell.
7. Backend auth verification on API requests.
8. GET /api/auth/me endpoint:
   - 401 when signed out
   - 200 with minimal safe identity fields when signed in
9. Environment variable contract doc for auth.
10. .env example placeholders only, no secrets.
11. Startup validation for required auth env vars.
12. Local auth smoke test instructions in markdown.

Implementation requirements:
- Prefer same-origin auth flow behind Traefik.
- If API calls are same-origin, rely on Clerk session cookie flow.
- If any cross-origin call exists, pass Authorization bearer token and verify it on the backend.
- Use Clerk backend verification with authorized parties and JWT key.
- For Express APIs, use clerkMiddleware/getAuth-style API protection, not page-redirect auth helpers for API routes.
- Redirect unauthenticated page visits to sign-in.
- Return standard 401/403 JSON for API protection failures.
- Expose no secrets to the browser beyond the publishable key.
- Keep code modular and environment-aware.

Output needed:
- changed files
- short explanation of each change
- exact env vars required
- exact local test steps
- any repo assumptions made

Phase 5 starts after these pass.