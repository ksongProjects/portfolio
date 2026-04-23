import { getFeatureServiceStatus } from '@/server/services/registry'

export function getFinancePageData() {
  return {
    service: getFeatureServiceStatus('finance'),
  }
}
