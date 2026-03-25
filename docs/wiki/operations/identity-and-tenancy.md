# Identity and Tenancy

## Identity boundary

- Clerk owns authentication, session creation, and sign-in/out mechanics.
- The application owns route protection, backend verification, authorization,
  and tenant/resource access.

## Roles

- Internal roles exist for platform administration, operations, review, and
  read-only auditing.
- External roles exist for employer, advisor, and individual membership use
  cases.

## Authorization rules

- UI visibility is not sufficient protection.
- Backend checks remain the source of truth for permissions.
- Tenant isolation must remain explicit for tenant-owned records and actions.

## Tenant rules

- Tenant context must be resolved before tenant-owned actions are allowed.
- Internal users and tenant-scoped users remain distinct access classes even
  when they share identity infrastructure.
