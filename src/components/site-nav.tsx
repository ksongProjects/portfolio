type SiteNavProps = {
  activeSection: 'portfolio' | 'stars'
}

export function SiteNav({ activeSection }: SiteNavProps) {
  return (
    <nav className="site-index" aria-label="Page navigation">
      <div className="site-index__inner">
        <div className="site-index__links">
          <a
            href="#portfolio"
            data-target="portfolio"
            className={activeSection === 'portfolio' ? 'is-active' : undefined}
            aria-current={activeSection === 'portfolio' ? 'page' : undefined}
          >
            <span>01</span>
            <strong>Portfolio</strong>
          </a>
          <a
            href="#stars"
            data-target="stars"
            className={activeSection === 'stars' ? 'is-active' : undefined}
            aria-current={activeSection === 'stars' ? 'page' : undefined}
          >
            <span>02</span>
            <strong>Night Sky</strong>
          </a>
        </div>
      </div>
    </nav>
  )
}
