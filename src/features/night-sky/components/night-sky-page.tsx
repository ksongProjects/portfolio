import { AppShell } from '@/components/app-shell'
import type { SkyDataset } from '@/lib/types'
import { NightSkySection } from '@/features/night-sky/components/night-sky-section'
import { NightSkySetupSection } from '@/features/night-sky/components/night-sky-setup-section'

type NightSkyPageProps = {
  skyDataset: SkyDataset | null
  initialNowIso: string
}

export function NightSkyPage({ skyDataset, initialNowIso }: NightSkyPageProps) {
  return (
    <AppShell>
      {skyDataset ? (
        <NightSkySection dataset={skyDataset} initialNowIso={initialNowIso} />
      ) : (
        <NightSkySetupSection />
      )}
    </AppShell>
  )
}
