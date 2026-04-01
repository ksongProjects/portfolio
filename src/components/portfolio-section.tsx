import { GitBranch, Globe } from 'lucide-react'
import { forwardRef } from 'react'
import type { Profile, Project, SocialLink } from '@/lib/types'

type PortfolioSectionProps = {
  profile: Profile
  socialLinks: SocialLink[]
  projects: Project[]
}

export const PortfolioSection = forwardRef<HTMLElement, PortfolioSectionProps>(
  function PortfolioSection({ profile, socialLinks, projects }, ref) {
    const liveProjects = projects.filter((project) => project.liveHref)
    const otherProjects = projects.filter((project) => !project.liveHref)

    return (
      <section className="portfolio" id="portfolio" ref={ref}>
        <div className="portfolio__inner">
          <header className="section-head section-head--portfolio">
            <p className="section-marker">01 / Portfolio</p>
          </header>

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

            <div className="monograph-list">
              {liveProjects.length > 0 ? (
                <div className="project-group">
                  <div className="project-group__header">
                    <p className="project-group__eyebrow">Live sites</p>
                    <p className="project-group__copy">
                      Deployed apps with a public repo and a working website.
                    </p>
                  </div>
                  {liveProjects.map((project) => (
                    <ProjectRow key={project.slug} project={project} />
                  ))}
                </div>
              ) : null}

              {otherProjects.length > 0 ? (
                <div className="project-group">
                  <div className="project-group__header">
                    <p className="project-group__eyebrow">More builds</p>
                    <p className="project-group__copy">
                      Tools, prototypes, and practice environments still in progress.
                    </p>
                  </div>
                  {otherProjects.map((project) => (
                    <ProjectRow key={project.slug} project={project} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    )
  },
)

function ProjectRow({ project }: { project: Project }) {
  return (
    <article className="mono-row">
      <p className="mono-row__index">{project.index}</p>
      <div className="mono-row__body">
        <h3>{project.title}</h3>
        <p className="mono-row__strap">{project.strapline}</p>
        {project.techStack?.length ? (
          <ul className="mono-row__stack" aria-label={`${project.title} tech stack`}>
            {project.techStack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <p className="mono-row__copy">{project.description}</p>
      </div>
      {project.repoHref || project.liveHref ? (
        <p className="mono-row__links">
          {project.repoHref ? (
            <a
              href={project.repoHref}
              target="_blank"
              rel="noreferrer"
              className="mono-row__icon-link"
              aria-label={`${project.title} GitHub repository`}
              title={`${project.title} GitHub repository`}
            >
              <GitBranch aria-hidden="true" size={15} strokeWidth={1.8} />
            </a>
          ) : null}
          {project.liveHref ? (
            <a
              href={project.liveHref}
              target="_blank"
              rel="noreferrer"
              className="mono-row__icon-link"
              aria-label={`${project.title} website`}
              title={`${project.title} website`}
            >
              <Globe aria-hidden="true" size={15} strokeWidth={1.8} />
            </a>
          ) : null}
        </p>
      ) : null}
    </article>
  )
}
