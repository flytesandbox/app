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

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off', ''])

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

function validateMysqlUrl(name: string, value: string): string {
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

  return value
}

export function getDbConfig(): DbConfig {
  if (cachedConfig) {
    return cachedConfig
  }

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

  const databaseUrl = validateMysqlUrl(
    'DATABASE_URL',
    requireEnv('DATABASE_URL', process.env.DATABASE_URL),
  )

  const databaseMigrationUrl = validateMysqlUrl(
    'DATABASE_MIGRATION_URL',
    requireEnv('DATABASE_MIGRATION_URL', process.env.DATABASE_MIGRATION_URL),
  )

  const dbSslRequired = readBooleanEnv(
    'DB_SSL_REQUIRED',
    process.env.DB_SSL_REQUIRED,
    false,
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