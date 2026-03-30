import type { SkyFocus } from '@/lib/types'
import { DEFAULT_SIGN_KEY } from './constants'
import type { SkySnapshot } from './types'
import { formatAltitudeLabel, formatCompassLabel } from './utils'

export type SkyDetailsFact = {
  label: string
  value: string
  wide?: boolean
}

export type SkyDetailsContent = {
  eyebrow: string
  title: string
  subtitle: string
  fact: string
  imageAlt: string
  imageSrc: string
  imageFit?: 'cover' | 'contain'
  items: SkyDetailsFact[]
}

export function getSkyDetailsContent(
  focus: SkyFocus,
  snapshot: SkySnapshot,
  selectedSignKey: string,
): SkyDetailsContent {
  if (focus.kind === 'star') {
    const star = snapshot.referenceStarPositions.find((entry) => entry.name === focus.starName)

    if (star) {
      return {
        eyebrow: 'Focused star',
        title: star.name,
        subtitle: star.constellation,
        fact: star.fact,
        imageAlt: `Portrait of ${star.name}.`,
        imageSrc:
          star.imageUrl ??
          createStarPortrait({
            name: star.name,
            subtitle: star.constellation,
            color: star.color,
          }),
        imageFit: star.imageUrl ? 'contain' : 'cover',
        items: [
          { label: 'Focus', value: star.name },
          { label: 'Type', value: 'Star' },
          { label: 'Constellation', value: star.constellation },
          { label: 'Bearing', value: formatCompassLabel(star.position.azimuth) },
          { label: 'Altitude', value: formatAltitudeLabel(star.position.altitude) },
        ],
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

  return {
    eyebrow: `Brightest in ${sign.name}`,
    title: sign.brightest,
    subtitle: sign.brightestStarSubtitle ?? `${sign.name} guide star`,
    fact: sign.brightestStarSummary ?? sign.note,
    imageAlt: `${sign.brightest} in ${sign.name}.`,
    imageSrc:
      sign.brightestStarImageUrl ??
      createStarPortrait({
        name: sign.brightest,
        subtitle: sign.name,
        color: sign.accent,
      }),
    imageFit: sign.brightestStarImageUrl ? 'contain' : 'cover',
    items: [
      { label: 'Focus', value: sign.name },
      { label: 'Type', value: 'Constellation' },
      { label: 'Dates', value: sign.dates },
      { label: 'Brightest star', value: sign.brightest },
      { label: 'Bearing', value: formatCompassLabel(signPosition.azimuth) },
      { label: 'Altitude', value: formatAltitudeLabel(signPosition.altitude) },
    ],
  }
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
      <text x="112" y="148" fill="#E8F0FF" fill-opacity="0.76" font-family="IBM Plex Mono, monospace" font-size="24" letter-spacing="2.6">STAR PORTRAIT</text>
      <text x="112" y="356" fill="#F7FAFF" font-family="Instrument Serif, serif" font-size="76">${input.name}</text>
      <text x="112" y="396" fill="#E8F0FF" fill-opacity="0.7" font-family="IBM Plex Mono, monospace" font-size="24" letter-spacing="1.8">${input.subtitle.toUpperCase()}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
