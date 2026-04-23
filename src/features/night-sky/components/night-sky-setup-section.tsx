import { forwardRef } from 'react'
import { PageMobileNav } from '@/components/site-nav'

export const NightSkySetupSection = forwardRef<HTMLElement>(function NightSkySetupSection(_, ref) {
  return (
    <section className="stars-demo" id="stars" ref={ref}>
      <div className="stars-demo__inner">
        <PageMobileNav />
        <div className="stars-layout">
          <div className="sky-setup">
            <p className="sky-setup__eyebrow">Database setup required</p>
            <h3>Connect Supabase to load the live sky catalog.</h3>
            <p>
              The app is now wired for Supabase Postgres. Add your connection string, push the
              migration, then run the sync job to fetch constellation lines, star coordinates, and
              image metadata into the database.
            </p>
            <ol className="sky-setup__steps">
              <li>Add your Supabase transaction pooler URL to <code>DATABASE_URL</code>.</li>
              <li>Run <code>npm run db:push</code> to create the tables in Supabase.</li>
              <li>Run <code>npm run sky:sync</code> to populate the catalog.</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
})
