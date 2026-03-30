'use client'

import { useEffect, useRef, useState } from 'react'
import type { Profile, Project, SkyDataset, SocialLink } from '@/lib/types'
import { NightSkySection } from './night-sky-section'
import { NightSkySetupSection } from './night-sky-setup-section'
import { PortfolioSection } from './portfolio-section'
import { SiteNav } from './site-nav'

type PortfolioAppProps = {
  profile: Profile
  socialLinks: SocialLink[]
  projects: Project[]
  skyDataset: SkyDataset | null
  initialNowIso: string
}

export function PortfolioApp({
  profile,
  socialLinks,
  projects,
  skyDataset,
  initialNowIso,
}: PortfolioAppProps) {
  const portfolioRef = useRef<HTMLElement | null>(null)
  const starsRef = useRef<HTMLElement | null>(null)
  const [activeSection, setActiveSection] = useState<'portfolio' | 'stars'>('portfolio')

  useEffect(() => {
    const sections = [portfolioRef.current, starsRef.current].filter(
      (section): section is HTMLElement => section instanceof HTMLElement,
    )

    if (sections.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)

        const topEntry = visibleEntries[0]

        if (topEntry?.target instanceof HTMLElement) {
          setActiveSection(topEntry.target.id === 'stars' ? 'stars' : 'portfolio')
        }
      },
      {
        threshold: [0.28, 0.48, 0.68],
        rootMargin: '-12% 0px -32% 0px',
      },
    )

    sections.forEach((section) => observer.observe(section))

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div className="site-shell" data-active-section={activeSection}>
      <SiteNav activeSection={activeSection} />

      <main className="page-stack">
        <PortfolioSection
          ref={portfolioRef}
          profile={profile}
          socialLinks={socialLinks}
          projects={projects}
        />
        {skyDataset ? (
          <NightSkySection
            ref={starsRef}
            dataset={skyDataset}
            initialNowIso={initialNowIso}
            isActive={activeSection === 'stars'}
          />
        ) : (
          <NightSkySetupSection ref={starsRef} />
        )}
      </main>
    </div>
  )
}
