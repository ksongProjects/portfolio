import { unstable_cache } from 'next/cache'
import { buildProjects, projectSeeds } from '@/lib/portfolio-content'
import type { Project, RepoActivity } from '@/lib/types'

const REPO_ACTIVITY_REVALIDATE_SECONDS = 60 * 60

type GitHubRepoResponse = {
  pushed_at?: string | null
  updated_at?: string | null
}

function parseGitHubRepo(repoHref?: string) {
  if (!repoHref) {
    return null
  }

  try {
    const url = new URL(repoHref)

    if (!['github.com', 'www.github.com'].includes(url.hostname)) {
      return null
    }

    const [owner, repo] = url.pathname.replace(/^\/|\/$/g, '').split('/')

    if (!owner || !repo) {
      return null
    }

    return {
      owner,
      repo: repo.replace(/\.git$/i, ''),
    }
  } catch {
    return null
  }
}

async function fetchRepoActivity(repoHref?: string): Promise<RepoActivity | null> {
  const repo = parseGitHubRepo(repoHref)

  if (!repo) {
    return null
  }

  const token = process.env.GITHUB_TOKEN?.trim()
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'portfolio-next',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`,
      {
        headers,
        next: {
          revalidate: REPO_ACTIVITY_REVALIDATE_SECONDS,
        },
      },
    )

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GitHubRepoResponse

    if (payload.pushed_at) {
      return {
        label: 'Last active',
        iso: payload.pushed_at,
      }
    }

    if (payload.updated_at) {
      return {
        label: 'Last updated',
        iso: payload.updated_at,
      }
    }

    return null
  } catch {
    return null
  }
}

async function loadProjectsWithRepoActivity(): Promise<Project[]> {
  const repoActivityEntries = await Promise.all(
    projectSeeds.map(async (project) => [project.slug, await fetchRepoActivity(project.repoHref)] as const),
  )

  return buildProjects(Object.fromEntries(repoActivityEntries))
}

export const getProjectsWithRepoActivity = unstable_cache(
  loadProjectsWithRepoActivity,
  ['projects-with-repo-activity'],
  {
    revalidate: REPO_ACTIVITY_REVALIDATE_SECONDS,
  },
)
