import type { SkyFocus, ZodiacSign } from '@/lib/types'
import { DEFAULT_SIGN_KEY } from './constants'
import type { SkySnapshot } from './types'
import { formatAltitudeLabel, formatCompassLabel, shortestAngleDelta } from './utils'

export type SkyDetailsFact = {
  label: string
  value: string
  wide?: boolean
}

export type SkyVisibilityBadge = {
  label: string
  tone: 'visible' | 'hidden'
}

export type SkyDetailsContent = {
  kind: 'sign' | 'star'
  eyebrow: string
  title: string
  subtitle: string
  fact: string
  visibilityBadge: SkyVisibilityBadge
  imageAlt: string
  imageSrc: string
  imageFit?: 'cover' | 'contain'
  imageAttribution?: string | null
  imageLicenseName?: string | null
  imageLicenseUrl?: string | null
  imageSourceUrl?: string | null
  items: SkyDetailsFact[]
  actions?: Array<{
    label: string
    focus: SkyFocus
  }>
}

export function getSkyDetailsContent(
  focus: SkyFocus,
  snapshot: SkySnapshot,
  selectedSignKey: string,
): SkyDetailsContent {
  if (focus.kind === 'star') {
    const star = snapshot.referenceStarPositions.find((entry) => entry.name === focus.starName)

    if (star) {
      const relatedSign =
        (star.zodiacSignKey
          ? snapshot.allPositions.find((entry) => entry.sign.key === star.zodiacSignKey)?.sign
          : undefined) ??
        snapshot.allPositions.find((entry) => entry.sign.name === star.constellation)?.sign

      return {
        kind: 'star',
        eyebrow:
          relatedSign?.brightest === star.name
            ? `Brightest star in ${relatedSign.name}`
            : 'Focused star',
        title: star.name,
        subtitle: star.constellation,
        fact: star.fact,
        visibilityBadge: getVisibilityBadge(star.position.altitude),
        imageAlt: `Portrait of ${star.name}.`,
        imageSrc:
          star.imageUrl ??
          createStarPortrait({
            name: star.name,
            subtitle: star.constellation,
            color: star.color,
          }),
        imageFit: star.imageUrl ? 'contain' : 'cover',
        imageAttribution: star.imageAttribution,
        imageLicenseName: star.imageLicenseName,
        imageLicenseUrl: star.imageLicenseUrl,
        imageSourceUrl: star.imageSourceUrl,
        items: [
          { label: 'Type', value: 'Star' },
          { label: 'Constellation', value: star.constellation },
          { label: 'Visibility', value: getVisibilityLabel(star.position.altitude) },
          { label: 'Bearing', value: formatCompassLabel(star.position.azimuth) },
          { label: 'Altitude', value: formatAltitudeLabel(star.position.altitude) },
        ],
        actions: relatedSign
          ? [
              {
                label: `View constellation: ${relatedSign.name}`,
                focus: {
                  kind: 'sign',
                  signKey: relatedSign.key,
                },
              },
            ]
          : undefined,
      }
    }
  }

  const focusedSignKey = focus.kind === 'sign' ? focus.signKey : selectedSignKey
  const signEntry =
    snapshot.allPositions.find((entry) => entry.sign.key === focusedSignKey) ??
    snapshot.allPositions.find((entry) => entry.sign.key === selectedSignKey) ??
    snapshot.allPositions.find((entry) => entry.sign.key === DEFAULT_SIGN_KEY) ??
    snapshot.allPositions[0]

  const sign = signEntry.sign
  const signPosition = signEntry.position
  const brightestStar =
    snapshot.referenceStarPositions.find(
      (entry) => entry.name === sign.brightest && entry.zodiacSignKey === sign.key,
    ) ??
    snapshot.referenceStarPositions.find((entry) => entry.name === sign.brightest) ??
    snapshot.referenceStarPositions.find((entry) => entry.zodiacSignKey === sign.key)

  return {
    kind: 'sign',
    eyebrow: sign.group === 'popular' ? 'Constellation in view' : 'Zodiac constellation',
    title: sign.name,
    subtitle: sign.metaValue ?? sign.dates,
    fact: sign.note,
    visibilityBadge: getVisibilityBadge(signPosition.altitude),
    imageAlt: `${sign.name} constellation portrait.`,
    imageSrc: createConstellationPortrait(sign),
    imageFit: 'cover',
    items: [
      {
        label: 'Type',
        value: sign.group === 'popular' ? 'Constellation' : 'Zodiac constellation',
      },
      { label: sign.metaLabel ?? 'Dates', value: sign.metaValue ?? sign.dates },
      { label: 'Visibility', value: getVisibilityLabel(signPosition.altitude) },
      { label: 'Brightest star', value: sign.brightest },
      { label: 'Bearing', value: formatCompassLabel(signPosition.azimuth) },
      { label: 'Altitude', value: formatAltitudeLabel(signPosition.altitude) },
    ],
    actions: brightestStar
      ? [
          {
            label: `View brightest star: ${brightestStar.name}`,
            focus: {
              kind: 'star',
              starName: brightestStar.name,
            },
          },
        ]
      : undefined,
  }
}

