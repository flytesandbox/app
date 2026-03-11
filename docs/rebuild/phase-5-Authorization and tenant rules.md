# Phase 5 — Authorization and Tenant Rules

Completion Notes

## Purpose

This file is the implementation and validation companion to:

`docs/rebuild.phase-5-authorization-and-tenant-rules.md`

That file remains the canonical Phase 5 policy document.

This file records:

- what Phase 5 implemented
- what was validated locally
- what was proven by backend/API behavior
- what was intentionally deferred
- what Phase 6 may assume going forward

---

## Phase Status

Accepted as complete.

Phase 5 established the first real authorization and tenant-isolation layer for the rebuild.

Authentication remains Clerk’s responsibility.
Authorization, tenant scoping, route access, and protected API decisions are enforced in app/backend code.

---

## Canonical Source-of-Truth Reference

The canonical Phase 5 policy file locks the following:

- tenant model
- canonical roles
- canonical permissions
- role matrix
- route classes
- pass/fail exit criteria

Do not replace or reinterpret those rules in downstream phases.
If roles, permissions, or tenant behavior change later, update the canonical Phase 5 policy file first.

Reference:
- `docs/rebuild.phase-5-authorization-and-tenant-rules.md`

---

## Phase 5 Goal

Build the first real access-control layer so the app knows:

1. who the user is
2. which tenant they belong to
3. what they are allowed to do
4. which routes and records they must never touch

---

## Final Phase 5 Decisions Used

Phase 5 followed the already locked rules from the canonical authorization file:

- 1 Clerk Organization = 1 tenant boundary
- current supported tenant types:
  - employer
  - advisor
  - individual
- future tenant hierarchy is reserved but not active
- every tenant-owned record must carry `tenantId`
- every protected read/write must check active tenant
- internal staff routes remain separate from external tenant routes
- Clerk handles identity
- app/backend code handles authorization and tenant scoping

Canonical roles used in implementation:

- `platform_admin`
- `internal_ops_admin`
- `internal_reviewer`
- `employer_admin`
- `employer_member`
- `individual_member`
- `advisor_admin`
- `advisor_member`
- `read_only_auditor`

Canonical permissions used in implementation:

- `tenant:view`
- `tenant:manage_members`
- `application:create`
- `application:view_own`
- `application:edit_own`
- `application:submit`
- `application:view_all`
- `application:review`
- `application:change_status`
- `audit:view`
- `system:admin`

---

## What Was Implemented

### 1. Canonical policy map

Created the app-level canonical policy layer in:

- `web/lib/permissions.ts`

This file contains:

- the role list
- the permission list
- the role-to-permission map
- helper functions such as:
  - `hasRole()`
  - `hasPermission()`
  - permission utility helpers

Critical rule:
This file is the canonical policy map for the app.

### 2. Server-side authorization helpers

Created:

- `web/lib/authz.ts`

This file contains server-side helpers such as:

- `requireSignedIn()`
- `requireTenantMember()`
- `requirePermission(permission)`
- `requireInternalRole()`
- `assertTenantAccess(recordTenantId)`

This file uses Clerk server auth helpers and app-side policy enforcement.

### 3. Typed Clerk authorization model

Created:

- `web/types/globals.d.ts`

This provides typed role/permission keys for Clerk authorization typing instead of loose strings.

### 4. Next.js 16 route interception

Created/updated:

- `web/proxy.ts`

Protected route groups were aligned to the dashboard shell and private API layer.

Phase 5 route protection centered on:

- `/dashboard(.*)`
- `/api/private(.*)`

Important rule:
Proxy is only early interception.
Final security still happens in server code and route handlers.

### 5. Route class refactor

Route classes were refactored to match the Phase 4 shell and Phase 5 authorization model.

Public routes stayed public.

Protected shell remained under:

- `/dashboard`

Protected external routes were built under:

- `/dashboard/application`
- `/dashboard/application/review`

Protected internal routes were built under:

- `/dashboard/admin`
- `/dashboard/admin/applications`

### 6. Protected page guards

Protected pages were updated to use server-side guards.

Implemented page-level patterns:

- dashboard shell requires signed-in user
- external routes require sign-in + tenant membership + required permission
- internal routes require internal role + required permission
- denial behavior uses redirect, 403 behavior, or 404 hiding depending on route sensitivity

### 7. Protected backend proof routes

Protected API handlers were added under:

- `/api/private/application`
- `/api/private/admin/applications`
- `/api/private/tenant-check`
- `/api/private/me`
- `/api/private/admin/status-change`

Existing Phase 4 identity proof route was retained:

- `/api/auth-check`

These routes prove that authorization is enforced in backend code, not just UI visibility.

### 8. Role-aware navigation

Role-aware navigation was added to the dashboard shell.

Examples implemented:

- external users only see self-service application links when allowed
- internal reviewers see admin queue links when allowed
- auditors are handled as read-only internal users
- non-admins do not see admin actions

Critical rule:
Navigation is convenience only.
It is not the security boundary.

### 9. Live validation surface

A dedicated proof surface was added:

- `/dashboard/live-check`

This page exposes:

- resolved user id
- resolved role
- resolved tenant id
- internal/external classification
- expected access summary for current user context

