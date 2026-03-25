const DEFAULT_TIMEOUT_MS = 15000

// This script stays limited to deploy-time release proof.
// Broader compliance, threat, and efficiency analysis belongs in Support.

function fail(message) {
  throw new Error(message)
}

function readRequiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    fail(`Missing required environment variable: ${name}`)
  }
  return value
}

function readOptionalEnv(name) {
  const value = process.env[name]?.trim()
  return value ? value : null
}

function normalizeBaseUrl(value) {
  let parsed

  try {
    parsed = new URL(value)
  } catch {
    fail(`RELEASE_GATE_BASE_URL must be an absolute URL. Received: ${value}`)
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    fail('RELEASE_GATE_BASE_URL must use http:// or https://')
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  return parsed
}

function readTimeoutMs() {
  const raw = readOptionalEnv('RELEASE_GATE_TIMEOUT_MS')
  if (!raw) {
    return DEFAULT_TIMEOUT_MS
  }

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    fail(`RELEASE_GATE_TIMEOUT_MS must be a positive integer. Received: ${raw}`)
  }

  return parsed
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchText(baseUrl, path, timeoutMs, init = {}) {
  const url = new URL(path, baseUrl).toString()
  const response = await fetchWithTimeout(url, init, timeoutMs)
  const body = await response.text()

  return { response, body, url }
}

async function fetchJson(baseUrl, path, timeoutMs) {
  const { response, body } = await fetchText(baseUrl, path, timeoutMs, {
    headers: {
      accept: 'application/json',
    },
  })

  if (response.status !== 200) {
    fail(`${path} returned HTTP ${response.status}; expected 200`)
  }

  let data
  try {
    data = JSON.parse(body)
  } catch {
    fail(`${path} did not return valid JSON`)
  }

  return data
}

function assert(condition, message) {
  if (!condition) {
    fail(message)
  }
}

function assertReleaseShape(release, source) {
  assert(release && typeof release === 'object', `${source} release payload is missing`)
  for (const key of [
    'appEnv',
    'imageName',
    'releaseGitSha',
    'releaseImageTag',
    'releaseDeployedAt',
    'releasePreviousGoodTag',
  ]) {
    assert(
      typeof release[key] === 'string' && release[key].trim().length > 0,
      `${source} release.${key} must be a non-empty string`,
    )
  }
}

function assertReleaseGateShape(releaseGate, source) {
  assert(
    releaseGate && typeof releaseGate === 'object',
    `${source} releaseGate payload is missing`,
  )
  assert(
    releaseGate.deploymentMode === 'preview' ||
      releaseGate.deploymentMode === 'db-backed',
    `${source} releaseGate.deploymentMode must be preview or db-backed`,
  )
  assert(
    releaseGate.expectedChecks?.env === 'ok',
    `${source} releaseGate.expectedChecks.env must be ok`,
  )
  assert(
    releaseGate.expectedChecks?.database === 'skipped' ||
      releaseGate.expectedChecks?.database === 'ok',
    `${source} releaseGate.expectedChecks.database must be skipped or ok`,
  )
  assert(
    releaseGate.authProtection?.protectedRoute === '/dashboard/live-check',
    `${source} auth protection route must stay /dashboard/live-check`,
  )
  assert(
    releaseGate.authProtection?.redirectPath === '/sign-in',
    `${source} auth protection redirect must stay /sign-in`,
  )
  assert(
    typeof releaseGate.rollback?.previousGoodTag === 'string',
    `${source} rollback.previousGoodTag must be a string`,
  )
  assert(
    typeof releaseGate.rollback?.hasPreviousGoodTag === 'boolean',
    `${source} rollback.hasPreviousGoodTag must be a boolean`,
  )
}

function assertReleaseMatch(reference, candidate, source) {
  assert(
    reference.releaseGitSha === candidate.releaseGitSha,
    `${source} releaseGitSha did not match /api/health`,
  )
  assert(
    reference.releaseImageTag === candidate.releaseImageTag,
    `${source} releaseImageTag did not match /api/health`,
  )
}

async function main() {
  const baseUrl = normalizeBaseUrl(readRequiredEnv('RELEASE_GATE_BASE_URL'))
  const timeoutMs = readTimeoutMs()
  const expectedSha = readOptionalEnv('EXPECTED_RELEASE_GIT_SHA')
  const expectedImageTag =
    readOptionalEnv('EXPECTED_RELEASE_IMAGE_TAG') ?? expectedSha
  const expectedMode = readOptionalEnv('EXPECTED_DEPLOYMENT_MODE')

  if (
    expectedMode &&
    expectedMode !== 'preview' &&
    expectedMode !== 'db-backed'
  ) {
    fail(
      `EXPECTED_DEPLOYMENT_MODE must be preview or db-backed when set. Received: ${expectedMode}`,
    )
  }

  console.log(`[release-gates] base url: ${baseUrl.toString()}`)

  const [health, ready, releasePayload] = await Promise.all([
    fetchJson(baseUrl, '/api/health', timeoutMs),
    fetchJson(baseUrl, '/api/ready', timeoutMs),
    fetchJson(baseUrl, '/api/release', timeoutMs),
  ])

  assert(health.ok === true, '/api/health must return ok=true')
  assert(health.status === 'alive', '/api/health must report status=alive')
  assertReleaseShape(health.release, '/api/health')

  assert(ready.ok === true, '/api/ready must return ok=true')
  assert(ready.status === 'ready', '/api/ready must report status=ready')
  assert(ready.checks?.env === 'ok', '/api/ready checks.env must be ok')
  assertReleaseShape(ready.release, '/api/ready')
  assertReleaseGateShape(ready.releaseGate, '/api/ready')
  assertReleaseMatch(health.release, ready.release, '/api/ready')
  assert(
    ready.checks?.database === ready.releaseGate.expectedChecks.database,
    '/api/ready database check did not match the declared release gate expectation',
  )

  assert(releasePayload.ok === true, '/api/release must return ok=true')
  assert(releasePayload.service === 'web', '/api/release must report service=web')
  assertReleaseShape(releasePayload.release, '/api/release')
  assertReleaseGateShape(releasePayload.releaseGate, '/api/release')
  assertReleaseMatch(health.release, releasePayload.release, '/api/release')
  assert(
    releasePayload.releaseGate.deploymentMode === ready.releaseGate.deploymentMode,
    '/api/release and /api/ready must agree on deploymentMode',
  )

  if (expectedSha) {
    assert(
      health.release.releaseGitSha === expectedSha,
      `/api/health releaseGitSha ${health.release.releaseGitSha} did not match expected ${expectedSha}`,
    )
  }

  if (expectedImageTag) {
    assert(
      health.release.releaseImageTag === expectedImageTag,
      `/api/health releaseImageTag ${health.release.releaseImageTag} did not match expected ${expectedImageTag}`,
    )
  }

  if (expectedMode) {
    assert(
      ready.releaseGate.deploymentMode === expectedMode,
      `/api/ready deploymentMode ${ready.releaseGate.deploymentMode} did not match expected ${expectedMode}`,
    )
  }

  const releasePage = await fetchText(baseUrl, '/release', timeoutMs)
  assert(releasePage.response.status === 200, '/release must return HTTP 200')
  assert(
    (releasePage.response.headers.get('content-type') || '').includes('text/html'),
    '/release must return HTML',
  )
  assert(
    /Release status/i.test(releasePage.body),
    '/release must include a human-readable release status heading',
  )
  assert(
    /Release gates/i.test(releasePage.body),
    '/release must include the release gates section',
  )

  const authRedirect = await fetchText(
    baseUrl,
    '/dashboard/live-check',
    timeoutMs,
    {
      redirect: 'manual',
    },
  )
  assert(
    [302, 303, 307, 308].includes(authRedirect.response.status),
    '/dashboard/live-check must redirect when unauthenticated',
  )

  const redirectLocation = authRedirect.response.headers.get('location') || ''
  assert(
    redirectLocation.includes('/sign-in'),
    `/dashboard/live-check redirect location must include /sign-in. Received: ${redirectLocation || '(empty)'}`,
  )

  console.log(
    `[release-gates] verified release sha=${health.release.releaseGitSha} tag=${health.release.releaseImageTag} mode=${ready.releaseGate.deploymentMode} db=${ready.checks.database}`,
  )
  if (releasePayload.releaseGate.rollback.hasPreviousGoodTag) {
    console.log(
      `[release-gates] previous good tag=${releasePayload.releaseGate.rollback.previousGoodTag}`,
    )
  } else {
    console.log('[release-gates] previous good tag has not been recorded yet')
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[release-gates] ${message}`)
  process.exit(1)
})
