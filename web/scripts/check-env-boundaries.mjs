import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')

const failures = []
const LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'host.docker.internal',
  '0.0.0.0',
  '0.0.0.1',
])

function fail(message) {
  failures.push(message)
}

function expect(condition, message) {
  if (!condition) {
    fail(message)
  }
}

function parseEnvFile(text) {
  const values = {}

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    values[key] = value
  }

  return values
}

function parseUrl(name, value) {
  try {
    return new URL(value)
  } catch {
    fail(`${name} must be a valid absolute URL`)
    return null
  }
}

function validateOrigin(name, value, expectedHost, options = {}) {
  const { requiredProtocol = null, localOnly = false } = options
  const parsed = parseUrl(name, value)

  if (!parsed) {
    return
  }

  if (requiredProtocol && parsed.protocol !== requiredProtocol) {
    fail(`${name} must use ${requiredProtocol}//`)
  }

  if (parsed.hostname !== expectedHost) {
    fail(`${name} must use host ${expectedHost}; found ${parsed.hostname}`)
  }

  if (localOnly && !LOCAL_HOSTS.has(parsed.hostname)) {
    fail(`${name} must stay on local-only hosts`)
  }

  if (!localOnly && LOCAL_HOSTS.has(parsed.hostname)) {
    fail(`${name} must not use local-only hosts`)
  }
}

function validateMysqlUrl(name, value, expectedDatabase, options = {}) {
  const { localOnly = false } = options
  let parsed

  try {
    parsed = new URL(value)
  } catch {
    fail(`${name} must be a valid mysql:// URL`)
    return
  }

  if (parsed.protocol !== 'mysql:') {
    fail(`${name} must use mysql://`)
  }

  if (!parsed.hostname) {
    fail(`${name} must include a hostname`)
  }

  const databaseName = parsed.pathname.replace(/^\//, '')
  if (databaseName !== expectedDatabase) {
    fail(`${name} must target ${expectedDatabase}; found ${databaseName || '(missing)'}`)
  }

  if (localOnly && !LOCAL_HOSTS.has(parsed.hostname)) {
    fail(`${name} must stay on local-only DB hosts`)
  }

  if (!localOnly && LOCAL_HOSTS.has(parsed.hostname)) {
    fail(`${name} must not use local-only DB hosts`)
  }
}

async function readText(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath)

  try {
    return await fs.readFile(absolutePath, 'utf8')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      fail(
        `${relativePath} is missing from the repository. Required boundary example/config files must be tracked.`,
      )
      return null
    }

    throw error
  }
}

async function validateLocalEnvExample() {
  const text = await readText('web/.env.example')
  if (text === null) {
    return
  }

  const env = parseEnvFile(text)

  expect(env.APP_ENV === 'local', 'web/.env.example APP_ENV must be local')
  validateOrigin(
    'web/.env.example NEXT_PUBLIC_APP_URL',
    env.NEXT_PUBLIC_APP_URL,
    'localhost',
    { localOnly: true },
  )
  expect(
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_'),
    'web/.env.example must use a Clerk test publishable key placeholder',
  )
  expect(
    env.CLERK_SECRET_KEY?.startsWith('sk_test_'),
    'web/.env.example must use a Clerk test secret key placeholder',
  )
  expect(
    env.CLERK_AUTHORIZED_PARTIES === env.NEXT_PUBLIC_APP_URL,
    'web/.env.example CLERK_AUTHORIZED_PARTIES must match NEXT_PUBLIC_APP_URL',
  )
  validateMysqlUrl(
    'web/.env.example DATABASE_URL',
    env.DATABASE_URL,
    'app_local',
    { localOnly: true },
  )
  validateMysqlUrl(
    'web/.env.example DATABASE_MIGRATION_URL',
    env.DATABASE_MIGRATION_URL,
    'app_local',
    { localOnly: true },
  )
  expect(
    env.DB_SSL_REQUIRED === 'false',
    'web/.env.example DB_SSL_REQUIRED must stay false for local development',
  )
}

