import fs from 'node:fs/promises'
import path from 'node:path'
import mysql from 'mysql2/promise'

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

async function main() {
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

      await client.beginTransaction()
      try {
        await client.query(sql)
        await client.execute(
          'INSERT INTO schema_migrations (version) VALUES (?)',
          [file],
        )
        await client.commit()
      } catch (error) {
        await client.rollback()
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