export function createConstellationPortrait(sign: ZodiacSign): string {
  const portrait = getConstellationPortraitGeometry(sign)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560" fill="none">
      <defs>
        <linearGradient id="bg" x1="96" x2="864" y1="44" y2="516" gradientUnits="userSpaceOnUse">
          <stop stop-color="#091425" />
          <stop offset="1" stop-color="#142544" />
        </linearGradient>
        <radialGradient id="nebula" cx="0" cy="0" r="1" gradientTransform="translate(706 164) rotate(90) scale(220 288)" gradientUnits="userSpaceOnUse">
          <stop stop-color="${sign.accent}" stop-opacity="0.34" />
          <stop offset="1" stop-color="${sign.accent}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="960" height="560" rx="36" fill="url(#bg)" />
      <rect x="28" y="28" width="904" height="504" rx="24" fill="#ffffff" fill-opacity="0.03" />
      <circle cx="706" cy="164" r="220" fill="url(#nebula)" />
      <g stroke="#ffffff" stroke-opacity="0.08" stroke-width="1">
        ${portrait.gridLines
          .map(
            (line) =>
              `<path d="M ${line.x1.toFixed(1)} ${line.y1.toFixed(1)} L ${line.x2.toFixed(1)} ${line.y2.toFixed(1)}" />`,
          )
          .join('')}
      </g>
      <g stroke="${sign.accent}" stroke-opacity="0.82" stroke-width="3">
        ${portrait.paths
          .map((path) => `<path d="${path}" stroke-linecap="round" stroke-linejoin="round" />`)
          .join('')}
      </g>
      <g>
        ${portrait.points
          .map(
            (point) => `
              <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${point.radius.toFixed(1)}" fill="#ffffff" fill-opacity="${point.opacity.toFixed(2)}" />
              ${
                point.isBrightest
                  ? `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${(
                      point.radius + 3.4
                    ).toFixed(1)}" fill="none" stroke="${sign.accent}" stroke-opacity="0.44" stroke-width="1.3" />`
                  : ''
              }
            `,
          )
          .join('')}
      </g>
      <text x="112" y="148" fill="#E8F0FF" fill-opacity="0.76" font-family="Anonymous Pro, monospace" font-size="24" letter-spacing="2.6">CONSTELLATION</text>
      <text x="112" y="356" fill="#F7FAFF" font-family="Anonymous Pro, monospace" font-size="64" letter-spacing="-1.2">${sign.name}</text>
      <text x="112" y="396" fill="#E8F0FF" fill-opacity="0.7" font-family="Anonymous Pro, monospace" font-size="24" letter-spacing="1.8">${(sign.metaValue ?? sign.dates).toUpperCase()}</text>
      ${
        sign.symbol
          ? `<text x="112" y="242" fill="${sign.accent}" fill-opacity="0.88" font-family="Anonymous Pro, monospace" font-size="64" letter-spacing="-1.6">${sign.symbol}</text>`
          : ''
      }
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function getVisibilityLabel(altitude: number): string {
  return altitude > 0 ? 'Above local horizon' : 'Below local horizon'
}

function getVisibilityBadge(altitude: number): SkyVisibilityBadge {
  return altitude > 0
    ? {
        label: 'Visible from your location',
        tone: 'visible',
      }
    : {
        label: 'Not visible from your location',
        tone: 'hidden',
      }
}

function getConstellationPortraitGeometry(sign: ZodiacSign) {
  const plot = {
    left: 506,
    top: 76,
    width: 334,
    height: 230,
  }
  const centerRaDegrees = (sign.centerRa > 24 ? sign.centerRa / 15 : sign.centerRa) * 15
  const centerDec = sign.centerDec
  const cosCenterDec = Math.max(0.2, Math.cos((centerDec * Math.PI) / 180))
  const normalizedStars = sign.stars.map((star) => ({
    name: star.name ?? '',
    x: -shortestAngleDelta(star.ra * 15, centerRaDegrees) * cosCenterDec,
    y: star.dec - centerDec,
    magnitude: star.magnitude,
  }))

  const xValues = normalizedStars.map((star) => star.x)
  const yValues = normalizedStars.map((star) => star.y)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const minY = Math.min(...yValues)
  const maxY = Math.max(...yValues)
  const spanX = Math.max(1.5, maxX - minX)
  const spanY = Math.max(1.5, maxY - minY)
  const paddingUnits = 3
  const scale = Math.min(
    plot.width / (spanX + paddingUnits * 2),
    plot.height / (spanY + paddingUnits * 2),
  )
  const centerX = plot.left + plot.width / 2
  const centerY = plot.top + plot.height / 2
  const midpointX = (minX + maxX) / 2
  const midpointY = (minY + maxY) / 2
  const points = normalizedStars.map((star) => {
    const x = centerX + (star.x - midpointX) * scale
    const y = centerY - (star.y - midpointY) * scale
    const normalizedMagnitude = Math.max(0, Math.min(1, (4.5 - star.magnitude) / 4.5))

    return {
      ...star,
      x,
      y,
      radius: 2.4 + normalizedMagnitude * 2.2,
      opacity: 0.66 + normalizedMagnitude * 0.28,
      isBrightest: star.name === sign.brightest,
    }
  })
  const paths = sign.edges
    .map(([fromIndex, toIndex]) => {
      const from = points[fromIndex]
      const to = points[toIndex]

      if (!from || !to) {
        return null
      }

      return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`
    })
    .filter((path): path is string => path !== null)
  const gridStep = getPortraitGridStep(Math.max(spanX, spanY))
  const gridLines = [
    ...buildPortraitGridLines('vertical', minX, maxX, midpointX, centerX, centerY, plot, scale, gridStep),
    ...buildPortraitGridLines(
      'horizontal',
      minY,
      maxY,
      midpointY,
      centerX,
      centerY,
      plot,
      scale,
      gridStep,
    ),
  ]

  return {
    points,
    paths,
    gridLines,
  }
}

