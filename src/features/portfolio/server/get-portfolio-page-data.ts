import { profile, socialLinks } from '@/lib/portfolio-content'
import { getOrganizationProjects } from '@/server/github/repository'

export async function getPortfolioPageData() {
  const projects = await getOrganizationProjects()

  return {
    profile,
    socialLinks,
    projects,
  }
}
