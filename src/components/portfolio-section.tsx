import { GitBranch, Globe } from 'lucide-react'
import { forwardRef } from 'react'
import type { Profile, Project, SocialLink } from '@/lib/types'
import { SectionMobileNav } from './site-nav'

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
          <SectionMobileNav currentSection="portfolio" />
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
              {projects.length > 0 ? (
                <>
                  <div className="project-group__header">
                    <p className="project-group__eyebrow">Projects</p>
                  </div>
                  {projects.map((project) => (
                    <ProjectRow key={project.slug} project={project} />
                  ))}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    )
  },
)

const repoActivityDateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatRepoActivityDate(iso: string) {
  const value = new Date(iso)

  if (Number.isNaN(value.getTime())) {
    return null
  }

  return repoActivityDateFormatter.format(value)
}

function ProjectRow({ project }: { project: Project }) {
  const repoActivityDate = project.repoActivity
    ? formatRepoActivityDate(project.repoActivity.iso)
    : null

  return (
    <article className="mono-row">
      <p className="mono-row__index">{project.index}</p>
      <div className="mono-row__body">
        <h3>{project.title}</h3>
        <p className="mono-row__strap">{project.strapline}</p>
        {project.repoActivity && repoActivityDate ? (
          <p className="mono-row__repo-activity">
            <span>{project.repoActivity.label}</span>
            <strong>{repoActivityDate}</strong>
          </p>
        ) : null}
        {project.techStack?.length ? (
          <ul className="mono-row__stack" aria-label={`${project.title} tech stack`}>
            {project.techStack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
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
