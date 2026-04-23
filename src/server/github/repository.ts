import { unstable_cache } from 'next/cache'
import type { Project, RepoActivity } from '@/lib/types'

const GITHUB_ORGANIZATION = 'ksongProjects'
const GITHUB_API_VERSION = '2022-11-28'
const REPO_ACTIVITY_REVALIDATE_SECONDS = 60 * 60
const GITHUB_PROJECT_CACHE_TTL_MS = 30_000
const GITHUB_PER_PAGE = 100
const MAX_TECH_STACK_ITEMS = 4

type GitHubProjectCacheEntry = {
  projects: Project[]
  checkedAt: number
}

const globalForGitHubProjects = globalThis as typeof globalThis & {
  portfolioGitHubProjectsCache?: GitHubProjectCacheEntry
}

type GitHubRepoResponse = {
  name: string
  full_name: string
  html_url: string
  description?: string | null
  homepage?: string | null
  language?: string | null
  languages_url: string
  topics?: string[]
  pushed_at?: string | null
  updated_at?: string | null
}

type GitHubLanguagesResponse = Record<string, number>

function buildGitHubHeaders() {
  const token = process.env.GITHUB_TOKEN?.trim()
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'portfolio-next',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

async function fetchGitHubJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: buildGitHubHeaders(),
      next: {
        revalidate: REPO_ACTIVITY_REVALIDATE_SECONDS,
      },
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  } catch {
    return null
  }
}

function sanitizeUrl(url?: string | null) {
  const value = url?.trim()

  if (!value) {
    return undefined
  }

  try {
    const parsed = new URL(value)

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return undefined
    }

    return parsed.toString()
  } catch {
    return undefined
  }
}

function toProjectTitle(repoName: string) {
  if (!/[-_]/.test(repoName)) {
    return repoName
  }

  return repoName
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function toProjectStrapline(repo: GitHubRepoResponse) {
  const source = repo.description?.trim() || repo.full_name

  if (source.length <= 76) {
    return source
  }

  const compact = source.slice(0, 73).trimEnd()
  const lastSpaceIndex = compact.lastIndexOf(' ')

  if (lastSpaceIndex < 24) {
    return `${compact}...`
  }

  return `${compact.slice(0, lastSpaceIndex)}...`
}

function getRepoActivity(repo: GitHubRepoResponse): RepoActivity | null {
  if (repo.pushed_at) {
    return {
      label: 'Last active',
      iso: repo.pushed_at,
    }
  }

  if (repo.updated_at) {
    return {
      label: 'Last updated',
      iso: repo.updated_at,
    }
  }

  return null
}

function getRepoActivityTime(repo: GitHubRepoResponse) {
  const iso = repo.pushed_at || repo.updated_at

  if (!iso) {
    return 0
  }

  const timestamp = Date.parse(iso)

  return Number.isFinite(timestamp) ? timestamp : 0
}

async function fetchOrganizationRepos() {
  const repos: GitHubRepoResponse[] = []

  for (let page = 1; page < 100; page += 1) {
    const pageRepos = await fetchGitHubJson<GitHubRepoResponse[]>(
      `https://api.github.com/orgs/${encodeURIComponent(GITHUB_ORGANIZATION)}/repos?type=public&sort=pushed&direction=desc&per_page=${GITHUB_PER_PAGE}&page=${page}`,
    )

    if (!pageRepos?.length) {
      break
    }

    repos.push(...pageRepos)

    if (pageRepos.length < GITHUB_PER_PAGE) {
      break
    }
  }

  return repos
}

function buildTechStack(
  repo: GitHubRepoResponse,
  languages: GitHubLanguagesResponse | null,
) {
  const items: string[] = []
  const seen = new Set<string>()

  const pushItem = (item?: string | null) => {
    const value = item?.trim()
    const normalized = value?.toLowerCase()

    if (!value || !normalized || seen.has(normalized)) {
      return
    }

    seen.add(normalized)
    items.push(value)
  }

  if (languages) {
    Object.entries(languages)
      .sort((left, right) => right[1] - left[1])
      .forEach(([language]) => {
        pushItem(language)
      })
  }

  repo.topics?.forEach((topic) => {
    pushItem(topic)
  })

  if (items.length === 0) {
    pushItem(repo.language)
  }

  return items.slice(0, MAX_TECH_STACK_ITEMS)
}

async function loadOrganizationProjects(): Promise<Project[]> {
  const repos = await fetchOrganizationRepos()

  if (repos.length === 0) {
    return []
  }

  const sortedRepos = [...repos].sort(
    (left, right) => getRepoActivityTime(right) - getRepoActivityTime(left),
  )

  const projects = await Promise.all(
    sortedRepos.map(async (repo, index) => {
      const languages = await fetchGitHubJson<GitHubLanguagesResponse>(repo.languages_url)
      const techStack = buildTechStack(repo, languages)

      return {
        slug: repo.name,
        title: toProjectTitle(repo.name),
        strapline: toProjectStrapline(repo),
        repoHref: repo.html_url,
        liveHref: sanitizeUrl(repo.homepage),
        techStack: techStack.length > 0 ? techStack : undefined,
        index: String(index + 1).padStart(2, '0'),
        repoActivity: getRepoActivity(repo),
      } satisfies Project
    }),
  )

  return projects
}

const getCachedOrganizationProjects = unstable_cache(
  loadOrganizationProjects,
  ['github-organization-projects', GITHUB_ORGANIZATION],
  {
    revalidate: REPO_ACTIVITY_REVALIDATE_SECONDS,
  },
)

export async function getOrganizationProjects(): Promise<Project[]> {
  const freshCachedProjects = getFreshCachedOrganizationProjects()

  if (freshCachedProjects) {
    return freshCachedProjects
  }

  const projects = await getCachedOrganizationProjects()
  setCachedOrganizationProjects(projects)

  return projects
}

function getFreshCachedOrganizationProjects(): Project[] | null {
  const cachedEntry = globalForGitHubProjects.portfolioGitHubProjectsCache

  if (!cachedEntry) {
    return null
  }

  if (Date.now() - cachedEntry.checkedAt > GITHUB_PROJECT_CACHE_TTL_MS) {
    return null
  }

  return cachedEntry.projects
}

function setCachedOrganizationProjects(projects: Project[]): void {
  globalForGitHubProjects.portfolioGitHubProjectsCache = {
    projects,
    checkedAt: Date.now(),
  }
}
