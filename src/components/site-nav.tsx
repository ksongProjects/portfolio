'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { getActiveSiteRoute, siteRoutes } from '@/lib/site-routes'

export function SiteNav() {
  const pathname = usePathname()
  const activeRoute = getActiveSiteRoute(pathname)

  return (
    <nav className="site-index" aria-label="Page navigation">
      <div className="site-index__desktop">
        <div className="site-index__breadcrumbs">
          {siteRoutes.map((item, index) => (
            <Fragment key={item.key}>
              <Link
                href={item.href}
                data-route={item.key}
                className={activeRoute.key === item.key ? 'is-active' : undefined}
                aria-current={activeRoute.key === item.key ? 'page' : undefined}
              >
                <span>{item.index}</span>
                <strong>{item.label}</strong>
              </Link>
              {index < siteRoutes.length - 1 ? (
                <span className="site-index__divider" aria-hidden="true" />
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>
    </nav>
  )
}

export function PageMobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const navRef = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()
  const activeItem = getActiveSiteRoute(pathname)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || navRef.current?.contains(event.target)) {
        return
      }

      setIsOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={navRef} className={`section-mobile-nav${isOpen ? ' is-open' : ''}`}>
      <p className="section-mobile-title" aria-live="polite">
        <span>{activeItem.index}</span>
        <strong>{activeItem.label}</strong>
      </p>

      <button
        type="button"
        className="section-mobile-nav__toggle"
        aria-expanded={isOpen}
        aria-controls="section-mobile-nav-sheet"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => {
          setIsOpen((current) => !current)
        }}
      >
        {isOpen ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
      </button>

      <div
        className="section-mobile-nav__sheet"
        id="section-mobile-nav-sheet"
      >
        <div className="site-index__links">
          {siteRoutes.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              data-route={item.key}
              className={activeItem.key === item.key ? 'is-active' : undefined}
              aria-current={activeItem.key === item.key ? 'page' : undefined}
              onClick={() => {
                setIsOpen(false)
              }}
            >
              <span>{item.index}</span>
              <strong>{item.label}</strong>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
