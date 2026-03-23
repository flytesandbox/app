Phase 1 Reboot

The tenant scope changed in the development of Phase 5 which constituted a reboot in ensuring Phase 1 specs, documentation, etc are in line with these changes. 

Here is the content from the Phase 5 Support Chat for review. The is to patch Phase 1 and Phase 5, and then review 2 and 3 to ensure continuity. If all checks, then i'll continue working on Phase 5 in that chat. .

You are only working on reviewing and suggesting changes to Phase 1. Read all Phase 1 material as well as the Phase 1 notes attached. 

Begin Phase 5 Support Chat content: 
Phase 5 Support

Read all of the chats in the App Test project. We are working on Phase 5 only. All other Phase are green lights go. 

This chat is for Phase 5 Support only. 

Quick answer
Generate the outline the exact content that is needed for this step and instructions on where to put it: 

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

I’m pulling the Phase 5 source material together and turning it into a drop-in file for the repo, not a loose outline. After that I’ll give you the exact path and what to do with it.

Thought for 37s

Put this file in the repo at:

docs/rebuild.phase-5-authorization-and-tenant-rules.md

That matches the project rule that each phase should produce the goal, source-of-truth decisions, and pass/fail exit criteria, and Phase 5 specifically is for roles, permission matrix, backend guards, and tenant/resource isolation. 

App-test-project-Source-of-Truth

 Phase 5 also needs backend-enforced authorization, not UI-only checks, with Clerk handling authentication and the backend enforcing tenant isolation, role permissions, resource ownership, and action-level checks. 

App-test-project-Source-of-Truth

 

Dev-process

Use this exact file content:

# Phase 5 — Authorization and Tenant Rules

## Goal

Define the canonical authorization model for the rebuilt application so that:

- Clerk handles authentication only.
- The backend is the source of truth for authorization.
- Every protected action is checked against role, permission, tenant scope, and resource scope.
- Internal admin activity is separated from tenant-facing activity.
- Tenant isolation is enforced before Phase 6 database work and before Phase 9 feature rebuild work.

This file is the source of truth for Phase 5 only.

---

## Tenant Model

### 1) Core tenant rule

A tenant is a single employer organization using the application.

All tenant-owned records must include tenant_id.

Examples of tenant-owned records:

- employer profile
- application draft
- submitted application
- uploaded file metadata
- employee census data
- plan configuration data
- review notes intended for that tenant workflow

### 2) Internal vs tenant boundary

Internal Flyte/admin users are **not** members of a customer tenant by default.

Internal users operate with platform or internal scope and may access tenant data only through explicit internal roles and permissions.

### 3) Membership rule

A user may belong to:

- zero tenants
- one tenant
- multiple tenants

If a user belongs to multiple tenants, the active tenant must be explicit in the session or request context.

### 4) Isolation rule

No tenant-scoped read or write may execute unless the backend has resolved:

- authenticated user id
- active tenant id
- role assignment for that tenant
- permission required for the action

### 5) Resource ownership rule

Every tenant-owned resource must be checked against:

- tenant_id
- resource type
- action requested
- role permissions for the current user

### 6) Internal review rule

Internal review workflows may read across tenants only for users with approved internal roles.

Cross-tenant access is never available to standard tenant users.

### 7) Default deny rule

If tenant scope, role mapping, or permission mapping is missing, the request fails closed.

---

## Canonical Roles

These are the only canonical roles allowed for Phase 5.

### 1) platform_admin

Highest system authority.

Use for:

- platform-wide configuration
- tenant lifecycle control
- internal user role administration
- global policy visibility
- break-glass access if later approved by policy

### 2) internal_ops

Internal Flyte operations/admin staff.

Use for:

- reviewing employer applications
- moving applications through internal workflows
- reading tenant submissions required for support and processing
- adding internal review notes
- requesting corrections from tenant users

### 3) external_admin

Primary customer admin for a tenant.

Use for:

- creating and managing the employer account
- managing tenant members
- editing and submitting applications
- viewing tenant-scoped data and statuses
- managing tenant uploads and application progress

### 4) manager

Secondary tenant operator.

Use for:

- editing application data
- managing assigned workflow steps
- viewing tenant records
- uploading required files
- preparing submissions

Cannot manage tenant membership unless explicitly granted later.

### 5) end_user

Basic tenant member.

Use for:

- viewing assigned or self-service workflow data
- saving limited input
- uploading allowed documents
- resuming their own assigned process

Cannot manage tenant settings, roles, or full application submission unless explicitly granted later.

### 6) read_only_auditor

Read-only internal or compliance viewer.

Use for:

- read-only access to approved records
- audit inspection
- compliance review

Cannot edit, submit, approve, or administer.

### 7) service_account

Non-human system identity.

Use for:

- background jobs
- internal service-to-service operations
- migration-safe automation where explicitly allowed

Service accounts must never be used as a shortcut for user authorization.

---

## Canonical Permissions

Permissions are action-based and backend-enforced.

### Tenant membership permissions

- tenant.members.read
- tenant.members.invite
- tenant.members.update_role
- tenant.members.remove

### Tenant settings permissions

- tenant.settings.read
- tenant.settings.update

### Employer/application permissions

- application.create
- application.read
- application.update
- application.submit
- application.delete_draft
- application.status.read

### Upload permissions

- upload.create
- upload.read
- upload.delete

### Internal review permissions

- review.queue.read
- review.item.read
- review.item.update
- review.note.create
- review.note.read
- review.request_changes
- review.advance_status

### Audit/report permissions

- audit.read
- export.read

### Platform permissions

- platform.tenants.read
- platform.tenants.create
- platform.tenants.update
- platform.roles.manage
- platform.policy.manage

### System permissions

- system.jobs.run
- system.webhooks.process

---

## Role Matrix

| Role | Tenant Scope | Members | Settings | Application | Uploads | Internal Review | Audit/Export | Platform |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| platform_admin | global | full | full | full | full | full | full | full |
| internal_ops | internal + approved tenant access | none | read | read/update where assigned by workflow | read | full | limited read/export | none |
| external_admin | own tenant only | full | full | full | full | none | limited read/export for own tenant only | none |
| manager | own tenant only | none | read | create/read/update | create/read | none | none | none |
| end_user | own tenant only | none | none | limited read/update on assigned workflow only | create/read where allowed | none | none | none |
| read_only_auditor | approved scope only | none | read | read | read | read only | read/export as approved | none |
| service_account | explicit system scope only | none | none | none unless explicitly required by backend job | none unless explicitly required by backend job | none unless explicitly required by backend job | none | system only |

### Matrix interpretation rules

- “own tenant only” means all queries and mutations must include tenant scoping in the backend.
- “full” means full access only within allowed scope, not unrestricted global access unless the role is global.
- “limited” means the backend must narrow access to assigned resource scope or approved workflow scope.
- Hidden UI elements do not count as authorization.

---

## Route Classes

These route classes are canonical for the rebuilt app.

### 1) Public

No auth required.

Examples:

- landing page
- marketing pages
- sign-in entry
- sign-up entry

Rule:

- no tenant data
- no internal data
- no authenticated-only app content

### 2) Authenticated

Any signed-in user.

Examples:

- account shell
- profile
- session bootstrap
- tenant chooser if multi-tenant

Rule:

- requires valid session
- still not enough for tenant data without role and tenant scope

### 3) Tenant Member

Signed-in user with valid membership in the active tenant.

Examples:

- tenant dashboard
- draft/resume application
- tenant uploads
- application status

Rule:

- backend must verify membership and active tenant
- all resource access filtered by tenant_id

### 4) Tenant Admin

Signed-in tenant user with elevated tenant role.

Examples:

- tenant settings
- member invites
- member role management
- final submission actions

