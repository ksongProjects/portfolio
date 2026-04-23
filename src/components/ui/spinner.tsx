import type { ComponentPropsWithoutRef } from 'react'

type SpinnerProps = ComponentPropsWithoutRef<'span'> & {
  size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  const classes = ['ui-spinner', `ui-spinner--${size}`, className].filter(Boolean).join(' ')

  return <span data-slot="spinner" aria-hidden="true" className={classes} {...props} />
}
