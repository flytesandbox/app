Clerk owns: sign-in, sign-up, session creation, session cookies/tokens, MFA, identity proof.

Your app owns: route protection, backend verification of every protected request, normalized identity object, later authorization rules.

This step does not include: roles, tenant scoping, admin permissions, record-level access rules.

Tenant-model continuity note:
- Phase 4 identity applies to both internal users and external tenant-scoped users.
- External tenant-scoped users may belong to employer, advisor, or individual tenants.
- Tenant type resolution, active tenant enforcement, and internal-vs-tenant authorization decisions are deferred to Phase 5.

Decision:
Each environment has one exact frontend origin.

Locked values:
LOCAL_FRONTEND_ORIGIN=http://localhost:3000
STAGING_FRONTEND_ORIGIN=https://staging.mecplans101.com
PRODUCTION_FRONTEND_ORIGIN=https://mecplans101.com

Rules:
- origin only
- no paths
- no API URLs
- no server IPs
- no private keys in notes
- do not save this on the server


Rules:
- Repo notes store variable names, purpose, service, environment, and storage location.
- Repo notes do not store actual secret values.
- Local runtime values go in local .env.local files.
- Staging runtime values go in GitHub Environment Variables/Secrets for staging.
- Production runtime values go in GitHub Environment Variables/Secrets for production.
- Staging and production use the same variable pattern.

Web app contract
- APP_ENV
- PUBLIC_APP_URL
- PUBLIC_API_URL
- FRONTEND_CLERK_PUBLISHABLE_KEY
- CLERK_SIGN_IN_FORCE_REDIRECT_URL
- CLERK_SIGN_UP_FORCE_REDIRECT_URL
- CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
- CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
- APP_HOME_PATH
- POST_SIGN_OUT_PATH

API contract
- APP_ENV
- PUBLIC_APP_URL
- PUBLIC_API_URL
- CLERK_SECRET_KEY
- CLERK_JWT_KEY
- CLERK_AUTHORIZED_PARTIES
- APP_HOME_PATH
- POST_SIGN_OUT_PATH

Known values
- local PUBLIC_APP_URL=http://localhost:3000
- staging PUBLIC_APP_URL=https://staging.mecplans101.com
- local CLERK_AUTHORIZED_PARTIES=http://localhost:3000
- staging CLERK_AUTHORIZED_PARTIES=https://staging.mecplans101.com
- all environments APP_HOME_PATH=/dashboard
- all environments POST_SIGN_OUT_PATH=/
- all environments CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
- all environments CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
- all environments CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
- all environments CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

Production placeholders
- PUBLIC_APP_URL=https://mecplans101.com
- PUBLIC_API_URL=https://mecplans101.com
- CLERK_AUTHORIZED_PARTIES=https://mecplans101.com
- FRONTEND_CLERK_PUBLISHABLE_KEY=<production publishable key>
- CLERK_SECRET_KEY=<stored outside repo>
- CLERK_JWT_KEY=<stored outside repo>

Protected/public route boundary
Goal:
Define which routes are public and which routes require authentication.

Rule:
Phase 4 only decides public vs authenticated.
Phase 5 will decide which authenticated users can do which actions.

Boundary strategy:
- Public shell lives outside /dashboard
- Authenticated shell lives under /dashboard
- Internal/admin shell also lives under /dashboard

Public routes
- /
- /apply
- /health
- /ready

