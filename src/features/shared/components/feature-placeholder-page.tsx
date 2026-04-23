import { AppShell } from '@/components/app-shell'
import { PageMobileNav } from '@/components/site-nav'
import type { FeatureServiceStatus } from '@/server/services/registry'

type FeaturePlaceholderPageProps = {
  eyebrow: string
  title: string
  description: string
  plannedCapabilities: string[]
  architectureNotes: string[]
  service: FeatureServiceStatus
}

export function FeaturePlaceholderPage({
  eyebrow,
  title,
  description,
  plannedCapabilities,
  architectureNotes,
  service,
}: FeaturePlaceholderPageProps) {
  return (
    <AppShell>
      <section className="feature-placeholder">
        <div className="feature-placeholder__inner">
          <PageMobileNav />

          <div className="feature-placeholder__panel">
            <div className="feature-placeholder__intro">
              <p className="feature-placeholder__eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>

            <div className="feature-placeholder__grid">
              <article className="feature-placeholder__card">
                <p className="feature-placeholder__label">Planned capabilities</p>
                <ul className="feature-placeholder__list">
                  {plannedCapabilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="feature-placeholder__card">
                <p className="feature-placeholder__label">Service boundary</p>
                <div className="feature-placeholder__service">
                  <p className="feature-placeholder__service-title">{service.label}</p>
                  <p className="feature-placeholder__service-copy">{service.description}</p>
                  <dl className="feature-placeholder__facts">
                    <div>
                      <dt>Status</dt>
                      <dd>
                        {service.isConfigured ? 'External service configured' : 'Local stub only'}
                      </dd>
                    </div>
                    <div>
                      <dt>Gateway route</dt>
                      <dd>
                        <code>{service.gatewayRoute}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Service URL env</dt>
                      <dd>
                        <code>{service.envVar}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Base URL</dt>
                      <dd>{service.baseUrl ?? 'Not configured yet'}</dd>
                    </div>
                  </dl>
                </div>
              </article>

              <article className="feature-placeholder__card feature-placeholder__card--wide">
                <p className="feature-placeholder__label">Architecture direction</p>
                <ul className="feature-placeholder__list">
                  {architectureNotes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