async function validateStagingRuntimeExample() {
  const text = await readText('infra/compose/staging/runtime.env.example')
  if (text === null) {
    return
  }

  const env = parseEnvFile(text)

  expect(
    env.APP_ENV === 'staging',
    'infra/compose/staging/runtime.env.example APP_ENV must be staging',
  )
  validateOrigin(
    'infra/compose/staging/runtime.env.example NEXT_PUBLIC_APP_URL',
    env.NEXT_PUBLIC_APP_URL,
    'staging.mecplans101.com',
    { requiredProtocol: 'https:' },
  )
  expect(
    env.CLERK_AUTHORIZED_PARTIES === env.NEXT_PUBLIC_APP_URL,
    'infra/compose/staging/runtime.env.example CLERK_AUTHORIZED_PARTIES must match NEXT_PUBLIC_APP_URL',
  )
  expect(
    env.DATABASE_ENABLED === 'false',
    'infra/compose/staging/runtime.env.example should default DATABASE_ENABLED=false until real staging DB values are supplied out-of-band',
  )
  validateMysqlUrl(
    'infra/compose/staging/runtime.env.example DATABASE_URL',
    env.DATABASE_URL,
    'app_staging',
  )
  validateMysqlUrl(
    'infra/compose/staging/runtime.env.example DATABASE_MIGRATION_URL',
    env.DATABASE_MIGRATION_URL,
    'app_staging',
  )
  expect(
    env.DB_SSL_REQUIRED === 'true',
    'infra/compose/staging/runtime.env.example must keep DB_SSL_REQUIRED=true',
  )
}

async function validateStagingComposeFiles() {
  const exampleText = await readText('infra/compose/staging/.env.example')
  const trackedText = await readText('staging/compose.env')
  if (exampleText === null || trackedText === null) {
    return
  }

  const example = parseEnvFile(exampleText)
  const tracked = parseEnvFile(trackedText)

  expect(
    example.STAGING_WEB_HOST === 'staging.mecplans101.com',
    'infra/compose/staging/.env.example STAGING_WEB_HOST must stay on the staging hostname',
  )
  expect(
    tracked.STAGING_WEB_HOST === 'staging.mecplans101.com',
    'staging/compose.env STAGING_WEB_HOST must stay on the staging hostname',
  )
  expect(
    tracked.APP_RUNTIME_ENV_FILE === '.env',
    'staging/compose.env APP_RUNTIME_ENV_FILE must stay .env at the deploy root',
  )
  expect(
    !LOCAL_HOSTS.has(example.STAGING_WEB_HOST),
    'infra/compose/staging/.env.example must not point STAGING_WEB_HOST at localhost/loopback',
  )
}

async function validateWorkflows() {
  const prWorkflow = await readText('.github/workflows/pr.yml')
  const deployWorkflow = await readText('.github/workflows/deploy-staging.yml')
  if (prWorkflow === null || deployWorkflow === null) {
    return
  }

  expect(
    prWorkflow.includes('APP_ENV: ci'),
    '.github/workflows/pr.yml must keep APP_ENV=ci',
  )
  expect(
    prWorkflow.includes('NEXT_PUBLIC_APP_URL: http://127.0.0.1:3001'),
    '.github/workflows/pr.yml must keep CI app URL on loopback',
  )
  expect(
    prWorkflow.includes('CLERK_AUTHORIZED_PARTIES: http://127.0.0.1:3001'),
    '.github/workflows/pr.yml must keep CI authorized parties on loopback',
  )
  expect(
    deployWorkflow.includes('environment: staging'),
    '.github/workflows/deploy-staging.yml must target the staging GitHub environment',
  )
  expect(
    deployWorkflow.includes(
      'unset PROBE_SCHEME PROBE_PORT PROBE_IP PROBE_CONNECT_TIMEOUT PROBE_MAX_TIME',
    ),
    '.github/workflows/deploy-staging.yml must clear inherited PROBE_* variables before the remote deploy',
  )
}

async function main() {
  await validateLocalEnvExample()
  await validateStagingRuntimeExample()
  await validateStagingComposeFiles()
  await validateWorkflows()

  if (failures.length > 0) {
    console.error('Environment boundary audit failed:')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log('Environment boundary audit passed.')
}

main().catch((error) => {
  console.error('Environment boundary audit crashed.')
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
