import { getFeatureServiceStatus } from '@/server/services/registry'

export function getBudgetPageData() {
  return {
    service: getFeatureServiceStatus('budget'),
  }
}