Rule:

- requires external_admin or later approved equivalent permission grants

### 5) Internal Only

Signed-in internal Flyte/admin user.

Examples:

- internal review queue
- application processing screens
- internal notes
- request-changes workflows

Rule:

- never accessible to tenant users
- must require internal role permission checks in backend

### 6) Platform Only

Highest privileged internal platform routes.

Examples:

- tenant lifecycle admin
- policy admin
- role model admin
- break-glass tools if later approved

Rule:

- restricted to platform_admin
- must be separately guarded from normal internal ops

### 7) Service/Internal Machine Routes

Non-browser routes for trusted backend/service use.

Examples:

- webhook handlers
- background job callbacks
- internal task endpoints

Rule:

- no browser-session trust
- must use service authentication and explicit system permission checks

---

## Pass/Fail Exit Criteria

Phase 5 passes only if all items below are true.

### Pass

- canonical tenant model is documented
- canonical roles are locked
- canonical permissions are locked
- role matrix is documented
- route classes are documented
- default-deny behavior is explicit
- backend authorization is defined as source of truth
- tenant isolation is defined as mandatory for every tenant-owned resource
- internal-only and tenant-only boundaries are separated
- this file is committed as the source of truth for Phase 5

### Fail

Phase 5 fails if any of the following are still true:

- roles exist only in UI thinking and not in backend policy thinking
- Clerk metadata is being treated as the only authorization layer
- tenant boundaries are implied but not defined
- internal admin routes and tenant routes are mixed together without route class rules
- permissions are vague or feature-by-feature without canonical naming
- route protection is based on hidden buttons instead of backend checks
- multi-tenant membership behavior is undefined
- default deny behavior is not explicit

---

## Phase 5 Implementation Rules

These rules now apply to future build work.

1. Authentication and authorization stay separate.
2. Clerk proves identity. Backend proves access.
3. Every protected request must resolve role, permission, and scope.
4. Every tenant-owned record must carry tenant_id.
5. No cross-tenant access for tenant users.
6. Internal review access must be role-based and explicit.
7. Frontend route guards are convenience only, not source of truth.
8. Backend checks are mandatory for reads, writes, exports, and status changes.
9. Missing scope or permission means deny.
10. Phase 6 database design must implement this authorization model, not invent a new one.

Do this:

Open your repo in VS Code.

Open the docs folder at the repo root.

Create a new file named rebuild.phase-5-authorization-and-tenant-rules.md.

Paste the content above into that file.

Save it.

Commit it to your Phase 5 branch or current working branch.

One adjustment I made on purpose: I tailored the tenant model to your actual app shape — public employer application flow plus internal admin review flow — instead of leaving it generic. That matches the project synopsis and the requirement that the rebuild be owner-operable and authorization be enforced in the backend, not just the UI. 

App-test-project-Source-of-Truth

 

App-test-project-Source-of-Truth

 

Developer

The main blind spot to avoid here: do not let Codex invent extra roles or ad hoc permissions after this file is committed. This file is supposed to lock the Phase 5 model before Phase 6 and Phase 9 work. 

App-test-project-Source-of-Truth

 

Dev-process

After you save this, the next support step is turning this source-of-truth file into the backend guard rules and route guard map.

Sources
This output looks nothing like what the Phase 5 chat instructed me to enter into that file. That file exists and contains the exact contents Phase 5 chat instructed me to add. Why is there a discrepancy. Your instructions were to know who whole scope(all chats in the app test project) and focus your work on only Phase 5. Then I pasted content from Phase 5 chat into this as parameters for what to focus on with Phase 5, and you tell me something different than you did the first time. Where is the discrepancy and what can be done in this chat to ensure you stay focused on generating instructions for executing Phase 5.

I’m checking the actual Phase 5 source material and the uploaded project docs to isolate where I drifted from the existing phase instructions. Then I’ll pin down a stricter operating rule for this support chat so it stays locked to execution support only.

Thought for 36s

You’re right. The discrepancy is on me.

I drifted in two ways:

I generated a new Phase 5 source-of-truth document instead of supporting the one your Phase 5 chat already established.

I answered from generalized Phase 5 project guidance instead of staying locked to the exact execution task you gave in this support chat.

The project sources are clear that each phase chat should produce that phase’s exact deliverables and source-of-truth decisions, and that Phase 5 is specifically about roles, permission matrix, backend guards, and tenant/resource isolation. 

App-test-project-Source-of-Truth

 

App-test-project-Source-of-Truth

 The same source also says the rebuild should be phase-by-phase, one chat per phase, with one job and one source-of-truth output. 

App-test-project-Source-of-Truth

So the exact problem is this:

Your Phase 5 chat already defined the file content.

Your message here asked me to help execute Step 2 for that phase.

I should have either:

reproduced the exact structure already established by that Phase 5 chat, or

told you plainly that I did not have the verbatim Phase 5 file text in this thread and therefore should not invent it.

Instead, I improvised a fuller replacement document from the broader RBAC guidance in the project docs, such as Clerk = auth, backend = authorization, recommended roles, and tenant/resource scope rules. Those concepts are valid project-wide, but that was still the wrong move for this chat because it changed the deliverable instead of supporting execution. 

App-test-project-Source-of-Truth

 

Dev-process

 

Dev-process

Where the discrepancy came from

The uploaded project files give me the Phase 5 scope, but they do not give me the verbatim contents of the exact file your Phase 5 chat told you to create. What I had available was:

Phase 5 = authorization and tenant rules. 

App-test-project-Source-of-Truth

Expected topics = roles, permission matrix, backend guards, tenant/resource isolation. 

App-test-project-Source-of-Truth

Clear instruction style needed = begin/end clarity, no noise, step-by-step. 

Developer

What I did not have in this thread was the exact prior Phase 5 chat output word-for-word. So the failure was not just content drift. It was also that I treated the project scope as permission to regenerate the artifact.

What can be done in this chat to keep Phase 5 support focused

Use this operating rule for this chat going forward:

In this Phase 5 Support chat, I should do only one of these three things:

Explain a Phase 5 step

Translate a Phase 5 instruction into exact execution steps

Validate whether what you already created matches the Phase 5 source-of-truth

And I should not do these unless you explicitly ask:

rewrite the Phase 5 source-of-truth

improve or expand Phase 5 decisions

invent alternate Phase 5 content

jump ahead to Phase 6+

Best control to prevent drift

For any step tied to a prior phase artifact, I should anchor to one of these only:

the exact text you paste from the Phase 5 chat

the exact file contents you paste from the repo

a direct compare of “what Phase 5 says” vs “what exists in the repo”

If the exact text is not present in this thread, I should say:

“I can support execution, but I should not regenerate the file content from scratch.”

Clean rule set for this chat from now on

I will treat this chat as:

Phase 5 only

support only

execution only

no replacement source-of-truth generation unless you explicitly ask for a rewrite

So when you ask about a step, I’ll answer in this format:

what the step is doing

exact file/path/location

exact action to take

what result you should see

what would count as wrong

That matches your project’s phase method and your need for clear, low-noise instructions. 

App-test-project-Source-of-Truth

 

Developer

If you want, paste the exact Step 2 content block from the Phase 5 chat here, and I’ll convert it into strict execution instructions only, with no rewriting.

Sources
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
Thought for 10s

For Step 2 only, the required content is just the file and these section headers.

Put this file here:

docs/rebuild.phase-5-authorization-and-tenant-rules.md

Put exactly this in it:

# Phase 5 — Authorization and Tenant Rules

## Goal

## Tenant Model

## Canonical Roles

## Canonical Permissions

## Role Matrix

## Route Classes

## Pass/Fail Exit Criteria

Execution steps:

Open your repo root.

Open the docs folder.

