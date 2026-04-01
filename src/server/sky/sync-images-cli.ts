import { syncSkyImageMetadata } from '@/server/sky/catalog'

async function main() {
  await syncSkyImageMetadata()
}

void main()
