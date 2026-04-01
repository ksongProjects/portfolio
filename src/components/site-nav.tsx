'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'

type SectionKey = 'portfolio' | 'stars'

type SiteNavProps = {
  activeSection: SectionKey
}

const navItems = [
  {
    key: 'portfolio',
    href: '#portfolio',
    index: '01',
    label: 'Portfolio',
  },
  {
    key: 'stars',
    href: '#stars',
    index: '02',
    label: 'Night Sky',
  },
] as const

export function SiteNav({ activeSection }: SiteNavProps) {
  return (
    <nav className="site-index" aria-label="Page navigation">
      <div className="site-index__desktop">
        <div className="site-index__breadcrumbs">
          {navItems.map((item, index) => (
            <Fragment key={item.key}>
              <a
                href={item.href}
                data-target={item.key}
                className={activeSection === item.key ? 'is-active' : undefined}
                aria-current={activeSection === item.key ? 'page' : undefined}
              >
                <span>{item.index}</span>
                <strong>{item.label}</strong>
              </a>
              {index < navItems.length - 1 ? (
                <span className="site-index__divider" aria-hidden="true" />
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>
    </nav>
  )
}

export function SectionMobileNav({ currentSection }: { currentSection: SectionKey }) {
  const [isOpen, setIsOpen] = useState(false)
  const navRef = useRef<HTMLDivElement | null>(null)
  const activeItem = navItems.find((item) => item.key === currentSection) ?? navItems[0]

  useEffect(() => {
    setIsOpen(false)
  }, [currentSection])

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
        aria-controls={`section-mobile-nav-sheet-${currentSection}`}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => {
          setIsOpen((current) => !current)
        }}
      >
        {isOpen ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
      </button>

      <div
        className="section-mobile-nav__sheet"
        id={`section-mobile-nav-sheet-${currentSection}`}
      >
        <div className="site-index__links">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={item.href}
              data-target={item.key}
              className={currentSection === item.key ? 'is-active' : undefined}
              aria-current={currentSection === item.key ? 'page' : undefined}
              onClick={() => {
                setIsOpen(false)
              }}
            >
              <span>{item.index}</span>
              <strong>{item.label}</strong>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
