import type { ReactNode } from 'react'
import { SiteNav } from '@/components/site-nav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <SiteNav />
      <main className="page-stack">{children}</main>
    </div>
  )
}
