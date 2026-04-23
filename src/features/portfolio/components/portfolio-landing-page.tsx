import { AppShell } from '@/components/app-shell'
import type { Profile, Project, SocialLink } from '@/lib/types'
import { PortfolioSection } from '@/features/portfolio/components/portfolio-section'

type PortfolioLandingPageProps = {
  profile: Profile
  socialLinks: SocialLink[]
  projects: Project[]
}

export function PortfolioLandingPage({
  profile,
  socialLinks,
  projects,
}: PortfolioLandingPageProps) {
  return (
    <AppShell>
      <PortfolioSection profile={profile} socialLinks={socialLinks} projects={projects} />
    </AppShell>
  )
}
