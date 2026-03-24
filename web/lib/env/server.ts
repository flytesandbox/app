import 'server-only'

import { getDbConfig } from '@/lib/db/config'

const APP_ENV_VALUES = ['local', 'ci', 'staging', 'prod'] as const
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

type AppEnv = (typeof APP_ENV_VALUES)[number]

const APP_ENV_ALLOWED_HOSTS: Record<AppEnv, readonly string[]> = {
  local: ['localhost', '127.0.0.1', '::1'],
  ci: ['localhost', '127.0.0.1', '::1'],
  staging: ['staging.mecplans101.com'],
  prod: ['mecplans101.com'],
}

export type ServerEnv = {
  appEnv: AppEnv
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

function readAppEnv(name: string, value: string | undefined): AppEnv {
  const normalized = requireEnv(name, value)

  if ((APP_ENV_VALUES as readonly string[]).includes(normalized)) {
    return normalized as AppEnv
  }

  throw new Error(
    `[env/server] ${name} must be one of: ${APP_ENV_VALUES.join(', ')}`,
  )
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

function validateUrlForAppEnv(
  name: string,
  value: string,
  appEnv: AppEnv,
): string {
  const parsed = new URL(value)
  const allowedHosts = APP_ENV_ALLOWED_HOSTS[appEnv]

  if (!allowedHosts.includes(parsed.hostname)) {
    throw new Error(
      `[env/server] ${name} must use a ${appEnv} host. Allowed hosts: ${allowedHosts.join(', ')}`,
    )
  }

  if ((appEnv === 'staging' || appEnv === 'prod') && parsed.protocol !== 'https:') {
    throw new Error(`[env/server] ${name} must use https:// when APP_ENV=${appEnv}`)
  }

  if (
    (appEnv === 'local' || appEnv === 'ci') &&
    !LOCAL_HOSTS.has(parsed.hostname)
  ) {
    throw new Error(
      `[env/server] ${name} must stay on loopback/local hosts when APP_ENV=${appEnv}`,
    )
  }

  return value
}

function readAuthorizedParties(
  name: string,
  value: string | undefined,
  requiredOrigin: string,
  appEnv: AppEnv,
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

    validateUrlForAppEnv(name, part, appEnv)
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
      '[env/server] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_test_ or pk_live_. Use the real Clerk publishable key for this environment and do not wrap it in quotes.',
    )
  }

  return value
}

function validateClerkSecretKey(value: string): string {
  if (!value.startsWith('sk_test_') && !value.startsWith('sk_live_')) {
    throw new Error(
      '[env/server] CLERK_SECRET_KEY must start with sk_test_ or sk_live_. Use the real Clerk secret key for this environment and do not wrap it in quotes.',
    )
  }

  return value
}

function validateClerkJwtKey(value: string): string {
  const normalized = normalizePem(value)

  if (!normalized.includes('BEGIN PUBLIC KEY')) {
    throw new Error(
      '[env/server] CLERK_JWT_KEY must contain a PEM public key. Copy the full Clerk JWT public key including the BEGIN/END lines.',
    )
  }

  return normalized
}

function clerkKeyFamily(value: string): 'test' | 'live' | 'unknown' {
  if (value.includes('_test_')) {
    return 'test'
  }

  if (value.includes('_live_')) {
    return 'live'
  }

  return 'unknown'
}

function validateClerkKeyEnvironment(
  appEnv: AppEnv,
  publishableKey: string,
  secretKey: string,
) {
  const publishableKeyFamily = clerkKeyFamily(publishableKey)
  const secretKeyFamily = clerkKeyFamily(secretKey)

  if (publishableKeyFamily !== secretKeyFamily) {
    throw new Error(
      '[env/server] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY must both be test keys or both be live keys.',
    )
  }

  if ((appEnv === 'local' || appEnv === 'ci') && publishableKeyFamily !== 'test') {
    throw new Error(
      `[env/server] ${appEnv} must use Clerk test keys only. Live keys do not belong in local/CI environments.`,
    )
  }

  if (appEnv === 'prod' && publishableKeyFamily !== 'live') {
    throw new Error(
      '[env/server] APP_ENV=prod must use Clerk live keys only.',
    )
  }
}

function validateTestAuthBoundary(appEnv: AppEnv) {
  if (
    process.env.PHASE5_TEST_AUTH === '1' &&
    appEnv !== 'local' &&
    appEnv !== 'ci'
  ) {
    throw new Error(
      `[env/server] PHASE5_TEST_AUTH may only be enabled in local/ci. Refusing startup for APP_ENV=${appEnv}.`,
    )
  }
}

function validateServerEnv(): ServerEnv {
  const appEnv = readAppEnv('APP_ENV', process.env.APP_ENV)
  const nextPublicAppUrl = readHttpUrlEnv(
    'NEXT_PUBLIC_APP_URL',
    process.env.NEXT_PUBLIC_APP_URL,
  )
  validateUrlForAppEnv('NEXT_PUBLIC_APP_URL', nextPublicAppUrl, appEnv)

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
    appEnv,
  )

  validateClerkKeyEnvironment(appEnv, clerkPublishableKey, clerkSecretKey)
  validateTestAuthBoundary(appEnv)

  const dbConfig = getDbConfig()

  return {
    appEnv,
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