Protected routes
- /dashboard
- /dashboard/*
- /api/auth-check

Protected route examples
- /dashboard
- /dashboard/resume
- /dashboard/uploads
- /dashboard/review
- /dashboard/submit
- /dashboard/account

Internal/admin route examples
- /dashboard/admin
- /dashboard/admin/*
- /dashboard/review-queue
- /dashboard/submissions

Rule:
These routes are protected in Phase 4.
True admin-only enforcement is deferred to Phase 5.

Redirect behavior
- Unauthenticated user requesting /dashboard or /dashboard/* is redirected to Clerk sign-in
- Authenticated user returns to /dashboard
- Signed-out user is redirected to /

Backend rule
- Frontend route guards improve UX
- Backend still verifies protected requests
- No protected API access is trusted based on UI state alone

Not decided right now
- platform_admin permissions
- internal reviewer permissions
- tenant isolation rules
- action-level permissions
- row/object access scope

Backend verification rule
Goal:
Every protected backend request must be authenticated server-side.

Rule:
The frontend is not the source of truth.
The backend decides whether the request is authenticated.
Phase 4 verifies identity only.
Phase 5 decides permissions and tenant/resource scope.

Accepted token sources
- same-origin browser request: __session cookie
- cross-origin/API request: Authorization header

Required backend inputs
- CLERK_SECRET_KEY
- CLERK_JWT_KEY
- CLERK_AUTHORIZED_PARTIES
- FRONTEND_CLERK_PUBLISHABLE_KEY
- APP_ENV

Verification method
- Backend verifies every protected request with Clerk
- Prefer JWT-key-based verification for the request path
- Use authorized parties allowlist during verification
- Do not trust frontend auth state alone

Protected request decision tree
1. Read token from __session cookie or Authorization header
2. If no token is present, return 401
3. Verify token with Clerk
4. If token is invalid, expired, tampered with, or from a disallowed origin, return 401
5. If token is valid, create normalized auth context
6. Continue request handling

Normalized auth context
- isAuthenticated
- userId
- sessionId
- authSource=clerk
- environment

Rule:
The backend should normalize the verified Clerk result into one simple internal auth object.

Failure behavior
- unauthenticated protected request = 401
- invalid token = 401
- expired token = 401
- wrong authorized party/origin = 401
- backend does not fall back to UI state

Public-route rule
- Public routes do not require backend authentication
- Backend may still read auth state if present
- Public routes do not fail just because the user is signed out

Not decided in right now
- admin-only permissions
- reviewer permissions
- tenant isolation
- row/object access
- action-level permission checks
- role matrix

Logging rule
- log auth success/failure event
- log request ID / correlation ID
- log environment
- do not log full tokens
- do not log raw authorization headers
- do not log session secrets

Startup validation
- API must fail to start if CLERK_SECRET_KEY is missing
- API must fail to start if CLERK_JWT_KEY is missing
- API must fail to start if CLERK_AUTHORIZED_PARTIES is missing
- API must fail to start if APP_ENV is missing


Fail-closed startup validation

Goal:
Every service must validate required auth/config values before startup completes.

Rule:
If required config is missing, blank, invalid, or clearly from the wrong environment, the service must fail immediately and not enter a ready state.

Global startup rules
- No silent defaults for required auth config
- No fallback to another environment’s values
- No partial boot with broken auth config
- No ready state until validation passes
- Validation happens before the service is considered healthy/ready

Web startup validation

Required in all environments
- APP_ENV
- PUBLIC_APP_URL
- PUBLIC_API_URL
- FRONTEND_CLERK_PUBLISHABLE_KEY
- CLERK_SIGN_IN_FORCE_REDIRECT_URL
- CLERK_SIGN_UP_FORCE_REDIRECT_URL
- CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
- CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
- APP_HOME_PATH
- POST_SIGN_OUT_PATH

Web validation checks
- APP_ENV must be one of: local, staging, production
- PUBLIC_APP_URL must match the correct frontend origin for the environment
- PUBLIC_API_URL must be present and point to the correct API environment
- FRONTEND_CLERK_PUBLISHABLE_KEY must be present and non-blank
- APP_HOME_PATH must be /dashboard
- POST_SIGN_OUT_PATH must be /
- redirect values must be present and non-blank

API startup validation

Required in all environments
- APP_ENV
- PUBLIC_APP_URL
- PUBLIC_API_URL
- CLERK_SECRET_KEY
- CLERK_JWT_KEY
- CLERK_AUTHORIZED_PARTIES
- APP_HOME_PATH
- POST_SIGN_OUT_PATH

API validation checks
- APP_ENV must be one of: local, staging, production
- PUBLIC_APP_URL must match the correct frontend origin for the environment
- PUBLIC_API_URL must be present and point to the correct API environment
- CLERK_SECRET_KEY must be present and non-blank
- CLERK_JWT_KEY must be present and non-blank
- CLERK_AUTHORIZED_PARTIES must be present and non-blank
- APP_HOME_PATH must be /dashboard
- POST_SIGN_OUT_PATH must be /

Environment-specific checks

Local
- APP_ENV must equal local
- PUBLIC_APP_URL must equal http://localhost:3000 unless the local port is deliberately changed
- CLERK_AUTHORIZED_PARTIES must equal the local frontend origin

Staging
- APP_ENV must equal staging
- PUBLIC_APP_URL must equal https://staging.mecplans101.com
- CLERK_AUTHORIZED_PARTIES must equal https://staging.mecplans101.com
- staging must use staging Clerk keys only

Production
- APP_ENV must equal production
- PUBLIC_APP_URL must equal the final production frontend origin
- CLERK_AUTHORIZED_PARTIES must equal the final production frontend origin
- production must use production Clerk keys only

Startup failure conditions
- a required variable is missing
- a required variable is blank
- APP_ENV is invalid
- PUBLIC_APP_URL does not match the environment
- CLERK_AUTHORIZED_PARTIES does not match the environment frontend origin
- staging is using production values
- production is using staging values
- local is using the wrong local origin

Failure behavior
- service exits immediately
- service returns a clear startup error message
- service does not report ready
- deploy should fail before release continues

No-fallback rules
- Do not default APP_ENV
- Do not default Clerk keys
- Do not default CLERK_AUTHORIZED_PARTIES
- Do not infer production from staging
- Do not infer staging from local
- Do not continue with placeholder values

Readiness rule
- Liveness can indicate the process is running
- Readiness must remain false until startup validation passes
- A service with invalid auth config is not ready

Deployment rule
- Startup validation errors must fail the deploy
- Staging must pass startup validation before promotion is considered
- Production must use the same validation pattern as staging

Not decided right now
- role permissions
- admin-only permissions
- tenant isolation
- resource-level access rules
- feature flag behavior

No-logging rules

Goal:
Prevent secrets, auth material, and regulated data from entering logs.

Rule:
Logs must be intentionally designed.
Debugging convenience does not override security, privacy, or audit safety.

Never log
- PHI payloads
- full tokens
- passwords
- session secrets
- raw authorization headers

Expanded never-log rule
- never log full request bodies that may contain PHI
- never log uploaded document contents
- never log Clerk secret keys
- never log JWT keys
- never log cookies containing session material
- never log bearer tokens
- never log reset links or one-time auth codes

Allowed logging
- auth success/failure event
- request ID
- correlation ID
- environment
- deployment version
- route name
- status code
- high-level error code/message

Redaction rule
- logs must be tenant-safe
- logs must not expose regulated content
- logs must replace sensitive values with redacted placeholders

Redaction format examples
- Authorization: [REDACTED]
- Cookie: [REDACTED]
- Token: [REDACTED]
- Password: [REDACTED]
- PHI payload: [REDACTED]

Audit vs debug rule
- audit logs are separate from debug logs
- security/auth events go to audit logs
- developer troubleshooting logs stay separate from audit history

Must-log events
- login success/failure
- MFA enrollment/change
- password reset
- role changes
- permission denials
- export/download actions
- record access to sensitive workflows
- admin impersonation
- config changes
- deployment events
- background job failures

Auth-specific logging rule
- log authentication result
- log user/session identifiers only if needed for traceability
- do not log raw session material
- do not log token contents
- do not log raw auth headers

Route-level logging rule
- public routes may log normal request metadata
- protected routes may log request metadata and auth outcome
- protected routes must not log sensitive request payloads

Startup/config logging rule
- log missing variable names
- log invalid environment names
- log startup validation failure reason
- do not log actual secret values

Environment logging rule
- local uses fake/test-safe data only
- staging should mirror production logging pattern
- production uses the same logging rules with stricter operational discipline

Not decided right now
- log storage vendor
- retention periods
- alert routing
- dashboards
- metrics/traces implementation details

Proof test sequence

Goal:
Prove that the Phase 4 identity shell works end-to-end in local, staging, and production.

Rule:
This step tests authentication behavior only.
It does not test RBAC, tenant isolation, or admin permissions yet.

Routes under test
- Public routes: /, /apply, /apply/*
- Protected routes: /dashboard, /dashboard/*
- Protected backend proof route: /api/auth-check

Local proof test sequence

1. Open a public route while signed out
   Expected: page loads

2. Open a protected route while signed out
   Expected: user is redirected to Clerk sign-in

3. Complete sign-in through the local Clerk app
   Expected: sign-in succeeds

4. After sign-in, confirm redirect target
   Expected: user lands on /dashboard

5. Refresh the protected page
   Expected: session remains valid and page still loads

6. Open another protected route under /dashboard/*
   Expected: page loads without another sign-in

7. Call /api/auth-check from the signed-in app
   Expected: backend accepts the request

8. Confirm backend auth source
   Expected: backend verified the session server-side

9. Sign out
   Expected: user is returned to /

10. Re-open the protected route
    Expected: redirected to sign-in again

11. Call /api/auth-check while signed out
    Expected: backend returns 401

Staging proof test sequence

1. Confirm staging is using staging Clerk keys only
   Expected: no local or production keys in staging config

2. Open a public route while signed out
   Expected: page loads

3. Open a protected route while signed out
   Expected: redirect to Clerk sign-in

4. Complete sign-in through the staging Clerk app
   Expected: sign-in succeeds

5. After sign-in, confirm redirect target
   Expected: user lands on /dashboard

6. Refresh the protected page
   Expected: session remains valid

7. Call /api/auth-check
   Expected: backend accepts the request

8. Confirm the backend only accepts the staging frontend origin
   Expected: authorized parties check passes for staging origin

9. Repeat the /api/auth-check call without a valid session
   Expected: backend returns 401

10. Sign out
    Expected: user is returned to /

11. Re-open a protected route
    Expected: redirect to sign-in again

Production proof test sequence

1. Confirm production is using production Clerk keys only
   Expected: no local or staging keys in production config

2. Open a public route while signed out
   Expected: page loads

3. Open a protected route while signed out
   Expected: redirect to Clerk sign-in

4. Complete sign-in through the production Clerk app
   Expected: sign-in succeeds

5. After sign-in, confirm redirect target
   Expected: user lands on /dashboard

6. Refresh the protected page
   Expected: session remains valid

7. Call /api/auth-check
   Expected: backend accepts the request

8. Sign out
   Expected: user is returned to /

9. Retry the same protected route and /api/auth-check
   Expected: redirect to sign-in and backend returns 401

Negative tests

1. Missing token on protected backend request
   Expected: 401

2. Invalid token on protected backend request
   Expected: 401

3. Expired token on protected backend request
   Expected: 401

4. Request from wrong authorized party/origin
   Expected: 401

5. Missing required auth config at startup
   Expected: service fails to start and is not ready

Token source proof check
- Same-origin browser flow may authenticate using the __session cookie
- Cross-origin/API flow may authenticate using the Authorization header
- Backend must accept the valid source and reject missing/invalid values

Pass criteria
- Public routes load while signed out
- Protected routes redirect correctly
- Sign-in succeeds in the correct Clerk app for the environment
- Redirect after sign-in lands on /dashboard
- Protected backend calls to /api/auth-check succeed only when authenticated
- Protected backend calls fail with 401 when unauthenticated or invalid
- Sign-out returns user to /
- Staging mirrors production auth flow shape closely enough to validate release behavior

Fail criteria
- A protected route loads while signed out
- UI appears protected but backend still allows access
- Wrong environment keys are in use
- Wrong authorized party/origin is accepted
- Missing auth config does not fail startup
- Staging auth behavior differs materially from production pattern

Not tested right now
- role-specific permissions
- admin-only access enforcement
- tenant/resource isolation
- object-level access rules
- full business workflow behavior

Phase 4 validation scorecard

1. Clerk is integrated in the web shell: PASS / FAIL / NOT TESTED
2. sign-in works: PASS / FAIL / NOT TESTED
3. sign-up works: PASS / FAIL / NOT TESTED
4. sign-out works: PASS / FAIL / NOT TESTED
5. /dashboard is protected: PASS / FAIL / NOT TESTED
6. internal/admin shell is protected: PASS / FAIL / NOT TESTED
7. backend request verification is implemented via /api/auth-check: PASS / FAIL / NOT TESTED
8. startup validation is implemented: PASS / FAIL / NOT TESTED
9. local proof test passed: PASS / FAIL / NOT TESTED
10. staging proof test passed: PASS / FAIL / NOT TESTED
11. no Phase 5 authorization logic leaked in: PASS / FAIL / NOT TESTED
