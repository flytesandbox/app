export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function noStoreJson(status: number, body: unknown) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

export async function GET() {
  return noStoreJson(200, {
    ok: true,
    status: 'alive',
    service: 'web',
    timestamp: new Date().toISOString(),
  })
}