Create this file:
rebuild.phase-5-authorization-and-tenant-rules.md

Paste the content above into the file.

Save it.

What this means:

If the Phase 5 chat only instructed you to create the source-of-truth file with those sections, then this is the correct Step 2 output.

If that file already exists and already contains those exact sections, then Step 2 is already complete.

The earlier discrepancy happened because I expanded the file into a full authored document. For this step, I should have stayed literal and given you only the required Phase 5 scaffold.

Have these been created/developed yet? 

I’m checking whether those sections already exist in the current project materials versus being placeholders for Phase 5. Then I’ll tell you what is already defined and what still needs to be authored.

Thought for 1m 22s

Partially.

What is already developed in the project materials:

Phase 5 itself is defined as “Authorization and tenant rules,” and its intended scope is roles, permission matrix, backend guards, and tenant/resource isolation. 

App-test-project-Source-of-Truth

The broader source-of-truth already locks the rule that Clerk handles authentication, while the app/backend must enforce authorization, tenant boundaries, role permissions, and action-level checks. 

App-test-project-Source-of-Truth

The project materials also already point to a recommended RBAC shape with roles like platform_admin, internal_ops, external_admin, manager, end_user, read_only_auditor, and service_account, plus scoped fields like tenant_id, org_id, and resource_scope. 

Dev-process

 

Dev-process

The current repo reference materials already show some tenant/data ownership thinking, such as tenant-scoped records carrying an association/tenant key and an identity-access module containing roles and bindings. 

App-test-project-Source-of-Truth

 and from the repo reference data-ownership.md: tenant-scoped tables include association_id, and there are logical tables for roles, role bindings, scopes, and policy overrides.

What I cannot confirm as already created from the accessible project files:

I do not see a committed file named docs/rebuild.phase-5-authorization-and-tenant-rules.md in the uploaded app-main.zip.

I also do not see evidence in the accessible files that the exact Step 2 sections have all been fully authored as a dedicated locked Phase 5 document:

goal

tenant model

canonical roles

canonical permissions

role matrix

route classes

pass/fail exit criteria

So the accurate answer is:

Conceptually: yes, a good portion of this has already been developed in scattered form. 

App-test-project-Source-of-Truth

 

Dev-process

As a single formal Phase 5 source-of-truth file with those exact sections: I cannot confirm that from the accessible repo artifacts, and the uploaded repo zip does not show that file. 

App-test-project-Source-of-Truth

The practical takeaway: the ideas exist, but the dedicated Phase 5 lock file may still need to be assembled unless you already created it in your live repo outside the uploaded zip.

Paste the current contents of docs/rebuild.phase-5-authorization-and-tenant-rules.md here and I’ll tell you immediately whether those seven sections are just placeholders or actually developed.

Sources
Here are the current contents of the Phase 5 notes: 

Phase 5 goal

Build the first real access-control layer so the app knows:
1. who the user is
2. which tenant they belong to
3. what they are allowed to do
4. which routes and records they must never touch

Exact deliverables for Phase 5
Create these in the real repo:

1. docs/rebuild.phase-5-authorization-and-tenant-rules.md
2. web/proxy.ts
3. web/lib/permissions.ts
4. web/lib/authz.ts
5. web/types/globals.d.ts
6. protected external route area
7. protected internal admin route area
8. at least one protected API route proving server-side authorization
9. one small test set covering authz failures and successes


Source-of-truth decisions to lock in this phase
Put these exact decisions in the Phase 5 doc.

Tenant model
Use this model:
- 1 Clerk Organization = 1 employer tenant
- Every tenant-owned record must carry tenantId
- Every protected read/write must check the active tenant
- Internal staff routes are separate from employer routes
- No PHI goes into Clerk metadata
- Clerk handles identity; app code handles authorization and tenant scoping

Clerk’s Organizations are built for multi-tenant B2B apps with roles and permissions, which fits this app shape.


Canonical roles
Use this exact first-pass role set:
- platform_admin
- internal_ops_admin
- internal_reviewer
- employer_admin
- employer_member
- read_only_auditor

Do not try to model every future edge case now.


Canonical permissions
Use these exact permission keys:
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

Role-to-permission matrix
Lock this:
- platform_admin
  - all permissions
- internal_ops_admin
  - tenant:view
  - application:view_all
  - application:review
  - application:change_status
  - audit:view
- internal_reviewer
  - application:view_all
  - application:review
- employer_admin
  - tenant:view
  - tenant:manage_members
  - application:create
  - application:view_own
  - application:edit_own
  - application:submit
- employer_member
  - tenant:view
  - application:view_own
  - application:edit_own
- read_only_auditor
  - audit:view
  - application:view_all
Thought for 8s

Yes—most of Step 2 is already developed in your notes.

Based on what you pasted:

Already developed

Goal

Tenant model

Canonical roles

Canonical permissions

Role matrix

Not shown yet in what you pasted

Route classes

Pass/fail exit criteria

So for the Step 2 file, you are not starting from scratch. You already have the core Phase 5 decisions written. What’s left is to make sure they are placed under the exact Phase 5 doc headings and then add the missing sections.

The clean read is:

Your notes are already beyond a blank scaffold.

They are not yet complete for Step 2 unless the missing sections exist lower in the notes and just were not included in your paste.

What the file should contain at minimum is this structure:

# Phase 5 — Authorization and Tenant Rules

## Goal
[paste your goal content]

## Tenant Model
[paste your tenant model content]

## Canonical Roles
[paste your canonical roles]

## Canonical Permissions
[paste your canonical permissions]

## Role Matrix
[paste your role-to-permission matrix]

## Route Classes
[still needs to be added unless already written elsewhere]

## Pass/Fail Exit Criteria
[still needs to be added unless already written elsewhere]

So the accurate answer is:

Yes, five of the seven Step 2 content blocks appear to already be developed.
No, the Step 2 document is not fully complete yet unless route classes and pass/fail criteria already exist elsewhere in your Phase 5 notes.

Paste the rest of the Phase 5 notes and I’ll tell you exactly whether Step 2 is fully complete or what is still missing.

Here are the new Phase 5 notes. Generate the content needed to finish this so we can move to step 3: 

Phase 5 goal

Build the first real access-control layer so the app knows:
1. who the user is
2. which tenant they belong to
3. what they are allowed to do
4. which routes and records they must never touch

Exact deliverables for Phase 5
Create these in the real repo:

1. docs/rebuild.phase-5-authorization-and-tenant-rules.md
2. web/proxy.ts
3. web/lib/permissions.ts
4. web/lib/authz.ts
5. web/types/globals.d.ts
6. protected external route area
7. protected internal admin route area
8. at least one protected API route proving server-side authorization
9. one small test set covering authz failures and successes


Source-of-truth decisions to lock in this phase
Put these exact decisions in the Phase 5 doc.

Tenant model
Use this model:
- 1 Clerk Organization = 1 employer tenant
- Every tenant-owned record must carry tenantId
- Every protected read/write must check the active tenant
- Internal staff routes are separate from employer routes
- No PHI goes into Clerk metadata
- Clerk handles identity; app code handles authorization and tenant scoping

Clerk’s Organizations are built for multi-tenant B2B apps with roles and permissions, which fits this app shape.


Canonical roles
Use this exact first-pass role set:
- platform_admin
- internal_ops_admin
- internal_reviewer
- employer_admin
- employer_member
- read_only_auditor

Do not try to model every future edge case now.


Canonical permissions
Use these exact permission keys:
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

Role-to-permission matrix
Lock this:
- platform_admin
  - all permissions
- internal_ops_admin
  - tenant:view
  - application:view_all
  - application:review
  - application:change_status
  - audit:view
- internal_reviewer
  - application:view_all
  - application:review
