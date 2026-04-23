'use client'

import { forwardRef, type ReactNode } from 'react'
import type { Profile, SocialLink } from '@/lib/types'
import { PageMobileNav } from '@/components/site-nav'

type PortfolioSectionProps = {
  profile: Profile
  socialLinks: SocialLink[]
  children: ReactNode
}

export const PortfolioSection = forwardRef<HTMLElement, PortfolioSectionProps>(
  function PortfolioSection({ profile, socialLinks, children }, ref) {
    return (
      <section className="portfolio" id="portfolio" ref={ref}>
        <div className="portfolio__inner">
          <PageMobileNav />
          <div className="monograph-layout">
            <div className="monograph-intro">
              <h2>{profile.name}</h2>
              <p className="monograph-role">{profile.role}</p>
              <p>{profile.intro}</p>
              <div className="monograph-socials">
                {socialLinks.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                    <strong>{link.label}</strong>
                    <span>{link.handle}</span>
                  </a>
                ))}
              </div>
            </div>

            {children}
          </div>
        </div>
      </section>
    )
  },
)