function buildPortraitGridLines(
  orientation: 'vertical' | 'horizontal',
  minValue: number,
  maxValue: number,
  midpoint: number,
  centerX: number,
  centerY: number,
  plot: { left: number; top: number; width: number; height: number },
  scale: number,
  gridStep: number,
) {
  const start = Math.floor((minValue - midpoint) / gridStep) * gridStep
  const end = Math.ceil((maxValue - midpoint) / gridStep) * gridStep
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []

  for (let offset = start; offset <= end; offset += gridStep) {
    if (orientation === 'vertical') {
      const x = centerX + offset * scale

      lines.push({
        x1: x,
        y1: plot.top,
        x2: x,
        y2: plot.top + plot.height,
      })
      continue
    }

    const y = centerY - offset * scale

    lines.push({
      x1: plot.left,
      y1: y,
      x2: plot.left + plot.width,
      y2: y,
    })
  }

  return lines
}

function getPortraitGridStep(span: number): number {
  if (span <= 10) {
    return 2
  }

  if (span <= 20) {
    return 5
  }

  return 10
}

export function createStarPortrait(input: {
  name: string
  subtitle: string
  color: string
}): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560" fill="none">
      <defs>
        <linearGradient id="bg" x1="140" x2="820" y1="48" y2="512" gradientUnits="userSpaceOnUse">
          <stop stop-color="#091425" />
          <stop offset="1" stop-color="#142544" />
        </linearGradient>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientTransform="translate(660 206) rotate(90) scale(190 240)" gradientUnits="userSpaceOnUse">
          <stop stop-color="${input.color}" stop-opacity="0.92" />
          <stop offset="1" stop-color="${input.color}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="core" cx="0" cy="0" r="1" gradientTransform="translate(660 206) rotate(90) scale(54)" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ffffff" />
          <stop offset="0.38" stop-color="${input.color}" />
          <stop offset="1" stop-color="${input.color}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="960" height="560" rx="36" fill="url(#bg)" />
      <rect x="28" y="28" width="904" height="504" rx="24" fill="#ffffff" fill-opacity="0.03" />
      <g fill="#ffffff" fill-opacity="0.5">
        <circle cx="120" cy="104" r="2.1" />
        <circle cx="184" cy="168" r="1.7" />
        <circle cx="248" cy="120" r="1.6" />
        <circle cx="332" cy="214" r="1.4" />
        <circle cx="386" cy="154" r="1.9" />
        <circle cx="444" cy="92" r="1.5" />
        <circle cx="512" cy="266" r="1.2" />
        <circle cx="784" cy="108" r="1.8" />
        <circle cx="822" cy="256" r="1.4" />
        <circle cx="862" cy="174" r="1.2" />
      </g>
      <circle cx="660" cy="206" r="190" fill="url(#glow)" />
      <circle cx="660" cy="206" r="56" fill="url(#core)" />
      <circle cx="660" cy="206" r="118" stroke="${input.color}" stroke-opacity="0.28" />
      <path d="M112 418h736" stroke="#ffffff" stroke-opacity="0.12" />
      <path d="M112 466h536" stroke="#ffffff" stroke-opacity="0.08" />
      <text x="112" y="148" fill="#E8F0FF" fill-opacity="0.76" font-family="Anonymous Pro, monospace" font-size="24" letter-spacing="2.6">STAR PORTRAIT</text>
      <text x="112" y="356" fill="#F7FAFF" font-family="Anonymous Pro, monospace" font-size="64" letter-spacing="-1.2">${input.name}</text>
      <text x="112" y="396" fill="#E8F0FF" fill-opacity="0.7" font-family="Anonymous Pro, monospace" font-size="24" letter-spacing="1.8">${input.subtitle.toUpperCase()}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
