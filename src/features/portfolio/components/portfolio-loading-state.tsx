import { Spinner } from '@/components/ui/spinner'

export function PortfolioLoadingState() {
  return (
    <div className="monograph-list sky-loading-region min-h-[28rem]">
      <div className="project-group__header">
        <p className="project-group__eyebrow">Projects</p>
      </div>
      <div className="sky-loading-overlay" role="status" aria-live="polite">
        <Spinner className="size-8" />
        <p className="sky-loading-copy">Loading projects</p>
      </div>
    </div>
  )
}
