import {
  test,
  expect,
  request as playwrightRequest,
  type Browser,
} from '@playwright/test'

async function newScenarioPage(browser: Browser, scenario: string) {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3001',
    extraHTTPHeaders: {
      'x-test-auth-scenario': scenario,
    },
  })

  const page = await context.newPage()
  return { context, page }
}

async function newScenarioRequest(scenario: string) {
  return await playwrightRequest.newContext({
    baseURL: 'http://127.0.0.1:3001',
    extraHTTPHeaders: {
      'x-test-auth-scenario': scenario,
    },
  })
}

test('unauthenticated user cannot access /dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/sign-in/)
})

test('unauthenticated user cannot access /dashboard/admin', async ({ page }) => {
  await page.goto('/dashboard/admin')
  await expect(page).toHaveURL(/\/sign-in/)
})

test('employer user cannot access admin routes', async ({ browser }) => {
  const { context, page } = await newScenarioPage(browser, 'employer')

  const response = await page.goto('/dashboard/admin')

  expect(response).not.toBeNull()
  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: 'Admin' }),
  ).not.toBeVisible()

  await context.close()
})

test('reviewer can access review queue but not tenant member management', async ({
  browser,
}) => {
  const { context, page } = await newScenarioPage(browser, 'reviewer')

  await page.goto('/dashboard/admin/applications')
  await expect(
    page.getByRole('heading', { name: 'Admin Applications' }),
  ).toBeVisible()

  await page.goto('/dashboard/tenant-members')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await context.close()
})

test('read-only auditor cannot mutate anything', async () => {
  const api = await newScenarioRequest('auditor')

  const response = await api.post('/api/private/admin/status-change')
  expect(response.status()).toBe(403)

  const body = await response.json()
  expect(body.ok).toBe(false)
  expect(body.code).toBe('MISSING_PERMISSION')

  await api.dispose()
})

test('wrong-tenant request is denied', async () => {
  const api = await newScenarioRequest('employer')

  const response = await api.get(
    '/api/private/application?recordTenantId=tenant-someone-else',
  )

  expect(response.status()).toBe(403)

  const body = await response.json()
  expect(body.ok).toBe(false)
  expect(body.code).toBe('CROSS_TENANT_ACCESS')

  await api.dispose()
})