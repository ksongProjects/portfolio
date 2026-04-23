import type { Metadata } from 'next'
import { PortfolioLandingPage } from '@/features/portfolio/components/portfolio-landing-page'
import { getPortfolioPageData } from '@/features/portfolio/server/get-portfolio-page-data'

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Portfolio landing page and entry point into the demo app collection.',
}

export default async function Home() {
  const { profile, socialLinks, projects } = await getPortfolioPageData()

  return (
    <PortfolioLandingPage profile={profile} socialLinks={socialLinks} projects={projects} />
  )
}