This was added specifically to eliminate downstream uncertainty before deeper feature work.

### 10. Test harness

Minimum test coverage was added for authorization behavior.

Coverage targeted:

- unauthenticated user cannot access dashboard shell
- unauthenticated user cannot access protected admin routes
- employer user cannot access admin routes
- reviewer can access review queue but not tenant member management
- read-only auditor cannot mutate
- wrong-tenant request is denied

A test-only helper path was also added for deterministic role/tenant scenario testing.

---

## Local Validation Completed

The following validations were completed locally during Phase 5:

### Authentication shell

- app launched locally
- Clerk sign-in worked
- Clerk sign-out worked
- a second user was able to sign in and sign out
- `/sign-in` and `/sign-up` routing was corrected to Clerk catch-all route structure
- dashboard shell remained the authenticated home path

### Protected shell behavior

Observed behavior for a signed-in but unresolved user:

- `/dashboard` loaded
- role resolved as `unresolved`
- tenant resolved as `none`
- `/dashboard/application` redirected back to `/dashboard`
- `/dashboard/application/review` redirected back to `/dashboard`
- `/dashboard/admin` returned 404
- `/dashboard/admin/applications` returned 404

This was treated as correct behavior for a signed-in user without tenant membership or internal role.

### Protected API behavior

Observed denial behavior included:

- `/api/auth-check` returned success for signed-in identity proof
- `/api/private/application` denied with `TENANT_REQUIRED`
- `/api/private/admin/applications` denied with `INTERNAL_ROLE_REQUIRED`
- `/api/private/tenant-check` denied with `NOT_ALLOWED` for a signed-in but not-authorized user

This proved backend authorization is active and fail-closed.

### Live validation page

`/dashboard/live-check` successfully displayed the current signed-in user’s resolved context and expected access decisions.

This confirmed the authz model was live and observable before feature buildout.

---

## What Phase 5 Proved

Phase 5 proved all of the following:

- Clerk authentication works at the shell level
- dashboard shell protection works
- protected page access is not based only on UI visibility
- protected API access is enforced server-side
- tenant-scoped routes deny access without active tenant context
- internal routes deny or hide access from non-internal users
- wrong-tenant access is denied
- auditor mutation denial path exists
- role-aware navigation reflects allowed route classes
- a live validation surface exists for future role/tenant proofing

---

## Known Intentional Limits at End of Phase 5

These were intentionally not treated as required Phase 5 feature work:

- full business feature UI
- completed tenant member management workflow
- full internal review tooling
- full application workflow screens
- future hierarchy behavior for firm/partner parent-child tenancy
- deep feature CRUD

Phase 5 built the authorization rails and proof surfaces, not the full product.

---

## Open Hardening Note

A full live positive-path proof with real Clerk-backed role assignment for each major persona was discussed as the strongest optional hardening step before deeper work:

- employer live allow path
- reviewer live allow path
- auditor live allow path with mutation denial

This is recommended if additional confidence is desired before feature depth, but Phase 5 completion was accepted based on the implemented backend guards, deny-path proof, live validation surface, and local sign-in/sign-out validation.

---

## Pass/Fail Decision for Phase 5

### Pass

Phase 5 is accepted as passed because the following conditions were satisfied in implementation and local validation:

- canonical authorization/tenant policy file exists
- canonical permissions map exists
- reusable server-side authorization helpers exist
- typed Clerk auth typing exists
- protected external and internal route areas exist
- protected API routes prove backend enforcement
- deny paths were validated locally
- role-aware navigation exists
- live validation proof surface exists
- Clerk is used for identity, not as the only authorization layer

### Fail Conditions Still Ruled Out

Phase 5 should still be treated as failed if any future change reintroduces one of the following:

- route protection only in UI
- missing backend permission checks
- missing `tenantId` checks on tenant-owned records
- mixed internal/external route boundaries
- undocumented permission drift in code
- Clerk metadata used to store PHI
- cross-tenant access allowed without explicit approved backend rule

---

## What Phase 6 May Assume

Phase 6 may assume the following are now stable enough to build on:

- identity shell is in place
- dashboard shell is the authenticated home area
- external and internal route classes exist
- backend authorization helpers exist
- canonical role/permission map exists
- tenant isolation rules exist
- private API route enforcement exists
- local auth validation works
- sign-in and sign-out work locally
- role-aware navigation exists
- live validation surface exists

Phase 6 should not invent a new role model, tenant model, or policy model.
It should use the Phase 5 rules as-is.

---

## Phase 6 Handoff

Next phase:

**Phase 6 — Database architecture**

Phase 6 should now lock:

- schema strategy
- migration flow
- seed approach
- service credentials
- backup strategy
- restore process

Phase 6 must implement database and service-layer structures that preserve the Phase 5 authorization and tenant-isolation rules rather than redefining them.

---

## File Relationship

Keep both files:

- `docs/rebuild.phase-5-authorization-and-tenant-rules.md`
- `docs/rebuild.phase-5-completion-notes.md`

Use them this way:

- authorization-and-tenant-rules = canonical Phase 5 policy
- completion-notes = implementation record and validation record
