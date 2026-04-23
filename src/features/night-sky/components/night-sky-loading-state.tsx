import { AppShell } from '@/components/app-shell'
import { PageMobileNav } from '@/components/site-nav'
import { Spinner } from '@/components/ui/spinner'

export function NightSkyLoadingState() {
  return (
    <AppShell>
      <section className="stars-demo" id="stars">
        <div className="stars-demo__inner">
          <PageMobileNav />

          <div className="stars-layout" data-details-open="true">
            <div className="sky-stage">
              <div className="sky-stage__header">
                <div className="sky-stage__tools">
                  <div className="sky-loading-line sky-loading-line--status" aria-hidden="true" />
                </div>
              </div>

              <div className="sky-canvas-shell sky-loading-region">
                <div className="sky-canvas sky-canvas--loading" aria-hidden="true" />
                <div className="sky-loading-overlay" role="status" aria-live="polite">
                  <Spinner size="lg" />
                  <p className="sky-loading-copy">Loading sky view</p>
                </div>
              </div>
            </div>

            <aside
              className="zodiac-rail"
              aria-label="Constellation selection"
              data-details-open="true"
            >
              <div className="zodiac-rail__drawer sky-loading-region">
                <p className="zodiac-rail__label">Details</p>
                <div className="sky-loading-card" aria-hidden="true">
                  <div className="sky-loading-block sky-loading-block--media" />
                  <div className="sky-loading-line sky-loading-line--eyebrow" />
                  <div className="sky-loading-line sky-loading-line--title" />
                  <div className="sky-loading-line sky-loading-line--copy" />
                  <div className="sky-loading-line sky-loading-line--copy" />
                  <div className="sky-loading-facts">
                    <div className="sky-loading-block sky-loading-block--fact" />
                    <div className="sky-loading-block sky-loading-block--fact" />
                    <div className="sky-loading-block sky-loading-block--fact" />
                    <div className="sky-loading-block sky-loading-block--fact" />
                  </div>
                </div>

                <div className="sky-loading-overlay sky-loading-overlay--panel" role="status">
                  <Spinner size="md" />
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
                          <div className="sky-loading-line sky-loading-line--item-title" />
                          <div className="sky-loading-line sky-loading-line--item-meta" />
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="zodiac-rail__group">
                    <p className="zodiac-rail__label zodiac-rail__label--section">Popular stars</p>
                    <div className="sky-loading-list">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div className="sky-loading-list-item" key={`star-${index}`}>
                          <div className="sky-loading-line sky-loading-line--item-title" />
                          <div className="sky-loading-line sky-loading-line--item-meta" />
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="sky-loading-overlay sky-loading-overlay--panel" role="status">
                  <Spinner size="md" />
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