- employer_admin
  - tenant:view
  - tenant:manage_members
  - application:create
  - application:view_own
  - application:edit_own
  - application:submit
- employer_member
  - tenant:view
  - application:view_own
  - application:edit_own
- employee_member
  - tenant:view
  - application:view_own
  - application:edit_own
- advisor_admin
  - tenant:view
  - tenant:manage_members
  - application:view_own
  - application:edit_own
- advisor_member
  - tenant:view
  - application:view_own
  - application:edit_own
- read_only_auditor
  - audit:view
  - application:view_all
Thought for 17s

You have one conflict in the notes that needs to be locked before Step 2 is truly finished:

Your earlier “exact first-pass role set” is now outdated because the newer role matrix adds:

employee_member

advisor_admin

advisor_member

So the Canonical Roles section must be updated to match the newer matrix. Otherwise your Phase 5 doc will conflict with itself.

Use this as the finished content for the missing/updated parts of the Phase 5 file.

Canonical Roles

Use this exact first-pass role set:

platform_admin

internal_ops_admin

internal_reviewer

employer_admin

employer_member

employee_member

advisor_admin

advisor_member

read_only_auditor

Do not try to model every future edge case now.

Route Classes

Use this exact route-class model:

Public

Routes that require no sign-in.

Examples:

landing page

marketing pages

sign-in

sign-up

Rules:

no tenant-owned data

no internal admin data

no protected application records

Authenticated but not tenant-approved

Routes that require sign-in but do not yet allow protected tenant data access.

Examples:

account shell

post-login loading state

organization chooser

unauthorized page

Rules:

user identity is known

protected tenant reads/writes are still blocked until tenant and role are resolved

External employer/advisor area

Routes for employer and advisor users working inside their active tenant.

Examples:

employer dashboard

application flow

tenant member management for allowed roles

advisor-facing tenant workflow pages

Rules:

must require authenticated user

must require active Clerk Organization

must require matching tenantId scope

must enforce permission checks server-side

employer/advisor users must never access internal staff routes

Internal staff admin area

Routes for internal operations and reviewers.

Examples:

internal review queue

application review screens

status-change actions

audit screens where allowed

Rules:

must require authenticated internal user

must not rely on employer tenant navigation

must be separated from external employer/advisor routes

must enforce role and permission checks server-side

Protected API routes

Server routes that read or mutate protected data.

Examples:

application read/update endpoints

status change endpoints

tenant membership endpoints

Rules:

every protected API route must check:

authenticated user

active tenant when tenant-scoped

role

required permission

tenant ownership of the target record

API authorization is mandatory even if the UI already hides the action

Forbidden routes

Any route a user must never touch.

Rules:

external users must never access internal staff routes

internal staff must only access tenant-scoped records through approved permissions

users must never access records from another tenant

missing tenant, missing role, or missing permission must fail closed

Pass/Fail Exit Criteria
Pass

Phase 5 passes only if all of the following are true:

docs/rebuild.phase-5-authorization-and-tenant-rules.md exists in the repo

the Phase 5 doc locks:

goal

tenant model

canonical roles

canonical permissions

role matrix

route classes

pass/fail exit criteria

web/proxy.ts exists and protects the intended route groups

web/lib/permissions.ts exists and defines the canonical permission model

web/lib/authz.ts exists and provides reusable authorization checks

web/types/globals.d.ts exists if needed for typed request/session shaping

there is a protected external route area

there is a protected internal admin route area

at least one protected API route proves server-side authorization

at least one small test set proves both authz success and authz failure paths

server-side checks enforce tenant scoping and permission checks

Clerk is used for identity, not as the only authorization layer

Fail

Phase 5 fails if any of the following are true:

route protection exists only in the UI

protected API routes do not enforce server-side authorization

tenant-owned records are accessed without tenantId checks

internal staff and external employer/advisor routes are mixed together

role names and role matrix do not match

canonical permissions are undocumented or changed ad hoc in code

a user can access another tenant’s records

the active tenant is not checked on protected reads/writes

Clerk metadata is used to store PHI

there is no test coverage for both allowed and denied authorization cases

What to do in the file

Your Phase 5 file should now contain these sections:

# Phase 5 — Authorization and Tenant Rules

## Goal

## Tenant Model

## Canonical Roles

## Canonical Permissions

## Role Matrix

## Route Classes

## Pass/Fail Exit Criteria
Required cleanup before moving on

Update the Canonical Roles section so it matches the expanded matrix. That is the only real inconsistency left in the notes you pasted.

Practical next move

Once that file is updated with the completed sections above, Step 2 is done and you can move to Step 3.

REview the udpated notes and determine if we're on track to move forward on Phase 5: 
Phase 5 goal

Build the first real access-control layer so the app knows:
1. who the user is
2. which tenant they belong to
3. what they are allowed to do
4. which routes and records they must never touch

Exact deliverables for Phase 5
Create these in the real repo:

1. docs/rebuild.phase-5-authorization-and-tenant-rules.md
2. web/proxy.ts
3. web/lib/permissions.ts
4. web/lib/authz.ts
5. web/types/globals.d.ts
6. protected external route area
7. protected internal admin route area
8. at least one protected API route proving server-side authorization
9. one small test set covering authz failures and successes


Source-of-truth decisions to lock in this phase
Put these exact decisions in the Phase 5 doc.

Tenant model
Use this model:
- 1 Clerk Organization = 1 employer tenant
- Every tenant-owned record must carry tenantId
- Every protected read/write must check the active tenant
- Internal staff routes are separate from employer routes
- No PHI goes into Clerk metadata
- Clerk handles identity; app code handles authorization and tenant scoping

Clerk’s Organizations are built for multi-tenant B2B apps with roles and permissions, which fits this app shape.


Canonical roles
Use this exact first-pass role set:
- platform_admin
- internal_ops_admin
- internal_reviewer
- employer_admin
- employer_member
- employee_member
- advisor_admin
- advisor_member
- read_only_auditor

Do not try to model every future edge case now.


Canonical permissions
Use these exact permission keys:
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

Role-to-permission matrix
Lock this:
- platform_admin
  - all permissions
- internal_ops_admin
  - tenant:view
  - application:view_all
  - application:review
  - application:change_status
  - audit:view
- internal_reviewer
  - application:view_all
  - application:review
- employer_admin
  - tenant:view
  - tenant:manage_members
  - application:create
  - application:view_own
  - application:edit_own
  - application:submit
- employer_member
  - tenant:view
  - application:view_own
  - application:edit_own
- employee_member
  - tenant:view
  - application:view_own
  - application:edit_own
- advisor_admin
  - tenant:view
  - tenant:manage_members
  - application:view_own
  - application:edit_own
- advisor_member
  - tenant:view
  - application:view_own
  - application:edit_own
- read_only_auditor
  - audit:view
  - application:view_all


