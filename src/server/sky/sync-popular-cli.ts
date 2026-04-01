import { syncPopularConstellations } from '@/server/sky/catalog'

async function main() {
  await syncPopularConstellations()
}

void main()
