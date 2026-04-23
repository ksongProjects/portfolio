import { maybeEnsureSkyDataset } from '@/server/sky/repository'

export async function getNightSkyPageData() {
  const skyDataset = await maybeEnsureSkyDataset()

  return {
    skyDataset,
    initialNowIso: new Date().toISOString(),
  }
}
