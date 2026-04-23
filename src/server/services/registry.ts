export type FeatureServiceKey = 'finance' | 'budget'

type FeatureServiceDefinition = {
  key: FeatureServiceKey
  label: string
  envVar: string
  description: string
  gatewayRoute: string
}

export type FeatureServiceStatus = FeatureServiceDefinition & {
  baseUrl: string | null
  isConfigured: boolean
}

const featureServices: Record<FeatureServiceKey, FeatureServiceDefinition> = {
  finance: {
    key: 'finance',
    label: 'Finance service',
    envVar: 'FINANCE_SERVICE_URL',
    description: 'Real-time portfolio pricing, holdings snapshots, and market-data adapters.',
    gatewayRoute: '/api/finance',
  },
  budget: {
    key: 'budget',
    label: 'Budget service',
    envVar: 'BUDGET_SERVICE_URL',
    description: 'Budget plans, transaction categorization, and forecasting workflows.',
    gatewayRoute: '/api/budget',
  },
}

function sanitizeServiceUrl(value?: string | null) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  try {
    const parsed = new URL(trimmed)

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }

    return parsed.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

export function getFeatureServiceStatus(key: FeatureServiceKey): FeatureServiceStatus {
  const definition = featureServices[key]
  const baseUrl = sanitizeServiceUrl(process.env[definition.envVar])

  return {
    ...definition,
    baseUrl,
    isConfigured: baseUrl !== null,
  }
}
