import 'server-only'

import mysql, { type Pool } from 'mysql2/promise'

import { getDbConfig } from './config'

declare global {
  var __appDbPool: Pool | undefined
}

function parseConnectionUrl(connectionUrl: string) {
  const url = new URL(connectionUrl)
  const database = url.pathname.replace(/^\//, '')

  return {
    host: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  }
}

function createDbPool(): Pool {
  const config = getDbConfig()

  if (!config.enabled) {
    throw new Error(
      '[db/pool] Database is disabled. Set DATABASE_ENABLED=true before requesting a pool.',
    )
  }

  const connection = parseConnectionUrl(config.databaseUrl)

  return mysql.createPool({
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    database: connection.database,
    waitForConnections: true,
    connectionLimit: config.dbPoolLimit,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: config.dbSslRequired ? {} : undefined,
  })
}

export function getDbPool(): Pool {
  if (!globalThis.__appDbPool) {
    globalThis.__appDbPool = createDbPool()
  }

  return globalThis.__appDbPool
}

export async function closeDbPool(): Promise<void> {
  if (!globalThis.__appDbPool) {
    return
  }

  await globalThis.__appDbPool.end()
  globalThis.__appDbPool = undefined
}