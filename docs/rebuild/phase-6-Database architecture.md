Phase 6 - Database Architecture


Put these decisions in it:

MySQL 8.4 LTS

mysql2/promise

one DB per environment

separate runtime/migrate/backup users

ordered SQL migrations

local seeds only

tenant_id required on every tenant-owned table

uploads metadata only, not file blobs

no real PHI in local/staging

backup and restore drill required before phase exit

bootstrap SQL path issue

Local MySQL added

Created a local DB-only bootstrap path at:

- `local-db/compose.yml`
- `local-db/init/001-users.sql`

Implementation rules used:
- official `mysql:8.4` image
- bind to localhost only with `127.0.0.1:3307:3306`
- local-only exposure, not public
- named volume for persistence: `app_local_mysql_data`
- bootstrap SQL mounted into `/docker-entrypoint-initdb.d/001-users.sql`

Bootstrap objects created:
- database: `app_local`
- user: `app_local_runtime`
- user: `app_local_migrate`

Credential rule:
- root is bootstrap/admin only
- app must not use root
- runtime traffic uses `app_local_runtime`
- migration/schema work uses `app_local_migrate`

Smoke tests completed:
- compose config validated
- container started
- localhost port 3307 reachable
- `app_local` database confirmed
- runtime query succeeded
- migration DDL succeeded
- runtime DDL failed as expected

Important behavior:
- init SQL only runs on first bootstrap of an empty MySQL data volume
- if bootstrap SQL changes later, reset with `docker compose -f local-db/compose.yml down -v` and recreate

Phase note:
- `local-db/` is a Phase 6 DB-only local bootstrap path
- it is not yet the final whole local app-stack compose entrypoint

During local MySQL setup, `local-db/init/001-users.sql` was accidentally present as a directory instead of a file. Docker bind-mounted that directory into `/docker-entrypoint-initdb.d/001-users.sql`, so MySQL did not execute the bootstrap SQL.

Fix applied:
- removed bad directory at `local-db/init/001-users.sql`
- recreated `001-users.sql` as an actual file
- reset local MySQL with `docker compose -f local-db/compose.yml down -v`
- recreated container so init scripts would run against a fresh data volume

Verification:
- `cat /docker-entrypoint-initdb.d/001-users.sql` returned SQL contents
- `app_local_runtime` and `app_local_migrate` users were created
- runtime connection test passed

DB dependency and script contract added

Updated `web/package.json` to add the DB client dependency and initial DB script contract.

Added dependency:
- `mysql2`

Added npm scripts:
- `db:migrate` → `node ./scripts/db-migrate.mjs`
- `db:seed` → `node ./scripts/db-seed.mjs`
- `db:check` → `node ./scripts/db-check.mjs`

Rules for this step:
- no extra DB tooling added yet
- no migration framework added yet
- no script implementation files created yet as part of this step
- this step only establishes the package dependency and script interface

Validation completed:
- `mysql2` installed successfully
- `package.json` updated
- `npm run` shows the new DB scripts


Migration rails validated

Applied and validated:
- `db/migrations/0001_phase6_baseline.sql`
- `db/migrations/0002_phase6_application-core.sql`

Confirmed tables:
- `schema_migrations`
- `audit_events`
- `applications`
- `application_uploads`

Confirmed DB rules:
- every tenant-owned table in this step includes `tenant_id`
- `applications` required indexes exist
- `application_uploads` enforces `(application_id, tenant_id)` match via composite foreign key

Validation note:
- first attempt to apply `0001` failed due to MySQL readiness timing during fresh container bootstrap
- rerun after container reached healthy state succeeded

Important follow-up:
- `schema_migrations` exists, but migration versions are not yet being recorded because SQL was applied manually
- version recording will be handled when `db-migrate.mjs` is implemented


Local seed script created

Created:
- `web/scripts/db-seed.mjs`

Seed rules implemented:
- local-only execution
- fake data only
- no staging seeds
- no production seeds
- uses runtime DB URL, not migration DB URL
- refuses non-local database hosts

Seeded proof set:
- one fake employer tenant id
- one fake advisor tenant id
- one fake application draft
- one fake submitted application
- one fake audit event

Data safety:
- no real users
- no PHI-like fields
- deterministic fake IDs used for repeatable local seeding

DB health check created

Created:
- `web/scripts/db-check.mjs`

Health check behavior:
- loads env for explicit Node execution outside Next runtime
- connects with `DATABASE_URL`
- verifies DB connection works
- verifies `schema_migrations` exists
- verifies expected migration files are recorded in `schema_migrations`
- verifies a simple read query against `applications` succeeds
- exits non-zero on failure

Phase note:
- this script is designed to become a staging smoke-check input in Phase 7
- it validates the runtime DB path, not the migration DB path


URL Contract
Local runtime
mysql://app_local_runtime:<PASSWORD>@127.0.0.1:3307/app_local
Local migrate
mysql://app_local_migrate:<PASSWORD>@127.0.0.1:3307/app_local
Staging runtime
mysql://app_staging_runtime:<PASSWORD>@<STAGING_DB_HOST>:3306/app_staging
Staging migrate
mysql://app_staging_migrate:<PASSWORD>@<STAGING_DB_HOST>:3306/app_staging
Staging backup
mysql://app_staging_backup:<PASSWORD>@<STAGING_DB_HOST>:3306/app_staging
Production runtime
mysql://app_prod_runtime:<PASSWORD>@<PROD_DB_HOST>:3306/app_prod
Production migrate
mysql://app_prod_migrate:<PASSWORD>@<PROD_DB_HOST>:3306/app_prod
Production backup
mysql://app_prod_backup:<PASSWORD>@<PROD_DB_HOST>:3306/app_prod


