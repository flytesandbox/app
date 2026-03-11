import 'server-only'

import type { FieldPacket, QueryResult } from 'mysql2'

import { getDbPool } from './pool'

export type DbParams = unknown[] | Record<string, unknown>

export async function dbExecute<T extends QueryResult = QueryResult>(
  sql: string,
  params: DbParams = [],
): Promise<[T, FieldPacket[]]> {
  const pool = getDbPool()

  // Intentionally minimal for Step 4.
  // This is the central place to add query logging, timing, redaction,
  // and correlation metadata in later phases.
  const [result, fields] = await pool.execute(sql, params as never)

  return [result as T, fields]
}