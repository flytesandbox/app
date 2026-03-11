import 'server-only'

import { getDbConfig } from '@/lib/db/config'

export type ServerEnv = {
  clerkPublishableKey: string
  clerkSecretKey: string
  clerkJwtKey: string
  clerkAuthorizedParties: string[]
  nextPublicAppUrl: string
  databaseEnabled: boolean
  databaseUrl: string | null
  databaseMigrationUrl: string | null
  dbSslRequired: boolean
  dbPoolLimit: number
}

function normalizeEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function normalizePem(value: string): string {
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value
}

function requireEnv(name: string, value: string | undefined): string {
  const normalized = normalizeEnv(value)

  if (!normalized) {
    throw new Error(`[env/server] Missing required environment variable: ${name}`)
  }

  return normalized
}

function readHttpUrlEnv(name: string, value: string | undefined): string {
  const normalized = requireEnv(name, value)

  let parsed: URL

  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error(`[env/server] ${name} must be a valid absolute URL`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`[env/server] ${name} must use http:// or https://`)
  }

  return normalized
}

function readAuthorizedParties(
  name: string,
  value: string | undefined,
  requiredOrigin: string,
): string[] {
  const normalized = requireEnv(name, value)

  const parts = normalized
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    throw new Error(`[env/server] ${name} must contain at least one origin`)
  }

  for (const part of parts) {
    let parsed: URL

    try {
      parsed = new URL(part)
    } catch {
      throw new Error(`[env/server] ${name} contains an invalid URL: ${part}`)
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(
        `[env/server] ${name} entries must use http:// or https://: ${part}`,
      )
    }
  }

  if (!parts.includes(requiredOrigin)) {
    throw new Error(
      `[env/server] ${name} must include NEXT_PUBLIC_APP_URL (${requiredOrigin})`,
    )
  }

  return parts
}

function validateClerkPublishableKey(value: string): string {
  if (!value.startsWith('pk_test_') && !value.startsWith('pk_live_')) {
    throw new Error(
      '[env/server] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_test_ or pk_live_',
    )
  }

  return value
}

function validateClerkSecretKey(value: string): string {
  if (!value.startsWith('sk_test_') && !value.startsWith('sk_live_')) {
    throw new Error(
      '[env/server] CLERK_SECRET_KEY must start with sk_test_ or sk_live_',
    )
  }

  return value
}

function validateClerkJwtKey(value: string): string {
  const normalized = normalizePem(value)

  if (!normalized.includes('BEGIN PUBLIC KEY')) {
    throw new Error(
      '[env/server] CLERK_JWT_KEY must contain a PEM public key',
    )
  }

  return normalized
}

function validateServerEnv(): ServerEnv {
  const nextPublicAppUrl = readHttpUrlEnv(
    'NEXT_PUBLIC_APP_URL',
    process.env.NEXT_PUBLIC_APP_URL,
  )

  const clerkPublishableKey = validateClerkPublishableKey(
    requireEnv(
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    ),
  )

  const clerkSecretKey = validateClerkSecretKey(
    requireEnv('CLERK_SECRET_KEY', process.env.CLERK_SECRET_KEY),
  )

  const clerkJwtKey = validateClerkJwtKey(
    requireEnv('CLERK_JWT_KEY', process.env.CLERK_JWT_KEY),
  )

  const clerkAuthorizedParties = readAuthorizedParties(
    'CLERK_AUTHORIZED_PARTIES',
    process.env.CLERK_AUTHORIZED_PARTIES,
    nextPublicAppUrl,
  )

  const dbConfig = getDbConfig()

  return {
    clerkPublishableKey,
    clerkSecretKey,
    clerkJwtKey,
    clerkAuthorizedParties,
    nextPublicAppUrl,
    databaseEnabled: dbConfig.enabled,
    databaseUrl: dbConfig.enabled ? dbConfig.databaseUrl : null,
    databaseMigrationUrl: dbConfig.enabled ? dbConfig.databaseMigrationUrl : null,
    dbSslRequired: dbConfig.dbSslRequired,
    dbPoolLimit: dbConfig.dbPoolLimit,
  }
}

let cachedServerEnv: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv
  }

  cachedServerEnv = validateServerEnv()
  return cachedServerEnv
}