import type { Metadata } from 'next'
import { NightSkyPage } from '@/features/night-sky/components/night-sky-page'
import { getNightSkyPageData } from '@/features/night-sky/server/get-night-sky-page-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Night Sky',
  description: 'Interactive night sky explorer route backed by the sky dataset pipeline.',
}

export default async function NightSkyRoute() {
  const { skyDataset, initialNowIso } = await getNightSkyPageData()

  return <NightSkyPage skyDataset={skyDataset} initialNowIso={initialNowIso} />
}
