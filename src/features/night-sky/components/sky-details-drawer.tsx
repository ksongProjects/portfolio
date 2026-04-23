import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { SkyFocus } from '@/lib/types'
import type { SkyDetailsContent } from '@/lib/sky/details'

type SkyDetailsDrawerProps = {
  details: SkyDetailsContent
  onSelectFocus: (focus: SkyFocus) => void
}

export function SkyDetailsDrawer({ details, onSelectFocus }: SkyDetailsDrawerProps) {
  return (
    <div className="sky-details" id="sky-details" aria-live="polite">
      <div className="sky-details-stack">
        <Card className="sky-portrait">
          <CardContent className="sky-portrait__caption">
            <p className="sky-portrait__eyebrow">{details.eyebrow}</p>
            <h3 className="sky-portrait__title">{details.title}</h3>
            <p className="sky-portrait__subtitle">{details.subtitle}</p>
            <Badge
              variant="outline"
              className={`sky-portrait__visibility-badge sky-portrait__visibility-badge--${details.visibilityBadge.tone}`}
            >
              {details.visibilityBadge.label}
            </Badge>
            <p className="sky-portrait__fact">{details.fact}</p>
            {details.actions?.length ? (
              <div className="sky-portrait__actions">
                {details.actions.map((action) => (
                  <Button
                    key={action.label}
                    type="button"
                    variant="link"
                    className="sky-portrait__action"
                    onClick={() => {
                      onSelectFocus(action.focus)
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <p className="sky-details__credit">
        Sources:{' '}
        <a
          href="https://github.com/Stellarium/stellarium-skycultures"
          rel="noreferrer"
          target="_blank"
        >
          Stellarium skycultures
        </a>
        ,{' '}
        <a
          href="https://tapvizier.cds.unistra.fr/TAPVizieR/tap/"
          rel="noreferrer"
          target="_blank"
        >
          VizieR Hipparcos
        </a>
        ,{' '}
        <a href="https://cds.unistra.fr/cgi-bin/Sesame" rel="noreferrer" target="_blank">
          CDS Sesame
        </a>
        , and{' '}
        <a href="https://www.wikipedia.org/" rel="noreferrer" target="_blank">
          Wikipedia
        </a>
        .
      </p>
    </div>
  )
}
