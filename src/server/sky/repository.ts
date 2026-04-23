import { queryAll, queryFirst } from '@/server/db'
import type { ReferenceStar, SkyCatalogStar, SkyDataset, ZodiacSign } from '@/lib/types'
import { isDatabaseConfigured } from '@/server/db/config'
import { syncSkyCatalog } from './catalog'

type SkyDatasetCacheEntry = {
  version: string
  dataset: SkyDataset
  checkedAt: number
}

const globalForSkyDataset = globalThis as typeof globalThis & {
  portfolioSkyDatasetCache?: SkyDatasetCacheEntry
}

const SKY_DATASET_CACHE_TTL_MS = 30_000

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

function parseHipIdList(value: string | null | undefined, constellationKey: string): number[] {
  if (typeof value !== 'string') {
    console.warn(
      `[sky] Missing starHipIdsJson for constellation "${constellationKey}". Falling back to an empty star list.`,
    )
    return []
  }

  const trimmed = value.trim()

  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    console.warn(
      `[sky] Invalid starHipIdsJson for constellation "${constellationKey}". Falling back to an empty star list.`,
    )
    return []
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown

    if (!Array.isArray(parsed)) {
      console.warn(
        `[sky] starHipIdsJson for constellation "${constellationKey}" did not parse to an array. Falling back to an empty star list.`,
      )
      return []
    }

    return parsed.filter((hipId): hipId is number => typeof hipId === 'number')
  } catch (error) {
    console.warn(
      `[sky] Failed to parse starHipIdsJson for constellation "${constellationKey}". Falling back to an empty star list.`,
      error,
    )
    return []
  }
}

function parseEdgeHipPairs(
  value: string | null | undefined,
  constellationKey: string,
): Array<[number, number]> {
  if (typeof value !== 'string') {
    console.warn(
      `[sky] Missing edgeHipPairsJson for constellation "${constellationKey}". Falling back to an empty edge list.`,
    )
    return []
  }

  const trimmed = value.trim()

  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    console.warn(
      `[sky] Invalid edgeHipPairsJson for constellation "${constellationKey}". Falling back to an empty edge list.`,
    )
    return []
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown

    if (!Array.isArray(parsed)) {
      console.warn(
        `[sky] edgeHipPairsJson for constellation "${constellationKey}" did not parse to an array. Falling back to an empty edge list.`,
      )
      return []
    }

    return parsed.filter(
      (pair): pair is [number, number] =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        typeof pair[0] === 'number' &&
        typeof pair[1] === 'number',
    )
  } catch (error) {
    console.warn(
      `[sky] Failed to parse edgeHipPairsJson for constellation "${constellationKey}". Falling back to an empty edge list.`,
      error,
    )
    return []
  }
}

export async function ensureSkyDataset(): Promise<SkyDataset> {
  const freshCachedDataset = getFreshCachedSkyDataset()

  if (freshCachedDataset) {
    return freshCachedDataset
  }

  let cacheState = await getSkyDatasetCacheState()

  if (cacheState.constellationCount === 0) {
    await syncSkyCatalog()
    cacheState = await getSkyDatasetCacheState()
  }

  const cachedDataset = getCachedSkyDataset(cacheState.version)

  if (cachedDataset) {
    return cachedDataset
  }

  const dataset = await getSkyDataset()

  if (dataset.zodiacSigns.length === 0) {
    throw new Error('Sky catalog is empty after sync.')
  }

  setCachedSkyDataset(cacheState.version, dataset)

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
    const starHipIds = parseHipIdList(constellation.starHipIdsJson, constellation.key)
    const edgeHipPairs = parseEdgeHipPairs(constellation.edgeHipPairsJson, constellation.key)
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

async function getSkyDatasetCacheState(): Promise<{
  constellationCount: number
  version: string | null
}> {
  const result = await queryFirst<{
    constellationCount: number
    version: string | null
  }>(`
    SELECT
      COUNT(*)::int AS "constellationCount",
      GREATEST(
        COALESCE((SELECT MAX("updatedAt") FROM "Constellation"), TIMESTAMPTZ 'epoch'),
        COALESCE((SELECT MAX("updatedAt") FROM "Star"), TIMESTAMPTZ 'epoch'),
        COALESCE((SELECT MAX("updatedAt") FROM "FeaturedStar"), TIMESTAMPTZ 'epoch')
      )::text AS "version"
    FROM "Constellation"
  `)

  return {
    constellationCount: result?.constellationCount ?? 0,
    version: result?.version ?? null,
  }
}

function getFreshCachedSkyDataset(): SkyDataset | null {
  const cachedEntry = globalForSkyDataset.portfolioSkyDatasetCache

  if (!cachedEntry) {
    return null
  }

  if (Date.now() - cachedEntry.checkedAt > SKY_DATASET_CACHE_TTL_MS) {
    return null
  }

  return cachedEntry.dataset
}

function getCachedSkyDataset(version: string | null): SkyDataset | null {
  if (!version) {
    return null
  }

  const cachedEntry = globalForSkyDataset.portfolioSkyDatasetCache

  if (!cachedEntry || cachedEntry.version !== version) {
    return null
  }

  cachedEntry.checkedAt = Date.now()

  return cachedEntry.dataset
}

function setCachedSkyDataset(version: string | null, dataset: SkyDataset): void {
  if (!version) {
    return
  }

  globalForSkyDataset.portfolioSkyDatasetCache = {
    version,
    dataset,
    checkedAt: Date.now(),
  }
}
