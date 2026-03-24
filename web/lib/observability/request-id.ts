export const REQUEST_ID_HEADER = 'x-request-id'
export const REQUEST_ID_RESPONSE_HEADER = 'X-Request-Id'

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

export function normalizeRequestId(value: string | null): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed || !REQUEST_ID_PATTERN.test(trimmed)) {
    return null
  }

  return trimmed
}

export function getOrCreateRequestId(value: string | null): string {
  return normalizeRequestId(value) ?? globalThis.crypto.randomUUID()
}
