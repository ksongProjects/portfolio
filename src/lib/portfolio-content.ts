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
    title: 'OutfitsMe',
    strapline: 'AI outfit analysis and shopping discovery',
    description:
      'Upload outfit photos, identify pieces, build custom outfits from analyzed items, and find similar products.',
    repoHref: 'https://github.com/ksongProjects/outfitsme',
    liveHref: 'https://outfitsme.com',
    liveLabel: 'website',
    techStack: ['Next.js', 'Flask', 'Supabase', 'Gemini'],
    palette: ['#f7e0d0', '#efb06d'],
    accent: '#be5929',
  },
  {
    slug: 'collapse-game',
    title: 'Collapse Game',
    strapline: 'Timed puzzle game with leaderboards',
    description: 'Clear connected color groups, beat the timer, and submit winning runs.',
    repoHref: 'https://github.com/ksongProjects/collapse',
    liveHref: 'https://collapsegame.dev',
    liveLabel: 'website',
    techStack: ['Next.js 16', 'MongoDB Atlas', 'TypeScript', 'Vercel'],
    palette: ['#f8d977', '#f07167'],
    accent: '#f05d5e',
  },
  {
    slug: 'blackjack',
    title: 'Blackjack Simulator',
    strapline: 'Blackjack strategy sandbox',
    description: 'Simulates hands, compares decisions, and makes the odds easier to read.',
    repoHref: 'https://github.com/ksongProjects/cards',
    techStack: ['Godot 4', 'GDScript'],
    palette: ['#0d2017', '#206a43'],
    accent: '#edd697',
  },
  {
    slug: 'factory',
    title: 'Financial Data Factory',
    strapline: 'Financial data pipeline tooling',
    description: 'Turns raw market inputs into cleaner, analysis-ready datasets.',
    repoHref: 'https://github.com/ksongProjects/findf',
    techStack: ['Next.js', 'FastAPI', 'Polars', 'DuckDB'],
    palette: ['#dbe9ff', '#8eb5fc'],
    accent: '#2559d8',
  },
  {
    slug: 'quant',
    title: 'Quant Analyst Trainer',
    strapline: 'Local-first quant research platform',
    description:
      'Builds point-in-time datasets, runs separate training and testing flows, and monitors experiments from a React control panel.',
    repoHref: 'https://github.com/ksongProjects/modeltrainer',
    techStack: ['Python', 'React', 'Vite', 'SQLite'],
    palette: ['#ece4ff', '#b9a0fc'],
    accent: '#6147cb',
  },
]

const orderedProjectSeeds = [
  ...projectSeeds.filter((project) => project.liveHref),
  ...projectSeeds.filter((project) => !project.liveHref),
]

export const projects: Project[] = orderedProjectSeeds.map((project, index) => ({
  ...project,
  index: String(index + 1).padStart(2, '0'),
}))
