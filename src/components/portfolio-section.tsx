import { forwardRef } from 'react'
import type { Profile, Project, SocialLink } from '@/lib/types'

type PortfolioSectionProps = {
  profile: Profile
  socialLinks: SocialLink[]
  projects: Project[]
}

export const PortfolioSection = forwardRef<HTMLElement, PortfolioSectionProps>(
  function PortfolioSection({ profile, socialLinks, projects }, ref) {
    return (
      <section className="portfolio" id="portfolio" ref={ref}>
        <div className="portfolio__inner">
          <header className="section-head section-head--portfolio">
            <p className="section-marker">01 / Portfolio</p>
          </header>

          <div className="monograph-layout">
            <div className="monograph-intro">
              <h3>{profile.name}</h3>
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

            <div className="monograph-list">
              {projects.map((project) => (
                <article className="mono-row" key={project.slug}>
                  <p className="mono-row__index">{project.index}</p>
                  <div className="mono-row__body">
                    <h3>{project.title}</h3>
                    <p className="mono-row__strap">{project.strapline}</p>
                    <p className="mono-row__copy">{project.description}</p>
                  </div>
                  <p className="mono-row__links">
                    <a href={project.repoHref} target="_blank" rel="noreferrer">
                      repository
                    </a>
                    {project.liveHref ? (
                      <a href={project.liveHref} target="_blank" rel="noreferrer">
                        {project.liveLabel ?? 'live site'}
                      </a>
                    ) : null}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  },
)
