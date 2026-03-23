Read phase 1-4 chats, and all project sources.  

- app-main.zip is the cannon of the repo before deleting it and starting the new one. Note: this only exists for reference. Remember that we are starting over from scratch and following the Phases. 
- app-main (1).zip is legacy and should not be read. 
- The current app files have been uploaded to this chat showing how far we've come int he process. 
- the repo in GitHub has the correct environments, secrets and variables added to support the next Phase of development.

Assume instructions from the previous Phases have been executed and we are green light to proceed with the next Phase. 

Begin phase 5 instructions. 


I’m pulling the prior phase context, the source-of-truth docs, and the current Phase 4 app state together first so Phase 5 lands on the actual codebase instead of the abstract plan. Then I’ll give you the next phase as a step-by-step build sequence with exit criteria.

I’ve got the pattern now: Phase 4 exists as a very thin Clerk identity shell in the current app, but it is still missing the authorization layer that actually decides who can do what. That matches the source-of-truth sequence exactly, so Phase 5 should be pure RBAC and tenant isolation—not more sign-in work.

I found one real gap in the uploaded Phase 4 app: the visible dashboard route is not actually protected yet by a route-level guard or middleware. So the next phase cannot assume security is “done” just because sign-in works.

Thought for 5m 37s

Proceeding with project Phase 5: Authorization and tenant rules. In your source-of-truth, this phase is specifically to define roles, permission matrix, backend guards, and tenant/resource isolation, and the rebuild is only considered successful when authorization is enforced in the backend, not just the UI.

Your dev-process also makes the sequencing clear: after the identity shell, the next move is to build authorization and tenant isolation before deeper database and feature work. It also explicitly warns not to let frontend roles or Clerk metadata be the sole source of truth.

One important current-platform detail: with Clerk’s current Next.js guidance, route interception is done with clerkMiddleware(), but it protects nothing by default unless you opt in, and with Next.js 16 the preferred file name is proxy.ts rather than middleware.ts. Also, Clerk’s current server helpers support using auth() and auth.protect() for server-side checks, which is what you want for real enforcement instead of UI-only hiding.

Phase 5 goal

Build the first real access-control layer so the app knows:

who the user is
which tenant they belong to
what they are allowed to do
which routes and records they must never touch
Exact deliverables for Phase 5

Create these in the real repo:

docs/rebuild.phase-5-authorization-and-tenant-rules.md
web/proxy.ts
web/lib/permissions.ts
web/lib/authz.ts
web/types/globals.d.ts
protected external route area
protected internal admin route area
at least one protected API route proving server-side authorization
one small test set covering authz failures and successes
Source-of-truth decisions to lock in this phase

Put these exact decisions in the Phase 5 doc.

1) Tenant model

Use this model:

1 Clerk Organization = 1 employer tenant
Every tenant-owned record must carry tenantId
Every protected read/write must check the active tenant
Internal staff routes are separate from employer routes
No PHI goes into Clerk metadata
Clerk handles identity; app code handles authorization and tenant scoping

Clerk’s Organizations are built for multi-tenant B2B apps with roles and permissions, which fits this app shape.

2) Canonical roles

Use this exact first-pass role set:

platform_admin
internal_ops_admin
internal_reviewer
employer_admin
employer_member
read_only_auditor

Do not try to model every future edge case now.

3) Canonical permissions

Use these exact permission keys:

tenant:view
tenant:manage_members
application:create
application:view_own
application:edit_own
application:submit
application:view_all
application:review
application:change_status
audit:view
system:admin
4) Role-to-permission matrix

Lock this:

platform_admin
all permissions
internal_ops_admin
tenant:view
application:view_all
application:review
application:change_status
audit:view
internal_reviewer
application:view_all
application:review
employer_admin
tenant:view
tenant:manage_members
application:create
application:view_own
application:edit_own
application:submit
employer_member
tenant:view
application:view_own
application:edit_own
read_only_auditor
audit:view
application:view_all
Build steps
Step 1

Create a new branch.

git checkout -b phase-5-authorization-tenant-rules
Step 2

Create the Phase 5 source-of-truth file:

docs/rebuild.phase-5-authorization-and-tenant-rules.md

Put in it:

goal
tenant model
canonical roles
canonical permissions
role matrix
route classes
pass/fail exit criteria
Step 3

Create web/lib/permissions.ts

This file should contain:

the role list
the permission list
the role-permission map
helper functions like:
hasRole()
hasPermission()

Critical rule: this file is the app’s canonical policy map.

Step 4

Create web/lib/authz.ts

This file should contain server-side helpers such as:

requireSignedIn()
requireTenantMember()
requirePermission(permission)
requireInternalRole()
assertTenantAccess(recordTenantId)

Use Clerk server auth helpers here, not client-side checks. Clerk’s current docs specifically support server-side auth() and authorization checks, and recommend has() for flexible permission checks.

