import { isDatabaseConfigured } from '@/server/db/config'
import { syncSkyCatalog } from './catalog'

async function main(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'Set DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL to your Supabase transaction pooler URL first.',
    )
  }

  await syncSkyCatalog()
  console.log('Sky catalog sync complete.')
}

void main()
