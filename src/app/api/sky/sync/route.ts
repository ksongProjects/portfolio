import { isDatabaseConfigured } from '@/server/db/config'
import { syncSkyCatalog } from '@/server/sky/catalog'

export const runtime = 'nodejs'

export async function POST() {
  if (!isDatabaseConfigured()) {
    return Response.json(
      {
        ok: false,
        message: 'Supabase database is not configured yet.',
      },
      { status: 503 },
    )
  }

  await syncSkyCatalog()

  return Response.json({
    ok: true,
    message: 'Sky catalog synchronized.',
  })
}
