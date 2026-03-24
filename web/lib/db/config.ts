import 'server-only'

export type DbConfig =
  | {
      enabled: false
      databaseUrl: null
      databaseMigrationUrl: null
      dbSslRequired: false
      dbPoolLimit: number
    }
  | {
      enabled: true
      databaseUrl: string
      databaseMigrationUrl: string
      dbSslRequired: boolean
      dbPoolLimit: number
    }

const APP_ENV_VALUES = ['local', 'ci', 'staging', 'prod'] as const
const LOCAL_DB_HOSTS = new Set([
  '127.0.0.1',
  'localhost',
  '::1',
  'host.docker.internal',
  '0.0.0.0',
  '0.0.0.1',
])
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off', ''])

type AppEnv = (typeof APP_ENV_VALUES)[number]

const EXPECTED_DATABASE_NAMES: Record<AppEnv, string> = {
  local: 'app_local',
  ci: 'app_ci',
  staging: 'app_staging',
  prod: 'app_prod',
}

let cachedConfig: DbConfig | null = null

function normalizeEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function readBooleanEnv(
  name: string,
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  const normalized = value?.trim().toLowerCase()

  if (normalized === undefined) {
    return defaultValue
  }

  if (TRUE_VALUES.has(normalized)) {
    return true
  }

  if (FALSE_VALUES.has(normalized)) {
    return false
  }

  throw new Error(
    `[db/config] ${name} must be one of: 1, true, yes, on, 0, false, no, off`,
  )
}

function readPositiveIntEnv(
  name: string,
  value: string | undefined,
  defaultValue: number,
): number {
  const normalized = normalizeEnv(value)

  if (!normalized) {
    return defaultValue
  }

  const parsed = Number.parseInt(normalized, 10)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`[db/config] ${name} must be a positive integer`)
  }

  return parsed
}

function requireEnv(name: string, value: string | undefined): string {
  const normalized = normalizeEnv(value)

  if (!normalized) {
    throw new Error(`[db/config] Missing required environment variable: ${name}`)
  }

  return normalized
}

function readAppEnv(name: string, value: string | undefined): AppEnv {
  const normalized = requireEnv(name, value)

  if ((APP_ENV_VALUES as readonly string[]).includes(normalized)) {
    return normalized as AppEnv
  }

  throw new Error(
    `[db/config] ${name} must be one of: ${APP_ENV_VALUES.join(', ')}`,
  )
}

function validateMysqlUrl(name: string, value: string, appEnv: AppEnv): string {
  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`[db/config] ${name} must be a valid URL`)
  }

  if (parsed.protocol !== 'mysql:') {
    throw new Error(`[db/config] ${name} must use the mysql:// protocol`)
  }

  if (!parsed.hostname) {
    throw new Error(`[db/config] ${name} must include a hostname`)
  }

  if (!parsed.pathname || parsed.pathname === '/') {
    throw new Error(`[db/config] ${name} must include a database name`)
  }

  const databaseName = parsed.pathname.replace(/^\//, '')
  const expectedDatabaseName = EXPECTED_DATABASE_NAMES[appEnv]

  if (databaseName !== expectedDatabaseName) {
    throw new Error(
      `[db/config] ${name} must target ${expectedDatabaseName} when APP_ENV=${appEnv}`,
    )
  }

  const isLocalHost = LOCAL_DB_HOSTS.has(parsed.hostname)

  if ((appEnv === 'local' || appEnv === 'ci') && !isLocalHost) {
    throw new Error(
      `[db/config] ${name} must stay on local-only DB hosts when APP_ENV=${appEnv}`,
    )
  }

  if ((appEnv === 'staging' || appEnv === 'prod') && isLocalHost) {
    throw new Error(
      `[db/config] ${name} must not use local-only DB hosts when APP_ENV=${appEnv}`,
    )
  }

  return value
}

export function getDbConfig(): DbConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const appEnv = readAppEnv('APP_ENV', process.env.APP_ENV)
  const enabled = readBooleanEnv(
    'DATABASE_ENABLED',
    process.env.DATABASE_ENABLED,
    false,
  )

  const dbPoolLimit = readPositiveIntEnv(
    'DB_POOL_LIMIT',
    process.env.DB_POOL_LIMIT,
    10,
  )

  if (!enabled) {
    cachedConfig = {
      enabled: false,
      databaseUrl: null,
      databaseMigrationUrl: null,
      dbSslRequired: false,
      dbPoolLimit,
    }

    return cachedConfig
  }

  const dbSslRequired = readBooleanEnv(
    'DB_SSL_REQUIRED',
    process.env.DB_SSL_REQUIRED,
    false,
  )

  if ((appEnv === 'staging' || appEnv === 'prod') && !dbSslRequired) {
    throw new Error(
      `[db/config] DB_SSL_REQUIRED must be true when APP_ENV=${appEnv}`,
    )
  }

  const databaseUrl = validateMysqlUrl(
    'DATABASE_URL',
    requireEnv('DATABASE_URL', process.env.DATABASE_URL),
    appEnv,
  )

  const databaseMigrationUrl = validateMysqlUrl(
    'DATABASE_MIGRATION_URL',
    requireEnv('DATABASE_MIGRATION_URL', process.env.DATABASE_MIGRATION_URL),
    appEnv,
  )

  cachedConfig = {
    enabled: true,
    databaseUrl,
    databaseMigrationUrl,
    dbSslRequired,
    dbPoolLimit,
  }

  return cachedConfig
}

export function isDatabaseEnabled(): boolean {
  return getDbConfig().enabled
}