Route Classes
Use this exact route-class model:
Public
Routes that require no sign-in.
Examples:
•	landing page
•	marketing pages
•	sign-in
•	sign-up
Rules:
•	no tenant-owned data
•	no internal admin data
•	no protected application records
Authenticated but not tenant-approved
Routes that require sign-in but do not yet allow protected tenant data access.
Examples:
•	account shell
•	post-login loading state
•	organization chooser
•	unauthorized page
Rules:
•	user identity is known
•	protected tenant reads/writes are still blocked until tenant and role are resolved
External employer/advisor area
Routes for employer and advisor users working inside their active tenant.
Examples:
•	employer dashboard
•	application flow
•	tenant member management for allowed roles
•	advisor-facing tenant workflow pages
Rules:
•	must require authenticated user
•	must require active Clerk Organization
•	must require matching tenantId scope
•	must enforce permission checks server-side
•	employer/advisor users must never access internal staff routes
Internal staff admin area
Routes for internal operations and reviewers.
Examples:
•	internal review queue
•	application review screens
•	status-change actions
•	audit screens where allowed
Rules:
•	must require authenticated internal user
•	must not rely on employer tenant navigation
•	must be separated from external employer/advisor routes
•	must enforce role and permission checks server-side
Protected API routes
Server routes that read or mutate protected data.
Examples:
•	application read/update endpoints
•	status change endpoints
•	tenant membership endpoints
Rules:
•	every protected API route must check:
o	authenticated user
o	active tenant when tenant-scoped
o	role
o	required permission
o	tenant ownership of the target record
•	API authorization is mandatory even if the UI already hides the action
Forbidden routes
Any route a user must never touch.
Rules:
•	external users must never access internal staff routes
•	internal staff must only access tenant-scoped records through approved permissions
•	users must never access records from another tenant
•	missing tenant, missing role, or missing permission must fail closed





  
Pass/Fail Exit Criteria
Pass
Phase 5 passes only if all of the following are true:
•	docs/rebuild.phase-5-authorization-and-tenant-rules.md exists in the repo
•	the Phase 5 doc locks:
o	goal
o	tenant model
o	canonical roles
o	canonical permissions
o	role matrix
o	route classes
o	pass/fail exit criteria
•	web/proxy.ts exists and protects the intended route groups
•	web/lib/permissions.ts exists and defines the canonical permission model
•	web/lib/authz.ts exists and provides reusable authorization checks
•	web/types/globals.d.ts exists if needed for typed request/session shaping
•	there is a protected external route area
•	there is a protected internal admin route area
•	at least one protected API route proves server-side authorization
•	at least one small test set proves both authz success and authz failure paths
•	server-side checks enforce tenant scoping and permission checks
•	Clerk is used for identity, not as the only authorization layer

Fail
Phase 5 fails if any of the following are true:
•	route protection exists only in the UI
•	protected API routes do not enforce server-side authorization
•	tenant-owned records are accessed without tenantId checks
•	internal staff and external employer/advisor routes are mixed together
•	role names and role matrix do not match
•	canonical permissions are undocumented or changed ad hoc in code
•	a user can access another tenant’s records
•	the active tenant is not checked on protected reads/writes
•	Clerk metadata is used to store PHI
•	there is no test coverage for both allowed and denied authorization cases
Thought for 18s

Yes. You are on track to move forward with Phase 5.

These notes are now strong enough to support implementation of:

the Phase 5 source-of-truth doc

permission constants

authz helper logic

route protection split

at least one protected API proof

a small success/failure test set

What is solid

You have the core decisions locked:

clear Phase 5 goal

clear tenant model

canonical roles

canonical permissions

role-to-permission matrix

route classes

pass/fail exit criteria

That is enough to proceed into Step 3 and start creating the actual authorization files.

What still needs tightening before code drifts

You do not need to stop Phase 5. But there are a few blind spots that should be tightened now so implementation stays clean.

1. Advisor membership is still structurally ambiguous

Your tenant model says:

1 Clerk Organization = 1 employer tenant

But you now have:

advisor_admin

advisor_member

What is not explicitly locked is how advisors exist inside that model.

Right now, the safest interpretation is:

advisors are external users who are added as members of a specific employer tenant’s Clerk Organization

they are not internal staff

they only act within the active employer tenant they were granted into

That should be written explicitly, or Codex may invent a second advisor-tenancy model.

2. “Own” is still too fuzzy

These permissions need a short definition:

application:view_own

application:edit_own

Because “own” could mean any of these:

records created by that user

records assigned to that user

any record inside the active tenant that their role is allowed to touch

For this app, the most practical interpretation appears to be:

for employer/advisor/employee roles, “own” means records within the active tenant that the role is allowed to access under route and workflow rules

not global access

not cross-tenant access

Without that, implementation can drift.

3. read_only_auditor needs route placement clarified

You gave read_only_auditor:

audit:view

application:view_all

But your route classes only clearly define:

public

authenticated but not tenant-approved

external employer/advisor area

internal staff admin area

protected API routes

forbidden routes

You should explicitly state that read_only_auditor is treated as an internal read-only role and belongs in the internal protected area, not the external tenant area.

4. platform_admin should explicitly include system:admin

You already say:

platform_admin = all permissions

That is fine. But since system:admin is one of the canonical permissions, say it plainly in implementation logic so there is no mismatch between doc and code.

5. Employee role exists, but route examples do not mention it

You added:

employee_member

But route examples only mention employer/advisor flows.

That is not fatal, but it is a gap. Add one line making clear that employee users also live in the external tenant-scoped area, with only the permissions granted in the matrix.

My read

Status: ready to proceed.
Condition: lock 3–5 short clarifiers before building.

You do not need a rewrite. You just need a few precision lines added so Phase 5 code does not fork into different interpretations.

Exact additions I would make to the notes before Step 3

Add this under Tenant model:

- Advisor users are external users who may be added to a specific employer tenant and operate only within that active tenant.
- Employee users are external tenant-scoped users and do not receive internal staff access.

Add this under Canonical permissions or immediately after it:

Definition of "own":
- application:view_own and application:edit_own mean access only within the active tenant and only for records allowed by that role's workflow scope.
- "own" never means cross-tenant access.

Add this under Route Classes → Internal staff admin area:

- read_only_auditor is an internal read-only role and uses internal protected routes only where approved.

Add this under Role-to-permission matrix or Pass criteria:

- platform_admin includes system:admin through the all-permissions rule.

Add this under External employer/advisor area:

- employee_member also belongs to this external tenant-scoped area and must remain limited to its assigned permissions.
Bottom line

Yes, move forward on Phase 5.
But lock those small clarifiers first so Step 3 builds against one interpretation, not several.

The main remaining risk is not missing structure. It is scope ambiguity around advisor, employee, auditor, and “own.” Once those are pinned down, the notes are strong enough to support implementation cleanly.

I added the Employee and Advisor roles on the fly. Is that a design issue that should trigger a partial reboot of the Phases going back to Phase 1? 

I’m checking the project’s own phase rules and source-of-truth language so I can tell you whether this is a normal Phase 5 refinement or a real architecture reset.

Thought for 31s

No. This does not justify a Phase 1 reboot by default.

It is a Phase 5 design refinement, not an architecture reset, because Phase 5 is exactly where you lock roles, permission matrix, backend guards, and tenant/resource isolation. 

App-test-project-Source-of-Truth

What it does trigger is a backfill check against earlier phase docs, because Phase 1 was supposed to define users, roles, tenants, services, databases, third parties, regulated data, and boundaries. 

App-test-project-Source-of-Truth

 So adding employee_member, advisor_admin, and advisor_member means:

Phase 5 should keep moving.

Phase 1 docs should be amended, not rebooted.

Phase 4 should be checked to make sure the identity shell still supports the new actor set cleanly. 

App-test-project-Source-of-Truth

Clean decision rule

Do not reboot to Phase 1 if Advisor and Employee are just:

new user roles

inside the same tenant model

using the same Clerk identity approach

using the same environment/deployment/security model

That is normal Phase 5 work. The project method is phase-by-phase, with each phase locking its own source-of-truth decisions, and Phase 5 is the correct place to finalize authorization rules. 

App-test-project-Source-of-Truth

 

App-test-project-Source-of-Truth

Reboot only if one of these became true

You should consider a partial rollback only if adding those roles changes one of the foundations below:

tenant model changed
Example: advisor is not actually inside an employer tenant, but is a separate cross-tenant entity

identity model changed
Example: advisors authenticate differently from Clerk org membership

data boundary changed
Example: employees or advisors can touch different regulated data classes than previously mapped

