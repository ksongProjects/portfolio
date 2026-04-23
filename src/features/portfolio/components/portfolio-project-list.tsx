'use client'

import { GitBranch, Globe } from 'lucide-react'
import { useState } from 'react'
import type { Project } from '@/lib/types'

const PROJECTS_PER_PAGE = 4

type PortfolioProjectListProps = {
  projects: Project[]
}

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

export function PortfolioProjectList({ projects }: PortfolioProjectListProps) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(projects.length / PROJECTS_PER_PAGE))
  const currentPage = Math.min(page, pageCount)
  const visibleProjects = projects.slice(
    (currentPage - 1) * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE,
  )

  return (
    <div className="monograph-list">
      {projects.length > 0 ? (
        <>
          <div className="project-group__header">
            <p className="project-group__eyebrow">Projects</p>
          </div>
          {visibleProjects.map((project) => (
            <ProjectRow key={project.slug} project={project} />
          ))}
          {pageCount > 1 ? (
            <div className="portfolio-pager" aria-label="Project pagination">
              <button
                type="button"
                className="portfolio-pager__button"
                onClick={() => {
                  setPage((currentValue) => Math.max(1, currentValue - 1))
                }}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <p className="portfolio-pager__status">
                <span>Page</span>
                <strong>
                  {String(currentPage).padStart(2, '0')} / {String(pageCount).padStart(2, '0')}
                </strong>
              </p>
              <button
                type="button"
                className="portfolio-pager__button"
                onClick={() => {
                  setPage((currentValue) => Math.min(pageCount, currentValue + 1))
                }}
                disabled={currentPage === pageCount}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
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
