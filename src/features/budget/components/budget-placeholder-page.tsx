import type { FeatureServiceStatus } from '@/server/services/registry'
import { FeaturePlaceholderPage } from '@/features/shared/components/feature-placeholder-page'

export function BudgetPlaceholderPage({ service }: { service: FeatureServiceStatus }) {
  return (
    <FeaturePlaceholderPage
      eyebrow="Budget demo"
      title="Budget manager route ready for build-out."
      description="This route is reserved for monthly planning, transaction tracking, category rules, and future forecasting workflows."
      plannedCapabilities={[
        'Private user budgets, envelope views, and recurring-plan editing.',
        'Transaction ingestion plus categorization rules managed on server.',
        'Forecasting models and reporting endpoints that can evolve independently from UI.',
      ]}
      architectureNotes={[
        'Treat budget workflows as authenticated domain APIs with clear read/write contracts.',
        'Keep reconciliation jobs and bank sync logic out of client components.',
        'Use same gateway pattern as finance so both apps can stay in one frontend while services split later if needed.',
      ]}
      service={service}
    />
  )
}
