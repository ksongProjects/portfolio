import type { SkyFocus } from '@/lib/types'
import type { SkyDetailsContent } from '@/lib/sky/details'
import Image from 'next/image'

type SkyDetailsDrawerProps = {
  details: SkyDetailsContent
  onSelectFocus: (focus: SkyFocus) => void
}

export function SkyDetailsDrawer({ details, onSelectFocus }: SkyDetailsDrawerProps) {
  return (
    <div className="sky-details" id="sky-details" aria-live="polite">
      <div className="sky-details-stack">
        <figure className="sky-portrait">
          <div className="sky-portrait__media">
            <Image
              className={`sky-portrait__image sky-portrait__image--${details.imageFit ?? 'cover'}`}
              src={details.imageSrc}
              alt={details.imageAlt}
              fill
              sizes="(max-width: 780px) calc(100vw - 4rem), 22rem"
              unoptimized={details.imageSrc.startsWith('data:')}
            />
          </div>
          <figcaption className="sky-portrait__caption">
            <p className="sky-portrait__eyebrow">{details.eyebrow}</p>
            <h3 className="sky-portrait__title">{details.title}</h3>
            <p className="sky-portrait__subtitle">{details.subtitle}</p>
            <p
              className={`sky-portrait__visibility-badge sky-portrait__visibility-badge--${details.visibilityBadge.tone}`}
            >
              {details.visibilityBadge.label}
            </p>
            <p className="sky-portrait__fact">{details.fact}</p>
            {details.actions?.length ? (
              <div className="sky-portrait__actions">
                {details.actions.map((action) => (
                  <button
                    type="button"
                    className="sky-portrait__action"
                    key={action.label}
                    onClick={() => {
                      onSelectFocus(action.focus)
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
            {details.imageAttribution || details.imageLicenseName || details.imageSourceUrl ? (
              <p className="sky-portrait__meta">
                {details.imageAttribution ? (
                  <span>{details.imageAttribution}</span>
                ) : null}
                {details.imageLicenseName ? (
                  details.imageLicenseUrl ? (
                    <a href={details.imageLicenseUrl} rel="noreferrer" target="_blank">
                      {details.imageLicenseName}
                    </a>
                  ) : (
                    <span>{details.imageLicenseName}</span>
                  )
                ) : null}
                {details.imageSourceUrl ? (
                  <a href={details.imageSourceUrl} rel="noreferrer" target="_blank">
                    Source
                  </a>
                ) : null}
              </p>
            ) : null}
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
      <p className="sky-details__credit">
        Constellation line data from{' '}
        <a
          href="https://github.com/Stellarium/stellarium-skycultures"
          rel="noreferrer"
          target="_blank"
        >
          Stellarium skycultures
        </a>
        .
      </p>
    </div>
  )
}
