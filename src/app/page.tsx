import { PortfolioApp } from '@/components/portfolio-app'
import { profile, projects, socialLinks } from '@/lib/portfolio-content'
import { maybeEnsureSkyDataset } from '@/server/sky/repository'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const skyDataset = await maybeEnsureSkyDataset()

  return (
    <PortfolioApp
      profile={profile}
      socialLinks={socialLinks}
      projects={projects}
      skyDataset={skyDataset}
      initialNowIso={new Date().toISOString()}
    />
  )
}