system boundary changed
Example: a new external system, portal, or database is now required

route model changed at the platform level
Example: advisor portal becomes a distinct app surface, not just another protected route area

Those would reach backward into Phase 1/2/4 because they change boundaries, not just permissions. Phase 1 is where those system boundaries and role/tenant definitions belong. 

Dev-process

 

App-test-project-Source-of-Truth

My read on your case

Based on what you’ve described so far, this looks like:

not a reboot

yes to a controlled doc patch

Because the rebuild target already expects role-aware app behavior and admin-only review paths, plus strict separation of auth and authorization. 

App-test-project-Source-of-Truth

 

App-test-project-Source-of-Truth

What to do now

Keep Phase 5 moving.

Amend the Phase 1 system map to include:

employer users

employee users

advisor users

internal users

which tenant each belongs to

whether any role is cross-tenant

Amend Phase 4 notes only if Clerk org/session assumptions need to change.

In Phase 5, explicitly lock:

whether advisors are members of the employer tenant

whether employees are tenant-scoped only

what “own” means for those roles

Bottom line

No Phase 1 reboot.
Yes to a Phase 1/4 reconciliation pass in the docs.

The real risk is not that you added roles. The real risk is that you added them without explicitly stating whether they are just tenant-scoped role variants or a different actor model entirely. If they are just tenant-scoped role variants, stay in Phase 5 and patch the earlier docs.

Sources
Individuals and advisors are going to be separate tenants. I am also contemplating a Firm role in which Advisors could be nested underneath, along with any Employers nested underneath that Advisor. Individuals nested underneath any of those Employers would also become nested underneath that Firm. This was expected to be build done at a later time so aren't developing that yet, but should we build rails for it now? If so, we are also contemplating a Partner level where they would have a separate domain/server running their services. How far is too far to plan for at this moment? 

I’m checking the project’s own phase boundaries and architecture constraints first, because your question is really about whether this is still a Phase 5 authorization decision or a broader system-model fork. Then I’ll give you the cutoff line between “plan now” and “defer.”

Thought for 30s

Yes — this is now bigger than a normal Phase 5 role tweak.

Not a full reboot to Phase 1, but it does require a controlled rollback to re-lock the tenant model before you keep coding Phase 5.

Why:

Phase 1 is where users, roles, tenants, services, databases, regulated data, and boundaries get defined. 

App-test-project-Source-of-Truth

Phase 5 is where you lock roles, org/tenant model, permission matrix, and backend guards before business features. 

Dev-process

Your current Phase 5 notes assume 1 Clerk Organization = 1 employer tenant, but you just changed the model to:

individuals = separate tenants

advisors = separate tenants

possible future firm parent

possible future partner level with separate domain/server

That is not “just more roles.” That is a different tenancy model.

The real call
Do not do this

Do not keep building Phase 5 code on top of the current tenant assumptions.

Do this instead

Do a targeted design correction now:

patch Phase 1 source-of-truth

patch Phase 5 source-of-truth

then continue Phase 5 implementation

You do not need to restart all phases. But you do need to stop and re-lock the model before Step 3 code drifts.

Where this change reaches

This impacts at least four phases:

Phase 1

Because tenant types and boundaries changed. 

App-test-project-Source-of-Truth

Phase 4

Because Clerk shell assumptions and org/session resolution may change if advisors and individuals are their own tenants. Phase 4 is where sign-in/out, session validation, protected routes, allowed origins, and backend token verification were supposed to be locked. 

App-test-project-Source-of-Truth

Phase 5

Because the org/tenant model is a direct Phase 5 deliverable. 

App-test-project-Source-of-Truth

Phase 6

Because database architecture depends on the tenant model being correct before schema strategy and migrations are locked. 

App-test-project-Source-of-Truth

Should you build rails now?

Yes, but only compatibility rails, not full future behavior.

That is the line.

Build now

Build rails for what is high-likelihood and low-cost:

a generic tenantType

employer

advisor

individual

optionally reserve firm

optionally reserve partner

a nullable parentTenantId

authorization helpers that do not hardcode “employer is the only tenant type”

route guards that work off tenant type + role + permission

DB and code naming that uses tenant generically, not employer everywhere

internal APIs that resolve:

active tenant

tenant type

role in that tenant

parent tenant if present

That gives you room to grow without building the future today.

Do not build now

Do not implement yet:

full multi-level hierarchy logic

firm dashboards

partner portals

separate partner infrastructure

cross-domain tenant resolution

delegated admin inheritance trees

cross-tenant reporting logic

server-per-partner deployment topology

That is too far for this moment.

The cutoff line

Plan now for one layer of abstraction beyond current need.

Not three.

Right now your current need is no longer just employer tenants. So the right plan depth is:

Lock now

multiple tenant types exist

parent/child tenancy may exist later

code and schema must not block that

Defer now

actual hierarchical behavior

tenant inheritance rules

partner-hosted infrastructure

multi-domain routing contracts

per-partner server isolation

That keeps the system owner-operable instead of overbuilt, which is one of the project’s core standards. 

App-test-project-Source-of-Truth

Recommended decision

For this rebuild right now, use this model:

Current production-intent model

employer, advisor, and individual are valid tenant types

each tenant is independent

no hierarchy is active yet

parentTenantId exists but is nullable and unused for now

no inherited permissions from parent tenants yet

no partner-level domain/server behavior yet

Future-compatible reservation

reserve firm and partner as future tenant types

reserve parent-child structure in the model

do not implement hierarchy rules yet

That is the right balance.

What this means for Phase 5

You should pause Step 3 coding until the Phase 5 doc is corrected.

Your current tenant model text is now wrong because it says:

1 Clerk Organization = 1 employer tenant

That should be replaced with something closer to:

1 Clerk Organization = 1 tenant

supported tenant types in current scope:

employer

advisor

individual

future tenant types may include:

firm

partner

tenant hierarchy is reserved for future implementation, not active in Phase 5

every tenant-owned record carries tenantId

parentTenantId may exist as nullable future-compatibility metadata, but no inherited access rules are active yet

My recommendation, directly
Do now

patch Phase 1 tenant model

patch Phase 5 tenant model

proceed with Phase 5 implementation using generic tenant abstractions

Do not do now

full hierarchy

partner infra

separate domain routing

nested permission inheritance

Bottom line

You have crossed the line where this is no longer just a role change.
It is now a tenant-model change.

So:

No full reboot

Yes targeted rollback to Phase 1 + Phase 5 source-of-truth

Yes build future-safe rails

No do not build firm/partner behavior yet

The practical rule is:

Build the schema and authz engine so future hierarchy is possible. Do not build the hierarchy itself yet.

Paste your current tenant-model section and I’ll rewrite just that section so it fits this new direction without expanding the scope further.

I’m pulling the Phase 1 system map against the project source-of-truth and the new tenant-model notes so I can give you a clean patch list, not a rewrite.

Stopped thinking
Quick answer
keep running this. 

I’ve got the project sources loaded. Now I’m checking the actual Phase 1 file against the new tenant-model shift so I can give you only the Phase 1 patch items that matter.

I found the main conflict. Your current Phase 1 can be patched cleanly, but only after you lock one naming decision: if individuals are now separate tenants, employee_member is the wrong Phase 1/5 role label and should become an individual-tenant role instead.

Thought for 1m 39s

Keep Phase 1. Patch it. Do not reboot it.

Why: the project method says Phase 1 is where users, roles, tenants, services, regulated data, and boundaries get locked, and Phase 5 is where authorization and tenant isolation are finalized. Your current Phase 1 already has the right architecture baseline, but its external actor model is still employer-only and its tenant boundary is still employer-only. Specifically, it still defines public_applicant / internal_ops as the core roles and says “one employer/application organization = one tenant boundary.”