Environment credential contract locked

Credential naming contract:

Local
- DB: `app_local`
- runtime: `app_local_runtime`
- migrate: `app_local_migrate`

Staging
- DB: `app_staging`
- runtime: `app_staging_runtime`
- migrate: `app_staging_migrate`
- backup: `app_staging_backup`

Production
- DB: `app_prod`
- runtime: `app_prod_runtime`
- migrate: `app_prod_migrate`
- backup: `app_prod_backup`

Privilege contract:

Runtime
- `SELECT, INSERT, UPDATE, DELETE, EXECUTE`

Migrate
- `SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP`

Backup
- `SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES`

Rules:
- separation matters more than over-optimization at this phase
- no shared god credential for services
- no passwords committed to repo
- local uses local env files only
- staging/prod use managed environment secrets only
- staging/prod DB accounts should require SSL when provisioned

Secret-name contract:
- `STAGING_DATABASE_URL`
- `STAGING_DATABASE_MIGRATION_URL`
- `STAGING_DATABASE_BACKUP_URL`
- `PROD_DATABASE_URL`
- `PROD_DATABASE_MIGRATION_URL`
- `PROD_DATABASE_BACKUP_URL`

Env contract set

Created:
- `web/.env.example`

DB env contract:
- `DATABASE_ENABLED`
- `DATABASE_URL`
- `DATABASE_MIGRATION_URL`
- `DB_SSL_REQUIRED`
- `DB_POOL_LIMIT`

Rules:
- `.env.example` contains variable names/defaults only
- no real secrets committed
- no live DB URLs committed
- real staging DB values live only in GitHub Environment `staging`
- real production DB values live only in production secret management

Staging DB functional validation passed

Validated successfully:
- private-only DB posture
- no published MySQL port
- no Traefik DB routing
- private Docker network in use
- root auth works
- staging DB exists
- staging runtime/migrate/backup users exist
- runtime read works
- migrate DDL works
- backup read works
- runtime DDL fails
- backup write fails

Remaining closeout items:
- add GitHub `staging` environment secrets:
  - `STAGING_DATABASE_URL`
  - `STAGING_DATABASE_MIGRATION_URL`
  - `STAGING_DATABASE_BACKUP_URL`
- fix ownership/permissions for:
  - `/app/staging/db/.env`
  - `/app/staging/db/init/001-staging-users.sql`
  target permission: `600`

  closeout status

Staging DB function validated and GitHub staging secrets saved.

Open hardening item:
- `/app/staging/db/.env` and `/app/staging/db/init/001-staging-users.sql` are currently `0644`
- this is too permissive for files containing live DB credentials
- target permission remains `0600`

Step 11 is not fully closed until those files are restricted.
Fully closed

Staging DB is fully stood up and validated.

Confirmed:
- private-only MySQL posture
- no public `3306`
- no Traefik routing for DB
- staging DB and service users created
- runtime/migrate/backup privilege separation validated
- GitHub `staging` environment secrets saved
- server secret files hardened to `600`

Result:
- Step 11 complete

Step 11 operational clarification

Hardening required both permission restriction and correct ownership for the staging operator.

Applied/confirmed:
- `/app/staging/db/.env` remains `0600`
- `.env` ownership was corrected to `stage_deploy:stage_deploy` because `stage_deploy` runs `docker compose` for the staging DB stack
- this was required because `docker compose` reads `.env` before stack operations and failed when the deploy user could not read the file
- `/app/staging/db/init/001-staging-users.sql` remains a secret-bearing file and should stay restricted (`0600`)
- `001-staging-users.sql` does not need to be owned by `stage_deploy` unless that user must edit/manage it directly

Operational rule:
- secret file permissions alone are not enough
- ownership must match the actual operator account for any file that the operator must read during stack execution

backup/restore drill opened

Step 12 is an execution gate, not a documentation-only step.

Required outcomes for step closure:
- backup contract documented
- one real dump created successfully
- one throwaway restore database created
- one real restore completed successfully
- restored tables verified
- restored row counts spot-checked

Execution rule for this phase:
- the manual drill runs on the staging server under `/app/staging/db`
- this drill is not intended to be run from Windows CMD


Step 12 manual drill path established

Operational path used:
- working directory: `/app/staging/db`
- DB stack operator: `stage_deploy`
- backup output directory: `/app/staging/db/backups`

Applied:
- created `/app/staging/db/backups`
- corrected ownership of `/app/staging/db/backups` to `stage_deploy:stage_deploy`
- restricted backup directory for operator use

Directory rule:
- `/app/staging/db/backups` should be writable by the staging operator
- restrictive directory permissions are appropriate here (recommended: `0700`)


Backup contract adjustment discovered during drill

The least-privileged staging backup user hit a `mysqldump` tablespace privilege error during the first real backup attempt.

Operational adjustment:
- baseline dump command for this project now includes `--no-tablespaces`

Updated backup command shape:
```bash
mysqldump --single-transaction --routines --triggers --no-tablespaces \
  -h "$DB_HOST" -u "$BACKUP_USER" -p"$BACKUP_PASSWORD" "$DB_NAME" > "$BACKUP_FILE"