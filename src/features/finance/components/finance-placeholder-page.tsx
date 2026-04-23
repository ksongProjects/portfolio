import type { FeatureServiceStatus } from '@/server/services/registry'
import { FeaturePlaceholderPage } from '@/features/shared/components/feature-placeholder-page'

export function FinancePlaceholderPage({ service }: { service: FeatureServiceStatus }) {
  return (
    <FeaturePlaceholderPage
      eyebrow="Finance demo"
      title="Live portfolio viewer coming next."
      description="This route is reserved for a portfolio dashboard with live positions, pricing, performance, and broker or market-data integrations."
      plannedCapabilities={[
        'Portfolio holdings, watchlists, and benchmark comparison views.',
        'Live quote streaming or scheduled snapshots behind a server-side gateway.',
        'Provider adapters isolated from UI so data vendors can change without route rewrites.',
      ]}
      architectureNotes={[
        'Keep browser talking to Next.js route handlers first, not directly to vendor APIs.',
        'Put quote normalization, rate limiting, and secret management behind finance service seam.',
        'Start inside this repo, then point service layer at dedicated finance microservice when scale or vendor complexity grows.',
      ]}
      service={service}
    />
  )
}
