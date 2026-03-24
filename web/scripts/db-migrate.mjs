import fs from 'node:fs/promises'
import path from 'node:path'
import mysql from 'mysql2/promise'

const LOCAL_DB_HOSTS = new Set([
  '127.0.0.1',
  'localhost',
  '::1',
  'host.docker.internal',
  '0.0.0.0',
  '0.0.0.1',
])
const APP_ENV_RULES = {
  local: {
    database: 'app_local',
    localOnly: true,
    requireSsl: false,
  },
  ci: {
    database: 'app_ci',
    localOnly: true,
    requireSsl: false,
  },
  staging: {
    database: 'app_staging',
    localOnly: false,
    requireSsl: true,
  },
  prod: {
    database: 'app_prod',
    localOnly: false,
    requireSsl: true,
  },
}

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`[db-migrate] Missing required environment variable: ${name}`)
  }
  return value
}

function readBooleanEnv(name, defaultValue = false) {
  const raw = process.env[name]?.trim().toLowerCase()
  if (raw === undefined || raw === '') return defaultValue
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true
  if (['0', 'false', 'no', 'off'].includes(raw)) return false
  throw new Error(`[db-migrate] ${name} must be a boolean-like value`)
}

function readAppEnv() {
  const value = requireEnv('APP_ENV')

  if (!Object.hasOwn(APP_ENV_RULES, value)) {
    throw new Error(
      `[db-migrate] APP_ENV must be one of: ${Object.keys(APP_ENV_RULES).join(', ')}`,
    )
  }

  return value
}

function parseMysqlUrl(connectionUrl) {
  const url = new URL(connectionUrl)
  const database = url.pathname.replace(/^\//, '')

  if (url.protocol !== 'mysql:') {
    throw new Error('[db-migrate] DATABASE_MIGRATION_URL must use mysql://')
  }

  if (!url.hostname) {
    throw new Error('[db-migrate] DATABASE_MIGRATION_URL must include a hostname')
  }

  if (!database) {
    throw new Error('[db-migrate] DATABASE_MIGRATION_URL must include a database name')
  }

  return {
    host: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  }
}

function validateConnectionBoundary(appEnv, connection, dbSslRequired) {
  const rule = APP_ENV_RULES[appEnv]

  if (connection.database !== rule.database) {
    throw new Error(
      `[db-migrate] DATABASE_MIGRATION_URL must target ${rule.database} when APP_ENV=${appEnv}`,
    )
  }

  const isLocalHost = LOCAL_DB_HOSTS.has(connection.host)
  if (rule.localOnly && !isLocalHost) {
    throw new Error(
      `[db-migrate] DATABASE_MIGRATION_URL must stay on local-only DB hosts when APP_ENV=${appEnv}`,
    )
  }

  if (!rule.localOnly && isLocalHost) {
    throw new Error(
      `[db-migrate] DATABASE_MIGRATION_URL must not use local-only DB hosts when APP_ENV=${appEnv}`,
    )
  }

  if (rule.requireSsl && !dbSslRequired) {
    throw new Error(
      `[db-migrate] DB_SSL_REQUIRED must be true when APP_ENV=${appEnv}`,
    )
  }
}

async function main() {
  const appEnv = readAppEnv()
  const migrationUrl = requireEnv('DATABASE_MIGRATION_URL')
  const dbSslRequired = readBooleanEnv('DB_SSL_REQUIRED', false)
  const migrationsDir = path.resolve(process.cwd(), 'db/migrations')

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    throw new Error('[db-migrate] No migration files found in db/migrations')
  }

  const connection = parseMysqlUrl(migrationUrl)
  validateConnectionBoundary(appEnv, connection, dbSslRequired)

  const client = await mysql.createConnection({
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    database: connection.database,
    ssl: dbSslRequired ? {} : undefined,
    multipleStatements: true,
  })

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const [rows] = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version ASC',
    )

    const applied = new Set(rows.map((row) => row.version))

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[db-migrate] skipping already-applied migration: ${file}`)
        continue
      }

      console.log(`[db-migrate] applying migration: ${file}`)
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8')

      try {
        await client.query(sql)
        await client.execute(
          'INSERT INTO schema_migrations (version) VALUES (?)',
          [file],
        )
      } catch (error) {
        console.error(
          `[db-migrate] migration failed before recording version: ${file}`,
        )
        throw error
      }
    }

    console.log('[db-migrate] migration run complete')
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
