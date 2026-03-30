import type { SkyDetailsContent } from '@/lib/sky/details'

type SkyDetailsDrawerProps = {
  details: SkyDetailsContent
}

export function SkyDetailsDrawer({ details }: SkyDetailsDrawerProps) {
  return (
    <div className="sky-details" id="sky-details" aria-live="polite">
      <div className="sky-details-stack">
        <figure className="sky-portrait">
          <img
            className={`sky-portrait__image sky-portrait__image--${details.imageFit ?? 'cover'}`}
            src={details.imageSrc}
            alt={details.imageAlt}
          />
          <figcaption className="sky-portrait__caption">
            <p className="sky-portrait__eyebrow">{details.eyebrow}</p>
            <h3 className="sky-portrait__title">{details.title}</h3>
            <p className="sky-portrait__subtitle">{details.subtitle}</p>
            <p className="sky-portrait__fact">{details.fact}</p>
          </figcaption>
        </figure>

        <div className="sky-facts">
          {details.items.map((item) => (
            <div
              className={`sky-fact${item.wide ? ' sky-fact--wide' : ''}`}
              key={`${item.label}-${item.value}`}
            >
              <p className="sky-fact__label">{item.label}</p>
              <p className="sky-fact__value">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
