import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import type { Profile, SocialLink } from '@/lib/types'
import { PortfolioSection } from '@/features/portfolio/components/portfolio-section'

type PortfolioLandingPageProps = {
  profile: Profile
  socialLinks: SocialLink[]
  children: ReactNode
}

export function PortfolioLandingPage({
  profile,
  socialLinks,
  children,
}: PortfolioLandingPageProps) {
  return (
    <AppShell>
      <PortfolioSection profile={profile} socialLinks={socialLinks}>
        {children}
      </PortfolioSection>
    </AppShell>
  )
}
