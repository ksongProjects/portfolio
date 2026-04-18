export type SocialLink = {
  label: string
  href: string
  handle: string
}

export type Profile = {
  name: string
  role: string
  intro: string
}

export type RepoActivity = {
  label: 'Last active' | 'Last updated'
  iso: string
}

export type Project = {
  slug: string
  title: string
  strapline: string
  repoHref?: string
  liveHref?: string
  techStack?: string[]
  index: string
  repoActivity?: RepoActivity | null
}

export type SkyCatalogStar = {
  hipId: number
  name?: string | null
  ra: number
  dec: number
  magnitude: number
  color?: string | null
  summary?: string | null
  imageUrl?: string | null
}

export type ZodiacSign = {
  key: string
  name: string
  symbol: string
  group?: 'zodiac' | 'popular'
  dates: string
  railSubtitle?: string
  metaLabel?: string
  metaValue?: string
  centerRa: number
  centerDec: number
  accent: string
  note: string
  brightest: string
  brightestStarSummary?: string | null
  brightestStarImageUrl?: string | null
  brightestStarSubtitle?: string | null
  brightestStarImageLicenseName?: string | null
  brightestStarImageLicenseUrl?: string | null
  brightestStarImageAttribution?: string | null
  brightestStarImageSourceUrl?: string | null
  stars: SkyCatalogStar[]
  edges: Array<[number, number]>
}

export type ReferenceStar = {
  name: string
  ra: number
  dec: number
  color: string
  priority: number
  constellation: string
  fact: string
  imageUrl?: string | null
  imageLicenseName?: string | null
  imageLicenseUrl?: string | null
  imageAttribution?: string | null
  imageSourceUrl?: string | null
  zodiacSignKey?: string
}

export type SkyDataset = {
  zodiacSigns: ZodiacSign[]
  zodiacSignsByYear: ZodiacSign[]
  popularConstellations: ZodiacSign[]
  allConstellations: ZodiacSign[]
  fieldStars: SkyCatalogStar[]
  referenceStars: ReferenceStar[]
}

export type AppLocation = {
  label: string
  latitude: number
  longitude: number
  timezone: string
  source: 'fallback' | 'geolocation'
  detail: string
}

export type ConstellationPosition = {
  azimuth: number
  altitude: number
}

export type SkyFocus =
  | {
      kind: 'sign'
      signKey: string
    }
  | {
      kind: 'star'
      starName: string
    }
