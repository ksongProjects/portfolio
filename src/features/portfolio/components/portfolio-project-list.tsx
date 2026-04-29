'use client'

import { GitBranch, Globe } from 'lucide-react'
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from 'react'
import type { Project } from '@/lib/types'

const DEFAULT_PROJECTS_PER_PAGE = 4
const MIN_PROJECTS_PER_PAGE = 1
const VIEWPORT_BOTTOM_MARGIN_RATIO = 0.15

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

function toPixels(value: string) {
  const parsedValue = Number.parseFloat(value)

  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function getListRowGap(element: HTMLElement) {
  const styles = window.getComputedStyle(element)
  const rowGap = styles.rowGap === 'normal' ? styles.gap : styles.rowGap

  return toPixels(rowGap)
}

function getMeasuredHeight(element: HTMLElement | null) {
  return element?.getBoundingClientRect().height ?? 0
}

function calculateProjectsPerPage({
  headerElement,
  listElement,
  pagerElement,
  projectCount,
  rowElements,
}: {
  headerElement: HTMLElement | null
  listElement: HTMLElement | null
  pagerElement: HTMLElement | null
  projectCount: number
  rowElements: HTMLElement[]
}) {
  if (!listElement || projectCount <= 0) {
    return DEFAULT_PROJECTS_PER_PAGE
  }

  const rowHeights = rowElements
    .map((rowElement) => rowElement.getBoundingClientRect().height)
    .filter((height) => height > 0)

  if (!rowHeights.length) {
    return Math.min(DEFAULT_PROJECTS_PER_PAGE, projectCount)
  }

  const rowHeight = Math.max(...rowHeights)
  const rowGap = getListRowGap(listElement)
  const headerHeight = getMeasuredHeight(headerElement)
  const pagerHeight = getMeasuredHeight(pagerElement)
  const viewportBottomLimit = window.innerHeight * (1 - VIEWPORT_BOTTOM_MARGIN_RATIO)
  const availableHeight = viewportBottomLimit - listElement.getBoundingClientRect().top
  const rowStep = rowHeight + rowGap

  if (availableHeight <= headerHeight || rowStep <= 0) {
    return MIN_PROJECTS_PER_PAGE
  }

  const rowsWithoutPager = Math.floor((availableHeight - headerHeight) / rowStep)

  if (projectCount <= rowsWithoutPager) {
    return Math.max(MIN_PROJECTS_PER_PAGE, projectCount)
  }

  const rowsWithPager = Math.floor(
    (availableHeight - headerHeight - pagerHeight - rowGap) / rowStep,
  )

  return Math.max(MIN_PROJECTS_PER_PAGE, Math.min(projectCount, rowsWithPager))
}

export function PortfolioProjectList({ projects }: PortfolioProjectListProps) {
  const [page, setPage] = useState(1)
  const [projectsPerPage, setProjectsPerPage] = useState(DEFAULT_PROJECTS_PER_PAGE)
  const listRef = useRef<HTMLDivElement>(null)
  const measureHeaderRef = useRef<HTMLDivElement>(null)
  const measurePagerRef = useRef<HTMLDivElement>(null)
  const measureRowRefs = useRef(new Map<string, HTMLElement>())

  const setMeasureRowRef = useCallback((projectSlug: string, element: HTMLElement | null) => {
    if (element) {
      measureRowRefs.current.set(projectSlug, element)
      return
    }

    measureRowRefs.current.delete(projectSlug)
  }, [])

  const measureProjectsPerPage = useCallback(() => {
    const nextProjectsPerPage = calculateProjectsPerPage({
      headerElement: measureHeaderRef.current,
      listElement: listRef.current,
      pagerElement: measurePagerRef.current,
      projectCount: projects.length,
      rowElements: Array.from(measureRowRefs.current.values()),
    })

    setProjectsPerPage((currentProjectsPerPage) =>
      currentProjectsPerPage === nextProjectsPerPage
        ? currentProjectsPerPage
        : nextProjectsPerPage,
    )
  }, [projects.length])

  useLayoutEffect(() => {
    if (!projects.length) {
      return
    }

    let animationFrameId = 0
    const scheduleMeasurement = () => {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(measureProjectsPerPage)
    }
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMeasurement)
    const observedElements = [
      listRef.current,
      measureHeaderRef.current,
      measurePagerRef.current,
      ...measureRowRefs.current.values(),
    ].filter((element): element is HTMLElement => element !== null)

    scheduleMeasurement()
    observedElements.forEach((element) => {
      resizeObserver?.observe(element)
    })
    window.addEventListener('resize', scheduleMeasurement)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', scheduleMeasurement)
    }
  }, [measureProjectsPerPage, projects])

  const pageCount = Math.max(1, Math.ceil(projects.length / projectsPerPage))
  const currentPage = Math.min(page, pageCount)
  const visibleProjects = projects.slice(
    (currentPage - 1) * projectsPerPage,
    currentPage * projectsPerPage,
  )

  return (
    <div className="monograph-list" ref={listRef}>
      {projects.length > 0 ? (
        <>
          <div className="project-group__header">
            <p className="project-group__eyebrow">Projects</p>
          </div>
          {visibleProjects.map((project) => (
            <ProjectRow key={project.slug} project={project} />
          ))}
          {pageCount > 1 ? (
            <PortfolioPager
              currentPage={currentPage}
              pageCount={pageCount}
              onNext={() => {
                setPage(Math.min(pageCount, currentPage + 1))
              }}
              onPrevious={() => {
                setPage(Math.max(1, currentPage - 1))
              }}
            />
          ) : null}
          <div className="monograph-list__measure" aria-hidden="true">
            <div className="project-group__header" ref={measureHeaderRef}>
              <p className="project-group__eyebrow">Projects</p>
            </div>
            {projects.map((project) => (
              <ProjectRow
                key={project.slug}
                project={project}
                rowRef={(element) => {
                  setMeasureRowRef(project.slug, element)
                }}
                isMeasurement
              />
            ))}
            {projects.length > 1 ? (
              <PortfolioPager
                currentPage={1}
                pageCount={2}
                isMeasurement
                pagerRef={measurePagerRef}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}

function PortfolioPager({
  currentPage,
  isMeasurement = false,
  onNext,
  onPrevious,
  pageCount,
  pagerRef,
}: {
  currentPage: number
  isMeasurement?: boolean
  onNext?: () => void
  onPrevious?: () => void
  pageCount: number
  pagerRef?: Ref<HTMLDivElement>
}) {
  return (
    <div className="portfolio-pager" aria-label="Project pagination" ref={pagerRef}>
      <button
        type="button"
        className="portfolio-pager__button"
        onClick={onPrevious}
        disabled={currentPage === 1}
        tabIndex={isMeasurement ? -1 : undefined}
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
        onClick={onNext}
        disabled={currentPage === pageCount}
        tabIndex={isMeasurement ? -1 : undefined}
      >
        Next
      </button>
    </div>
  )
}

function ProjectRow({
  isMeasurement = false,
  project,
  rowRef,
}: {
  isMeasurement?: boolean
  project: Project
  rowRef?: Ref<HTMLElement>
}) {
  const repoActivityDate = project.repoActivity
    ? formatRepoActivityDate(project.repoActivity.iso)
    : null

  return (
    <article className="mono-row" ref={rowRef}>
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
              tabIndex={isMeasurement ? -1 : undefined}
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
              tabIndex={isMeasurement ? -1 : undefined}
            >
              <Globe aria-hidden="true" size={15} strokeWidth={1.8} />
            </a>
          ) : null}
        </p>
      ) : null}
    </article>
  )
}
