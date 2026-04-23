import type { Metadata } from 'next'
import { FinancePlaceholderPage } from '@/features/finance/components/finance-placeholder-page'
import { getFinancePageData } from '@/features/finance/server/get-finance-page-data'

export const metadata: Metadata = {
  title: 'Finance',
  description: 'Placeholder route for the upcoming live finance portfolio viewer.',
}

export default function FinanceRoute() {
  const { service } = getFinancePageData()

  return <FinancePlaceholderPage service={service} />
}
