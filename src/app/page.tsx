import { PortfolioApp } from '@/components/portfolio-app'
import { profile, socialLinks } from '@/lib/portfolio-content'
import { getProjectsWithRepoActivity } from '@/server/github/repository'
import { maybeEnsureSkyDataset } from '@/server/sky/repository'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [skyDataset, projects] = await Promise.all([
    maybeEnsureSkyDataset(),
    getProjectsWithRepoActivity(),
  ])

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