What stays as-is in Phase 1:
The rebuild target, edge/app/data/control service model, data classification, environment data rules, vendor review boundary, shared responsibility matrix, network boundary, and controls baseline are still aligned and do not need reopening.

What must change in Phase 1:
The users section, roles section, tenant model section, and a small part of pass/fail and out-of-scope need patching because those are the sections now out of sync with the new tenant direction. Right now, the mismatch is real.

Biggest conflict to resolve before patching:
If individuals are now separate tenants, employee_member is the wrong canonical label. That role name implies an employer-nested actor, not an independent tenant. So Phase 1 should not be patched with employee_member unless you are explicitly keeping individuals under employer tenants.

Use this Phase 1 patch set.

Replace ### 2) Product scope for this rebuild with:

### 2) Product scope for this rebuild
This app has two primary experiences:

#### External tenant experience
A tenant-facing ICHRA setup flow that allows:
- multi-step application entry
- save and resume
- file upload
- review before submit
- final submission

Current supported external tenant types:
- employer
- advisor
- individual

#### Internal experience
An internal/admin review flow that allows:
- secure sign-in
- review of submitted applications
- detail inspection
- file review
- processing actions by authorized staff

Future tenant hierarchy may exist later, but it is not active in the current build.

Replace ### 3) Users with:

### 3) Users
The system will support these user types:

- External employer user
  - tenant-scoped user acting inside an employer tenant
- External advisor user
  - tenant-scoped user acting inside an advisor tenant
- External individual user
  - tenant-scoped user acting inside an individual tenant
- Internal operations admin
  - staff handling operational processing and support
- Internal reviewer
  - staff handling review workflows
- Platform admin
  - higher-trust internal user for platform-wide access and oversight
- Read-only auditor
  - non-operational internal reviewer
- Service account
  - CI/CD and controlled automation identity

Replace ### 4) Roles with:

### 4) Roles
Initial role model for the rebuild:

- `platform_admin`
- `internal_ops_admin`
- `internal_reviewer`
- `read_only_auditor`
- `service_account`

External tenant-scoped roles exist per tenant type and are finalized in Phase 5.

Rules:
- Clerk authenticates users.
- Clerk is not the final source of truth for authorization.
- The backend must enforce:
  - role permissions
  - tenant boundaries
  - resource ownership
  - action-level checks

Replace ### 5) Tenant model with:

### 5) Tenant model
Initial tenant boundary:

- one Clerk Organization = one tenant boundary

Current supported tenant types:
- employer
- advisor
- individual

Reserved future tenant types:
- firm
- partner

Rules:
- each tenant-owned record belongs to exactly one tenant
- every protected read/write must resolve the active tenant
- internal users may cross tenant boundaries only through backend-enforced role/scope rules
- tenant users may never cross tenant boundaries
- public save/resume access, if allowed, is constrained to a single application context until authenticated tenant scope is resolved
- tenant isolation is enforced in backend logic and data access rules
- no PHI goes into Clerk metadata

Future-compatibility rule:
- hierarchy may exist later, but no parent-child inheritance rules are active in the current build

Add this under ### 15) Explicit out-of-scope items for Phase 1:

- active firm hierarchy behavior
- active partner hierarchy behavior
- inherited permissions across parent/child tenants
- partner-specific domain routing
- partner-specific server isolation

Replace the Phase 1 pass/fail question block with this tighter version:

## Pass / fail exit criteria

Phase 1 passes only if all of these are answered:
- What data is regulated?
- Where can that data live?
- Which vendors are in scope for regulated-data review?
- Which environments may contain real PHI?
- Which logs may never contain PHI?
- What are the system users?
- What are the internal roles?
- What are the current external tenant types?
- What is the tenant boundary?
- Which future tenant types are only reserved, not active?
- What services exist?
- What is explicitly out of scope right now?

My review call:
You are not dealing with a full Phase 1 failure. You are dealing with an actor/tenant-model drift inside a Phase 1 document that otherwise still holds. The current doc is still solid on controls and system boundaries; it is just outdated on who the external actors are and what a tenant is.

What I would not do in Phase 1:
Do not add live firm behavior. Do not add partner infrastructure. Do not add parent-child permission inheritance. Phase 1 should only reserve those concepts and make clear they are inactive for the current build.

Bottom line:
Patch Phase 1 now.
Do not reboot it.
Do not let Phase 1 keep employer-only tenant language.
Do not let employee_member survive if individual is now its own tenant.

Paste your updated Phase 1 file after you make those changes, and I’ll check it for continuity gaps only.

Here is the updated Phase 1 notes in the repo. This meet the new specs. Run a quick check to see if there is anything material that needs to be updated in Phase 2-3. I dont think there is but it's worth checking. 
Stopped thinking
Quick answer
phase-1-system-map.md
File

I’m checking the actual Phase 2 and 3 source material against the updated Phase 1 tenant model now. The key question is whether Phase 2 or 3 hardcoded “employer-only” assumptions or if they stayed infrastructure-level.

Thought for 31s

Quick check: I do not see a material Phase 2 or Phase 3 reset.

Why:
Your updated Phase 1 changed the tenant model, not the environment model or platform-controls model. Phase 1 now says the current tenant boundary is still “one Clerk Organization = one tenant boundary,” with supported tenant types employer, advisor, and individual, and future hierarchy reserved but inactive. Phase 2 is still just the environment map—local, staging, production, hostnames, DNS, deploy paths, secret sources, and separation rules. Phase 3 is still platform controls—server hardening, private networking, Traefik, TLS, logging, backups, and secret handling.

My call:
Phase 2: no material change needed.
Phase 3: no material change needed.
Only do wording cleanup if those docs hardcode employer-only language.

What to check in Phase 2:
If the Phase 2 doc says anything like:

“1 employer org per environment”
“employer portal” as the only tenant-facing surface
hostnames or route labels that assume employer is the only tenant type

then patch that wording to tenant-facing or external tenant instead. The environment structure itself should stay the same because the official Phase 2 job is environment separation and deployment layout, not tenant hierarchy logic.

What to check in Phase 3:
If the Phase 3 doc says anything like:

admin path restrictions tied only to employer flows
rate limits or route groups described as employer-only
Clerk/edge assumptions that treat employers as the only external tenant

then patch the wording to external tenant routes plus internal admin routes. The controls themselves do not change. Traefik, TLS, logging, backups, private networking, and secret handling are still the same control stack.

The only likely continuity patch:
Make sure both Phase 2 and 3 use tenant-generic naming instead of employer-only naming. Your updated Phase 1 now explicitly supports three external tenant types and says hierarchy is future-only, not active now.

Bottom line:
You’re on track.
No rollback to 2 or 3.
Just do a fast wording scan for:

employer-only
public applicant
any route/env label that assumes only one external tenant type

If those are not in the Phase 2–3 docs, leave them alone and continue Phase 5.

Ok. Do a check on Phase 4 and check to see if there are any material updates needed. 

I’m checking whether Phase 4 locked anything that assumes employer-only tenant behavior or a single external actor shape. That’s the only place I’d expect a real continuity issue.

Thought for 42s

Phase 4 does not need a reset, but it does need one material continuity check.

Why:
Phase 4’s job is still the identity shell only: Clerk sign-in/out, session validation, backend token verification, allowed origins / authorized parties, MFA, and protected routes. It is not where roles or authorization rules are finalized; that stays in Phase 5.

Your updated Phase 1 now changed the actor model in a way that touches the shell:

external tenant types are now employer, advisor, and individual
one Clerk Organization now means one tenant boundary, not one employer-only boundary
external users are split by tenant type, while internal users are separate user types altogether

So my call is:

No Phase 4 reboot.
Yes, likely one material patch to the Phase 4 assumptions.

