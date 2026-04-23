import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PortfolioLandingPage } from '@/features/portfolio/components/portfolio-landing-page'
import { PortfolioLoadingState } from '@/features/portfolio/components/portfolio-loading-state'
import { PortfolioProjectList } from '@/features/portfolio/components/portfolio-project-list'
import { profile, socialLinks } from '@/lib/portfolio-content'
import { getOrganizationProjects } from '@/server/github/repository'

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Portfolio landing page and entry point into the demo app collection.',
}

export default function Home() {
  return (
    <PortfolioLandingPage profile={profile} socialLinks={socialLinks}>
      <Suspense fallback={<PortfolioLoadingState />}>
        <PortfolioProjectsContent />
      </Suspense>
    </PortfolioLandingPage>
  )
}

async function PortfolioProjectsContent() {
  const projects = await getOrganizationProjects()

  return <PortfolioProjectList projects={projects} />
}
