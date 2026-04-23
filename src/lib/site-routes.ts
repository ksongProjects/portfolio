export const siteRoutes = [
  {
    key: 'portfolio',
    href: '/',
    index: '01',
    label: 'Portfolio',
  },
  {
    key: 'night-sky',
    href: '/night-sky',
    index: '02',
    label: 'Night Sky',
  },
  {
    key: 'finance',
    href: '/finance',
    index: '03',
    label: 'Finance',
  },
  {
    key: 'budget',
    href: '/budget',
    index: '04',
    label: 'Budget',
  },
] as const

export type SiteRouteKey = (typeof siteRoutes)[number]['key']

export function isActiveSiteRoute(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getActiveSiteRoute(pathname?: string | null) {
  const normalizedPathname = pathname || '/'

  return (
    siteRoutes.find((route) => isActiveSiteRoute(normalizedPathname, route.href)) ??
    siteRoutes[0]
  )
}
