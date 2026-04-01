import { queryAll } from '@/server/db'
import type { ReferenceStar, SkyCatalogStar, SkyDataset, ZodiacSign } from '@/lib/types'
import { isDatabaseConfigured } from '@/server/db/config'
import { syncSkyCatalog, isSkyCatalogEmpty } from './catalog'

const zodiacYearOrder = [
  'capricorn',
  'aquarius',
  'pisces',
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
] as const

const popularConstellationOrder = [
  'orion',
  'ursa-major',
  'ursa-minor',
  'cassiopeia',
  'cygnus',
  'canis-major',
] as const

const popularConstellationMeta = new Map<
  string,
  {
    railSubtitle: string
    metaLabel: string
    metaValue: string
  }
>([
  [
    'orion',
    {
      railSubtitle: 'Northern winter',
      metaLabel: 'Season',
      metaValue: 'Northern winter',
    },
  ],
  [
    'ursa-major',
    {
      railSubtitle: 'Northern spring',
      metaLabel: 'Season',
      metaValue: 'Northern spring',
    },
  ],
  [
    'ursa-minor',
    {
      railSubtitle: 'Circumpolar north',
      metaLabel: 'Visibility',
      metaValue: 'Circumpolar north',
    },
  ],
  [
    'cassiopeia',
    {
      railSubtitle: 'Northern autumn',
      metaLabel: 'Season',
      metaValue: 'Northern autumn',
    },
  ],
  [
    'cygnus',
    {
      railSubtitle: 'Northern summer',
      metaLabel: 'Season',
      metaValue: 'Northern summer',
    },
  ],
  [
    'canis-major',
    {
      railSubtitle: 'Southern winter arc',
      metaLabel: 'Season',
      metaValue: 'Northern winter',
    },
  ],
])

export async function ensureSkyDataset(): Promise<SkyDataset> {
  if (await isSkyCatalogEmpty()) {
    await syncSkyCatalog()
  }

  const dataset = await getSkyDataset()

  if (dataset.zodiacSigns.length === 0) {
    throw new Error('Sky catalog is empty after sync.')
  }

  return dataset
}

export async function getSkyDataset(): Promise<SkyDataset> {
  if (!isDatabaseConfigured()) {
    throw new Error('Supabase database is not configured.')
  }

  const constellations = await queryAll<{
    key: string
    name: string
    symbol: string
    dates: string
    centerRa: number
    centerDec: number
    accent: string
    note: string
    brightestStarName: string
    brightestStarSummary: string | null
    brightestStarImageUrl: string | null
    brightestStarSubtitle: string | null
    brightestStarImageLicenseName: string | null
    brightestStarImageLicenseUrl: string | null
    brightestStarImageAttribution: string | null
    brightestStarImageSourceUrl: string | null
    starHipIdsJson: string
    edgeHipPairsJson: string
  }>('SELECT * FROM "Constellation" ORDER BY "name" ASC')

  const stars = await queryAll<{
    hipId: number
    name: string | null
    ra: number
    dec: number
    magnitude: number
  }>('SELECT * FROM "Star"')

  const featuredStars = await queryAll<{
    name: string
    ra: number
    dec: number
    color: string
    priority: number
    constellation: string
    fact: string
    imageUrl: string | null
    imageLicenseName: string | null
    imageLicenseUrl: string | null
    imageAttribution: string | null
    imageSourceUrl: string | null
    zodiacSignKey: string | null
  }>('SELECT * FROM "FeaturedStar" ORDER BY "priority" DESC, "name" ASC')

  const starMap = new Map<number, SkyCatalogStar>(
    stars.map((star) => [
      star.hipId,
      {
        hipId: star.hipId,
        name: star.name,
        ra: star.ra,
        dec: star.dec,
        magnitude: star.magnitude,
      },
    ]),
  )

  const allConstellations: ZodiacSign[] = constellations.map((constellation) => {
    const starHipIds = JSON.parse(constellation.starHipIdsJson) as number[]
    const edgeHipPairs = JSON.parse(constellation.edgeHipPairsJson) as Array<[number, number]>
    const starsForConstellation = starHipIds
      .map((hipId) => starMap.get(hipId))
      .filter((star): star is SkyCatalogStar => star !== undefined)
    const starIndexByHip = new Map(starHipIds.map((hipId, index) => [hipId, index]))
    const edges = edgeHipPairs
      .map(([startHipId, endHipId]) => {
        const startIndex = starIndexByHip.get(startHipId)
        const endIndex = starIndexByHip.get(endHipId)

        return startIndex != null && endIndex != null ? [startIndex, endIndex] : null
      })
      .filter((edge): edge is [number, number] => edge !== null)
    const popularMeta = popularConstellationMeta.get(constellation.key)

    return {
      key: constellation.key,
      name: constellation.name,
      symbol: constellation.symbol,
      group: popularMeta ? 'popular' : 'zodiac',
      dates: constellation.dates,
      railSubtitle: popularMeta?.railSubtitle ?? constellation.dates,
      metaLabel: popularMeta?.metaLabel ?? 'Dates',
      metaValue: popularMeta?.metaValue ?? constellation.dates,
      centerRa: constellation.centerRa,
      centerDec: constellation.centerDec,
      accent: constellation.accent,
      note: constellation.note,
      brightest: constellation.brightestStarName,
      brightestStarSummary: constellation.brightestStarSummary,
      brightestStarImageUrl: constellation.brightestStarImageUrl,
      brightestStarSubtitle: constellation.brightestStarSubtitle,
      brightestStarImageLicenseName: constellation.brightestStarImageLicenseName,
      brightestStarImageLicenseUrl: constellation.brightestStarImageLicenseUrl,
      brightestStarImageAttribution: constellation.brightestStarImageAttribution,
      brightestStarImageSourceUrl: constellation.brightestStarImageSourceUrl,
      stars: starsForConstellation,
      edges,
    }
  })

  const zodiacSignsByYear = zodiacYearOrder
    .map((key) => allConstellations.find((sign) => sign.key === key))
    .filter((sign): sign is ZodiacSign => sign !== undefined)

  const popularConstellations = popularConstellationOrder
    .map((key) => allConstellations.find((sign) => sign.key === key))
    .filter((sign): sign is ZodiacSign => sign !== undefined)

  const zodiacSigns = zodiacSignsByYear

  const referenceStars: ReferenceStar[] = featuredStars.map((star) => ({
    name: star.name,
    ra: star.ra,
    dec: star.dec,
    color: star.color,
    priority: star.priority,
    constellation: star.constellation,
    fact: star.fact,
    imageUrl: star.imageUrl,
    imageLicenseName: star.imageLicenseName,
    imageLicenseUrl: star.imageLicenseUrl,
    imageAttribution: star.imageAttribution,
    imageSourceUrl: star.imageSourceUrl,
    zodiacSignKey: star.zodiacSignKey ?? undefined,
  }))

  const constellationHipIds = new Set(
    allConstellations.flatMap((sign) => sign.stars.map((star) => star.hipId)),
  )
  const fieldStars = Array.from(starMap.values()).filter((star) => !constellationHipIds.has(star.hipId))

  return {
    zodiacSigns,
    zodiacSignsByYear,
    popularConstellations,
    allConstellations,
    fieldStars,
    referenceStars,
  }
}

export async function maybeEnsureSkyDataset(): Promise<SkyDataset | null> {
  if (!isDatabaseConfigured()) {
    return null
  }

  const dataset = await ensureSkyDataset()

  return dataset.zodiacSigns.length > 0 ? dataset : null
}
