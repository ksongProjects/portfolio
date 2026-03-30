import type { Profile, Project, ProjectSeed, SocialLink } from './types'

export const profile: Profile = {
  name: 'Kyung Min Song',
  role: 'software developer',
  intro:
    'Software developer building thoughtful interfaces, data-fluent tools, and polished systems with a quiet, deliberate visual point of view.',
}

export const socialLinks: SocialLink[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/ksongProjects',
    handle: 'github.com/ksongProjects',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/kmsong/',
    handle: 'linkedin.com/in/kmsong',
  },
]

export const projectSeeds: ProjectSeed[] = [
  {
    slug: 'outfitsme',
    title: 'outfitsme.com',
    strapline: 'Fashion discovery and branded storefront direction',
    description:
      'A retail-forward concept focused on styling inspiration, editorial curation, and a calm browsing rhythm.',
    repoHref: 'https://github.com/ksongProjects/outfitsme',
    liveHref: 'https://outfitsme.com',
    liveLabel: 'live site',
    palette: ['#f7e0d0', '#efb06d'],
    accent: '#be5929',
  },
  {
    slug: 'blackjack',
    title: 'Blackjack Simulator',
    strapline: 'Probability sandbox and game-systems study',
    description:
      'A simulation-driven project for testing blackjack strategy and surfacing outcomes with clarity.',
    repoHref: 'https://github.com/ksongProjects/cards',
    palette: ['#0d2017', '#206a43'],
    accent: '#edd697',
  },
  {
    slug: 'factory',
    title: 'Financial Data Factory',
    strapline: 'Pipeline design for financial data operations',
    description:
      'A workflow-focused build for turning raw market inputs into analysis-ready systems.',
    repoHref: 'https://github.com/ksongProjects/findf',
    palette: ['#dbe9ff', '#8eb5fc'],
    accent: '#2559d8',
  },
  {
    slug: 'quant',
    title: 'Quant Analyst Trainer',
    strapline: 'Practice environment for quantitative thinking',
    description:
      'A training workspace for sharpening analytical instincts through drills, scenarios, and feedback loops.',
    repoHref: 'https://github.com/ksongProjects/modeltrainer',
    palette: ['#ece4ff', '#b9a0fc'],
    accent: '#6147cb',
  },
]

export const projects: Project[] = projectSeeds.map((project, index) => ({
  ...project,
  index: String(index + 1).padStart(2, '0'),
}))