What Phase 4 must now support
If the Phase 4 notes or code still assume:

employer is the only external org type
all signed-in users go through the same org flow
internal users also need a tenant org to use the app
protected routes are framed as public vs employer vs admin only

then that is now outdated.

What needs to be true instead
Phase 4 should now treat Clerk org context generically as tenant context, not employer context.

That means the identity shell should explicitly support:

External tenant-scoped users
employer users
advisor users
individual users
each works inside one active Clerk Organization / tenant context
Internal users
internal ops
internal reviewer
platform admin
read-only auditor
these must be able to sign in without being forced through an external tenant flow
Protected route split at the shell level
external tenant route area
internal route area
not yet full authz, but the shell should not funnel them through the same path incorrectly
Session/bootstrap behavior
resolve signed-in state
resolve whether the user is internal or tenant-scoped
resolve active org only where tenant-scoped flow requires it
No PHI in Clerk metadata
this remains unchanged and should stay explicit

What is not a Phase 4 job
Do not push tenant hierarchy, firm nesting, partner servers, or permission inheritance into Phase 4. Phase 1 explicitly reserves those for later and says hierarchy is not active now.

My practical verdict
You only have a material Phase 4 issue if the Phase 4 doc or implementation hardcoded employer-only org behavior.

So the Phase 4 continuity test is:

Does it say “employer org” instead of “tenant org”?
Does it force every signed-in user into the same org/tenant path?
Does it fail to distinguish internal users from tenant-scoped users at shell boot?
Does it frame protected routes as only employer vs admin instead of external-tenant vs internal?

If yes to any of those, patch Phase 4 before moving on.
If no, leave Phase 4 alone and keep going in Phase 5.

Bottom line:
Phase 4 probably needs a wording/assumption patch, not a rebuild.
The one material thing to verify is that the identity shell is now tenant-generic and can separate internal users from tenant-scoped users before Phase 5 authz logic takes over.

app Ph4.zip
Zip Archive
phase-4-identity-shell.md
File
Attached is a copy of the code after Phase 4 and a copy of the Phase 4 notes. Remember, we're assessing the need and scope of updated to Phase 4 (in documenation and/or code changes), so stay on task with that. We are not revising the whole thing, just making required updates to Phase 4 that are required with the tenancy changes. 

I’ve got the Phase 4 notes. Now I’m checking the actual Phase 4 code for one thing only: whether the shell hardcoded employer-only org flow or whether it stayed generic enough to survive the tenant change.

The notes are mostly fine. The real answer now depends on whether the Phase 4 code forces every signed-in user through the same external org path or whether it just protects /app and verifies identity. I’m checking that boundary in the repo.

Thought for 2m 9s

Verdict: no material Phase 4 code rewrite is required because of the tenant change.
Phase 4 is still supposed to stop at sign-in/out, session validation, protected routes, allowed origins, and backend token verification. Tenant scoping, role matrix, and resource isolation are explicitly deferred to Phase 5.

Why I’m saying that:
Your updated Phase 1 now says the active model is still one Clerk Organization = one tenant boundary, with supported tenant types employer, advisor, and individual, and future hierarchy reserved but inactive. Phase 4 notes already say they do not decide tenant scoping, roles, or record-level access, and only decide public vs authenticated plus backend auth verification.

What I found in the attached Phase 4 code:

It does not hardcode employer-only org behavior.
It does not resolve tenant type at the shell layer.
It does not force advisor/individual users into an employer-specific path.
It mainly does shell-level auth only: Clerk provider, protected route middleware, and one protected API auth check.

That means the current code is still conceptually aligned with the documented Phase 4 boundary. The tenant-model change mostly hits Phase 5, not this codebase snapshot.

What Phase 4 should get updated:
Only a small documentation patch so the shell is explicitly tenant-generic.

I would add these three lines to the Phase 4 notes:

Tenant-model continuity note:
- Phase 4 identity applies to both internal users and external tenant-scoped users.
- External tenant-scoped users may belong to employer, advisor, or individual tenants.
- Tenant type resolution, active tenant enforcement, and internal-vs-tenant authorization decisions are deferred to Phase 5.

That is the only Phase 4 update I would call required from the tenancy change.

What is not required in Phase 4:

no advisor hierarchy logic
no individual-tenant routing logic
no firm/partner rails
no parent-child tenant inheritance
no tenant-aware RBAC at shell level

Those belong later because Phase 4 is still only identity shell, while Phase 5 is where org/tenant model, permission matrix, backend guards, and isolation get locked.

One separate issue I found that is real but not tenancy-driven:
Your Phase 4 notes and proof tests are written around /app and /app/*, but the attached code is protecting /dashboard and /api/auth-check, and the home page links to /dashboard. That is a doc/code mismatch, but it is not caused by the tenant-model change. The Phase 4 notes also say all authenticated shell routes live under /app.

Bottom line:

Tenant-driven Phase 4 code changes: none required
Tenant-driven Phase 4 doc changes: one small tenant-generic clarification block
Separate non-tenant cleanup: /app vs /dashboard mismatch

You can keep moving in Phase 5 after adding that small note to Phase 4.

dashboard is the proper path. Both that and auth-check were added after these notes were created. Generate update test for the Phase 4 notes and instructions for where they go. I have Phase 4 notes opened in an editor. 

I’m locating the exact section in the Phase 4 notes so I can give you paste-ready text and the cleanest insertion point, not just loose wording.

Thought for 45s

Yes. These are the Phase 4 note updates I would make.

They fix the now-outdated /app references in the current notes, update the proof endpoint to /api/auth-check, and add the one tenant-continuity clarification Phase 4 should carry without drifting into Phase 5 authz. Those are the only material note changes I’d make here. The current stale areas are the known values, route boundary, redirect behavior, startup validation, proof tests, and scorecard.

1) Add this tenant continuity note near the top

Put this immediately below:

This step does not include: roles, tenant scoping, admin permissions, record-level access rules.

Paste:

Tenant-model continuity note:
- Phase 4 identity applies to both internal users and external tenant-scoped users.
- External tenant-scoped users may belong to employer, advisor, or individual tenants.
- Tenant type resolution, active tenant enforcement, and role/permission decisions are deferred to Phase 5.

That placement fits the current Phase 4 boundary and keeps Phase 4 identity-only.

2) Replace the entire Known values block

Find the section that starts with Known values and replace the contents with this:

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

This replaces the current /app home-path contract.

3) Replace the entire Protected/public route boundary section

Find the heading:

Protected/public route boundary

Replace that whole section down through the Not decided right now list with this:

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
- /api/auth-check is the proof route for Phase 4 backend authentication verification

Not decided right now
- platform_admin permissions
- internal reviewer permissions
- tenant isolation rules
- action-level permissions
- row/object access scope

This is the cleanest note-level patch because the current block is still built around /app everywhere.

4) Update the startup validation checks

In Web validation checks, change this line:

- APP_HOME_PATH must be /app

to:

- APP_HOME_PATH must be /dashboard

In API validation checks, change this line:

- APP_HOME_PATH must be /app

to:

- APP_HOME_PATH must be /dashboard

Those are the only startup-validation lines that need to change in that section.

5) Replace the entire Proof test sequence section

Find the heading:

Proof test sequence

Replace everything from there down through the Phase 4 validation scorecard with this:

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

This corrects the stale /app references in the current proof and scorecard sections.

Fastest way to apply it

In your editor, do it in this order:

Add the tenant continuity note near the top.
Replace Known values.
Replace Protected/public route boundary.
Change the two APP_HOME_PATH must be /app lines to /dashboard.
Replace Proof test sequence through the end of the scorecard.

That will fully align the notes with the current Phase 4 reality without dragging Phase 5 logic backward.