Step 5

Create web/types/globals.d.ts

Define your Clerk auth types so the role/permission keys are typed instead of loose strings. Clerk’s current docs support adding a global ClerkAuthorization interface for this exact purpose.

Step 6

Create web/proxy.ts

Do this, not middleware.ts, because your app is on Next.js 16.

Protect these route groups:

/dashboard(.*)
/app(.*)
/admin(.*)
/api/private(.*)

Use clerkMiddleware() plus createRouteMatcher().

Important: the proxy only blocks obvious bad access early. It is not the final security boundary. Clerk and Next.js guidance both support treating middleware/proxy as route interception, while authorization still needs to happen in server code.

Step 7

Refactor routes into clear classes

Use this structure:

public routes
/
/sign-in
/sign-up
employer routes
/app
/app/application
/app/application/review
internal routes
/admin
/admin/applications

Do not leave everything under one generic dashboard anymore.

Step 8

Add server-side guards to every protected page

For each protected page:

check sign-in
check tenant membership if external
check required permission
deny by redirect, 403, or 404 depending on route sensitivity

Current Clerk docs support both auth-based and authorization-based protection at the route level.

Step 9

Add at least one protected route handler

Create something like:

web/app/api/private/me/route.ts
or web/app/api/private/tenant-check/route.ts

This route must:

require signed-in user
require tenant context or internal role
return 401 if not signed in
return 403 if signed in but not allowed

This is the proof point for the Phase 5 success condition that authorization is enforced in the backend, not just the UI.

Step 10

Add role-aware navigation

Examples:

employer users see self-service application links
reviewers see admin queue links
auditors see read-only views only
non-admins never see admin actions

This is convenience only. It is not the real security layer.

Step 11

Write the minimum tests

You want these passing:

unauthenticated user cannot access /dashboard
unauthenticated user cannot access /admin
employer user cannot access admin routes
reviewer can access review queue but not tenant member management
read-only auditor cannot mutate anything
wrong-tenant request is denied
Step 12

Run local validation

Run your normal local checks, then manually verify:

sign in
sign out
employer route access
admin route denial
admin route success with correct role
protected API denial/success paths
What not to do in Phase 5

Do not do these yet:

database schema design
migrations
draft persistence redesign
CI/CD changes
staging deploy changes
observability work
feature rebuild

Those belong to later phases in your project sequence.

Pass / fail exit criteria

Phase 5 is complete only if all of these are true:

protected routes are actually protected
admin routes require admin-side permissions
at least one server route enforces authorization
tenant scoping exists as a real rule, not a future note
role and permission names are locked in a source-of-truth doc
UI hiding is not the only control
local tests for authz behavior pass
Next phase handoff

Phase 6 = Database architecture.
Once Phase 5 is done, the next phase is to lock schema strategy, migrations, seed approach, service credentials, backup, and restore process.

Codex prompt

Use this exactly:

You are implementing Phase 5 of the app rebuild.

Read and follow these locked requirements:

1. This phase is Authorization and Tenant Rules.
2. Do not add feature work, CI/CD work, observability work, or database architecture changes.
3. Clerk handles authentication only. The app must enforce authorization and tenant isolation in server-side code.
4. Use Next.js 16 conventions. Use proxy.ts, not middleware.ts.
5. Protect routes with clerkMiddleware/createRouteMatcher, but do not rely on proxy alone. Also enforce checks in server-side helpers and protected route handlers/pages.
6. Use 1 Clerk Organization = 1 employer tenant.
7. No PHI in Clerk metadata.
8. Create these files if missing:
   - docs/rebuild.phase-5-authorization-and-tenant-rules.md
   - web/proxy.ts
   - web/lib/permissions.ts
   - web/lib/authz.ts
   - web/types/globals.d.ts
9. Lock these roles:
   - platform_admin
   - internal_ops_admin
   - internal_reviewer
   - employer_admin
   - employer_member
   - read_only_auditor
10. Lock these permissions:
   - tenant:view
   - tenant:manage_members
   - application:create
   - application:view_own
   - application:edit_own
   - application:submit
   - application:view_all
   - application:review
   - application:change_status
   - audit:view
   - system:admin
11. Refactor route classes into:
   - public
   - employer
   - admin
12. Add at least one protected private API route proving backend authorization.
13. Add minimal tests for authz success/failure.
14. Keep changes owner-operable and simple.

Return:
- a summary of changes
- exact files created/changed
- commands to run locally
- any blockers

One real caution before you hand this to Codex: the uploaded Phase 4 zip looks like a partial working snapshot, not a full repo snapshot, so apply Phase 5 against the real repo branch, not just the uploaded zip. The overall project standard is still the same: owner-operable, staged, controlled delivery, not feature-first drift.