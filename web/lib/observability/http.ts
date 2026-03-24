import 'server-only'

import { AuthzError } from '@/lib/authz'
import { getReleaseLogFields } from '@/lib/observability/release'
import {
  getOrCreateRequestId,
  REQUEST_ID_HEADER,
  REQUEST_ID_RESPONSE_HEADER,
} from '@/lib/observability/request-id'

const NO_STORE_CACHE_CONTROL = 'no-store, no-cache, must-revalidate'

type LogLevel = 'info' | 'warn' | 'error'
type JsonBody = Record<string, unknown>

export type ObservedRouteContext = {
  requestId: string
  routeId: string
  method: string
  path: string
  startedAtMs: number
}

type ErrorResponseMapping = {
  status: number
  body: JsonBody
  level?: LogLevel
  details?: Record<string, unknown>
}

type RouteHandler = (
  request: Request,
  observation: ObservedRouteContext,
) => Promise<Response>

type RouteOptions = {
  mapError?: (
    error: unknown,
    observation: ObservedRouteContext,
  ) => ErrorResponseMapping | null | undefined
}

function createObservedRouteContext(
  request: Request,
  routeId: string,
): ObservedRouteContext {
  const url = new URL(request.url)

  return {
    requestId: getOrCreateRequestId(request.headers.get(REQUEST_ID_HEADER)),
    routeId,
    method: request.method.toUpperCase(),
    path: `${url.pathname}${url.search}`,
    startedAtMs: Date.now(),
  }
}

function summarizeValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined
  }

  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((entry) => summarizeValue(entry))
  }

  if (value instanceof Error) {
    return summarizeError(value)
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {}

    for (const [key, entry] of Object.entries(value).slice(0, 20)) {
      const summarized = summarizeValue(entry)
      if (summarized !== undefined) {
        output[key] = summarized
      }
    }

    return output
  }

  return String(value)
}

function emitLog(
  level: LogLevel,
  event: string,
  observation: ObservedRouteContext,
  details: Record<string, unknown> = {},
) {
  const summarizedDetails = summarizeValue(details)
  const safeDetails =
    summarizedDetails && typeof summarizedDetails === 'object'
      ? summarizedDetails
      : {}

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...getReleaseLogFields(),
    requestId: observation.requestId,
    routeId: observation.routeId,
    method: observation.method,
    path: observation.path,
    ...safeDetails,
  }

  const line = JSON.stringify(payload)

  if (level === 'error') {
    console.error(line)
    return
  }

  if (level === 'warn') {
    console.warn(line)
    return
  }

  console.info(line)
}

function attachObservationHeaders(
  response: Response,
  observation: ObservedRouteContext,
): Response {
  const headers = new Headers(response.headers)
  headers.set(REQUEST_ID_RESPONSE_HEADER, observation.requestId)

  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', NO_STORE_CACHE_CONTROL)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function finalizeResponse(
  observation: ObservedRouteContext,
  response: Response,
  details: Record<string, unknown> = {},
): Response {
  const observedResponse = attachObservationHeaders(response, observation)
  const durationMs = Date.now() - observation.startedAtMs
  const level: LogLevel =
    observedResponse.status >= 500
      ? 'error'
      : observedResponse.status >= 400
        ? 'warn'
        : 'info'

  emitLog(level, 'http.request.complete', observation, {
    status: observedResponse.status,
    durationMs,
    ...details,
  })

  return observedResponse
}

export function summarizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    }
  }

  return {
    name: 'NonErrorThrown',
    message: String(error),
  }
}

export function logObservedEvent(
  level: LogLevel,
  event: string,
  observation: ObservedRouteContext,
  details: Record<string, unknown> = {},
) {
  emitLog(level, event, observation, details)
}

export function jsonResponse(
  observation: ObservedRouteContext,
  status: number,
  body: JsonBody,
  headers?: HeadersInit,
): Response {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Cache-Control', NO_STORE_CACHE_CONTROL)
  responseHeaders.set(REQUEST_ID_RESPONSE_HEADER, observation.requestId)

  return Response.json(
    {
      ...body,
      requestId: observation.requestId,
    },
    {
      status,
      headers: responseHeaders,
    },
  )
}

export function mapAuthzError(error: unknown): ErrorResponseMapping | null {
  if (!(error instanceof AuthzError)) {
    return null
  }

  return {
    status: error.status,
    level: 'warn',
    body: {
      ok: false,
      code: error.code,
      message: error.message,
    },
    details: {
      outcome: 'authz_error',
      authzCode: error.code,
    },
  }
}

export function withObservedRoute(
  routeId: string,
  handler: RouteHandler,
  options: RouteOptions = {},
) {
  return async function observedRoute(request: Request): Promise<Response> {
    const observation = createObservedRouteContext(request, routeId)
    emitLog('info', 'http.request.start', observation)

    try {
      const response = await handler(request, observation)
      return finalizeResponse(observation, response)
    } catch (error) {
      const mapped = options.mapError?.(error, observation)

      if (mapped) {
        const response = jsonResponse(observation, mapped.status, mapped.body)

        return finalizeResponse(observation, response, {
          ...mapped.details,
          error: summarizeError(error),
        })
      }

      emitLog('error', 'http.request.unhandled_error', observation, {
        durationMs: Date.now() - observation.startedAtMs,
        error: summarizeError(error),
      })

      return finalizeResponse(
        observation,
        jsonResponse(observation, 500, {
          ok: false,
          code: 'INTERNAL_ERROR',
          message: 'Unexpected server error.',
        }),
        { outcome: 'unhandled_error' },
      )
    }
  }
}
