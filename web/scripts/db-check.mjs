import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import nextEnv from '@next/env'
import mysql from 'mysql2/promise'

const { loadEnvConfig } = nextEnv

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const migrationsDir = path.join(projectRoot, 'db', 'migrations')

loadEnvConfig(projectRoot)

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
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function readBoolean(name, defaultValue = false) {
  const value = process.env[name]?.trim().toLowerCase()

  if (!value) return defaultValue
  if (['1', 'true', 'yes', 'on'].includes(value)) return true
  if (['0', 'false', 'no', 'off'].includes(value)) return false

  throw new Error(
    `${name} must be one of: true/false, 1/0, yes/no, on/off`,
  )
}

function readAppEnv() {
  const value = requireEnv('APP_ENV')

  if (!Object.hasOwn(APP_ENV_RULES, value)) {
    throw new Error(
      `APP_ENV must be one of: ${Object.keys(APP_ENV_RULES).join(', ')}`,
    )
  }

  return value
}

function validateMysqlUrl(name, value, appEnv) {
  let parsed

  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid URL`)
  }

  if (parsed.protocol !== 'mysql:') {
    throw new Error(`${name} must use mysql://`)
  }

  if (!parsed.hostname) {
    throw new Error(`${name} must include a hostname`)
  }

  if (!parsed.pathname || parsed.pathname === '/') {
    throw new Error(`${name} must include a database name`)
  }

  const expectedDatabase = APP_ENV_RULES[appEnv].database
  if (parsed.pathname.replace(/^\//, '') !== expectedDatabase) {
    throw new Error(`${name} must target ${expectedDatabase} when APP_ENV=${appEnv}`)
  }

  const isLocalHost = LOCAL_DB_HOSTS.has(parsed.hostname)
  if (APP_ENV_RULES[appEnv].localOnly && !isLocalHost) {
    throw new Error(`${name} must stay on local-only DB hosts when APP_ENV=${appEnv}`)
  }

  if (!APP_ENV_RULES[appEnv].localOnly && isLocalHost) {
    throw new Error(`${name} must not use local-only DB hosts when APP_ENV=${appEnv}`)
  }

  return value
}

async function getExpectedMigrationFiles() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
}

async function main() {
  const appEnv = readAppEnv()
  const databaseEnabled = readBoolean('DATABASE_ENABLED', false)

  if (!databaseEnabled) {
    throw new Error(
      'DATABASE_ENABLED=false. Refusing to run DB health check against a disabled database.',
    )
  }

  const databaseUrl = validateMysqlUrl(
    'DATABASE_URL',
    requireEnv('DATABASE_URL'),
    appEnv,
  )

  const dbSslRequired = readBoolean('DB_SSL_REQUIRED', false)

  if (APP_ENV_RULES[appEnv].requireSsl && !dbSslRequired) {
    throw new Error(`DB_SSL_REQUIRED must be true when APP_ENV=${appEnv}`)
  }

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    ssl: dbSslRequired ? {} : undefined,
  })

  try {
    // 1) DB connection works
    await connection.query('SELECT 1 AS connection_ok')

    // 2) schema_migrations exists
    const [schemaTableRows] = await connection.query(
      `
        SELECT COUNT(*) AS table_count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'schema_migrations'
      `,
    )

    const schemaMigrationsExists = Number(schemaTableRows[0].table_count) === 1

    if (!schemaMigrationsExists) {
      throw new Error('schema_migrations table does not exist')
    }

    // 3) expected migration count exists
    const expectedFiles = await getExpectedMigrationFiles()

    const [appliedRows] = await connection.query(
      'SELECT version FROM schema_migrations ORDER BY version ASC',
    )

    const appliedVersions = appliedRows.map((row) => row.version).sort()
    const missingVersions = expectedFiles.filter(
      (version) => !appliedVersions.includes(version),
    )

    if (appliedVersions.length !== expectedFiles.length) {
      throw new Error(
        `Migration count mismatch. Expected ${expectedFiles.length}, found ${appliedVersions.length}. Missing: ${missingVersions.join(', ') || 'none'}`,
      )
    }

    if (missingVersions.length > 0) {
      throw new Error(
        `Missing applied migrations: ${missingVersions.join(', ')}`,
      )
    }

    // 4) simple read query succeeds
    const [applicationCountRows] = await connection.query(
      'SELECT COUNT(*) AS application_count FROM applications',
    )

    const applicationCount = Number(applicationCountRows[0].application_count)

    console.log('DB health check passed.')
    console.log(`Database connection: OK`)
    console.log(`schema_migrations exists: YES`)
    console.log(`Expected migrations applied: ${appliedVersions.length}/${expectedFiles.length}`)
    console.log(`applications read query OK: count=${applicationCount}`)
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error('DB health check failed.')
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
