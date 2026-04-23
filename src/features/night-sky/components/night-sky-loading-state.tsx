import { AppShell } from '@/components/app-shell'
import { PageMobileNav } from '@/components/site-nav'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'

export function NightSkyLoadingState() {
  return (
    <AppShell>
      <section className="stars-demo" id="stars">
        <div className="stars-demo__inner">
          <PageMobileNav />

          <div className="stars-layout" data-details-open="true">
            <Card className="sky-stage">
              <div className="sky-canvas-shell sky-loading-region">
                <Skeleton className="sky-canvas sky-canvas--loading rounded-none" aria-hidden="true" />
                <Skeleton className="sky-canvas-toggle sky-canvas-toggle--loading rounded-none" aria-hidden="true" />
                <Skeleton className="sky-canvas-status sky-canvas-status--loading rounded-none" aria-hidden="true" />
                <div className="sky-loading-overlay" role="status" aria-live="polite">
                  <Spinner className="size-8" />
                  <p className="sky-loading-copy">Loading sky view</p>
                </div>
              </div>
            </Card>

            <aside
              className="zodiac-rail"
              aria-label="Constellation selection"
              data-details-open="true"
            >
              <div className="zodiac-rail__drawer sky-loading-region">
                <p className="zodiac-rail__label">Details</p>
                <Card size="sm" className="sky-loading-card" aria-hidden="true">
                  <CardContent className="grid gap-3 px-0">
                    <Skeleton className="aspect-[12/7] w-full rounded-none border border-white/10" />
                  </CardContent>
                  <CardHeader className="gap-2 px-0 pt-0">
                    <Skeleton className="h-2.5 w-24 rounded-none" />
                    <Skeleton className="h-6 w-3/4 rounded-none" />
                    <Skeleton className="h-3 w-full rounded-none" />
                    <Skeleton className="h-3 w-5/6 rounded-none" />
                  </CardHeader>
                  <CardContent className="px-0 pt-0">
                    <div className="sky-loading-facts">
                      <Skeleton className="h-13 rounded-none" />
                      <Skeleton className="h-13 rounded-none" />
                      <Skeleton className="h-13 rounded-none" />
                      <Skeleton className="h-13 rounded-none" />
                    </div>
                  </CardContent>
                </Card>

                <div className="sky-loading-overlay sky-loading-overlay--panel" role="status">
                  <Spinner className="size-6" />
                  <p className="sky-loading-copy">Loading details</p>
                </div>
              </div>

              <div className="zodiac-rail__inner sky-loading-region">
                <div className="zodiac-rail__groups" aria-hidden="true">
                  <section className="zodiac-rail__group">
                    <p className="zodiac-rail__label">Zodiac signs</p>
                    <div className="sky-loading-list">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div className="sky-loading-list-item" key={`sign-${index}`}>
                          <Skeleton className="h-3.5 w-2/3 rounded-none" />
                          <Skeleton className="h-2.5 w-1/2 rounded-none" />
                          {index < 5 ? (
                            <Separator className="mt-3 bg-[var(--sky-line)]" />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>

                  <Separator className="bg-[var(--sky-line)]" />

                  <section className="zodiac-rail__group">
                    <p className="zodiac-rail__label zodiac-rail__label--section">Popular stars</p>
                    <div className="sky-loading-list">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div className="sky-loading-list-item" key={`star-${index}`}>
                          <Skeleton className="h-3.5 w-2/3 rounded-none" />
                          <Skeleton className="h-2.5 w-1/2 rounded-none" />
                          {index < 3 ? (
                            <Separator className="mt-3 bg-[var(--sky-line)]" />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="sky-loading-overlay sky-loading-overlay--panel" role="status">
                  <Spinner className="size-6" />
                  <p className="sky-loading-copy">Loading sky data</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
