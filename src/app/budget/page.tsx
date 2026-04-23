import type { Metadata } from 'next'
import { BudgetPlaceholderPage } from '@/features/budget/components/budget-placeholder-page'
import { getBudgetPageData } from '@/features/budget/server/get-budget-page-data'

export const metadata: Metadata = {
  title: 'Budget',
  description: 'Placeholder route for the upcoming budget manager app.',
}

export default function BudgetRoute() {
  const { service } = getBudgetPageData()

  return <BudgetPlaceholderPage service={service} />
}
