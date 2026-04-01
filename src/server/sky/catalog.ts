import { execute, queryAll, queryFirst, transaction } from '@/server/db'
import { isDatabaseConfigured } from '@/server/db/config'

type ConstellationSeed = {
  key: string
  iau: string
  name: string
  symbol: string
  dates: string
  accent: string
  note: string
  brightestStarName: string
  brightestStarWikiTitle?: string
}

type FeaturedStarSeed = {
  name: string
  constellation: string
  color: string
  priority: number
  zodiacSignKey?: string
  wikiTitle?: string
}

const USER_AGENT = 'portfolio-next-migration/1.0 (local development)'
const STELLARIUM_WESTERN_URL =
  'https://raw.githubusercontent.com/Stellarium/stellarium-skycultures/master/western/index.json'
const WIKIPEDIA_ACTION_URL = 'https://en.wikipedia.org/w/api.php'
const WIKIPEDIA_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary'
const SESAME_URL = 'https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/~SNV?'
const VIZIER_TAP_URL = 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync'
const BRIGHT_STAR_MAGNITUDE_LIMIT = 4.8

const zodiacSeeds: ConstellationSeed[] = [
  {
    key: 'aries',
    iau: 'Ari',
    name: 'Aries',
    symbol: 'Aries',
    dates: 'Mar 21 - Apr 19',
    accent: '#f29b75',
    note: 'Compact and easy to trace, with Hamal and Sheratan leading the western ram line.',
    brightestStarName: 'Hamal',
  },
  {
    key: 'taurus',
    iau: 'Tau',
    name: 'Taurus',
    symbol: 'Taurus',
    dates: 'Apr 20 - May 20',
    accent: '#d9a45f',
    note: 'Recognizable for the Hyades V and the horn lines extending outward from Aldebaran.',
    brightestStarName: 'Aldebaran',
  },
  {
    key: 'gemini',
    iau: 'Gem',
    name: 'Gemini',
    symbol: 'Gemini',
    dates: 'May 21 - Jun 20',
    accent: '#8dc3ff',
    note: 'A tall twin figure anchored by Pollux and Castor at the top of the pattern.',
    brightestStarName: 'Pollux',
  },
  {
    key: 'cancer',
    iau: 'Cnc',
    name: 'Cancer',
    symbol: 'Cancer',
    dates: 'Jun 21 - Jul 22',
    accent: '#a3bddb',
    note: 'Subtle and sparse, with a faint central knot that rewards darker skies.',
    brightestStarName: 'Altarf',
  },
  {
    key: 'leo',
    iau: 'Leo',
    name: 'Leo',
    symbol: 'Leo',
    dates: 'Jul 23 - Aug 22',
    accent: '#f3b15d',
    note: 'The sickle and hindquarters make Leo one of the clearest zodiac outlines.',
    brightestStarName: 'Regulus',
  },
  {
    key: 'virgo',
    iau: 'Vir',
    name: 'Virgo',
    symbol: 'Virgo',
    dates: 'Aug 23 - Sep 22',
    accent: '#d8c7a7',
    note: 'Long and elegant, Virgo spreads through a wide chain with Spica at the brightest point.',
    brightestStarName: 'Spica',
  },
  {
    key: 'libra',
    iau: 'Lib',
    name: 'Libra',
    symbol: 'Libra',
    dates: 'Sep 23 - Oct 22',
    accent: '#b6a8ff',
    note: 'A compact balance shape resting between Virgo and Scorpius.',
    brightestStarName: 'Zubeneschamali',
    brightestStarWikiTitle: 'Beta Librae',
  },
  {
    key: 'scorpio',
    iau: 'Sco',
    name: 'Scorpio',
    symbol: 'Scorpio',
    dates: 'Oct 23 - Nov 21',
    accent: '#ff836b',
    note: 'Low and dramatic, Scorpius arcs through Antares before curling into its hooked tail.',
    brightestStarName: 'Antares',
  },
  {
    key: 'sagittarius',
    iau: 'Sgr',
    name: 'Sagittarius',
    symbol: 'Sagittarius',
    dates: 'Nov 22 - Dec 21',
    accent: '#7fd0c9',
    note: 'Commonly read as the teapot asterism, sitting in the dense Milky Way star fields.',
    brightestStarName: 'Kaus Australis',
  },
  {
    key: 'capricorn',
    iau: 'Cap',
    name: 'Capricorn',
    symbol: 'Capricorn',
    dates: 'Dec 22 - Jan 19',
    accent: '#d4c5b2',
    note: 'Capricornus forms a broad sea-goat triangle that stays low for northern observers.',
    brightestStarName: 'Deneb Algedi',
  },
  {
    key: 'aquarius',
    iau: 'Aqr',
    name: 'Aquarius',
    symbol: 'Aquarius',
    dates: 'Jan 20 - Feb 18',
    accent: '#88c0f0',
    note: 'A long, modest zigzag whose geometry reads better in a darker sky than in city light.',
    brightestStarName: 'Sadalsuud',
  },
  {
    key: 'pisces',
    iau: 'Psc',
    name: 'Pisces',
    symbol: 'Pisces',
    dates: 'Feb 19 - Mar 20',
    accent: '#89b1ff',
    note: 'Two loose fish loops connected by a long cord across a broad patch of sky.',
    brightestStarName: 'Eta Piscium',
  },
]

const popularConstellationSeeds: ConstellationSeed[] = [
  {
    key: 'orion',
    iau: 'Ori',
    name: 'Orion',
    symbol: 'Orion',
    dates: 'Northern winter',
    accent: '#9ec1ff',
    note: 'The hunter is one of the clearest patterns in the sky, anchored by the belt, Rigel, and Betelgeuse.',
    brightestStarName: 'Rigel',
  },
  {
    key: 'ursa-major',
    iau: 'UMa',
    name: 'Ursa Major',
    symbol: 'Ursa Major',
    dates: 'Northern spring',
    accent: '#c3d6ff',
    note: 'Home to the Big Dipper, Ursa Major is a wide northern pattern that helps spring sky navigation.',
    brightestStarName: 'Alioth',
  },
  {
    key: 'ursa-minor',
    iau: 'UMi',
    name: 'Ursa Minor',
    symbol: 'Ursa Minor',
    dates: 'Circumpolar north',
    accent: '#d3e2ff',
    note: 'Ursa Minor wraps around Polaris, making it one of the most useful orientation patterns in the sky.',
    brightestStarName: 'Polaris',
  },
  {
    key: 'cassiopeia',
    iau: 'Cas',
    name: 'Cassiopeia',
    symbol: 'Cassiopeia',
    dates: 'Northern autumn',
    accent: '#d2c1ff',
    note: 'Cassiopeia is the unmistakable W-shaped constellation opposite the Big Dipper across the north pole.',
    brightestStarName: 'Schedar',
  },
  {
    key: 'cygnus',
    iau: 'Cyg',
    name: 'Cygnus',
    symbol: 'Cygnus',
    dates: 'Northern summer',
    accent: '#8fd2ff',
    note: 'Cygnus traces the Northern Cross through rich Milky Way star fields, led by bright Deneb.',
    brightestStarName: 'Deneb',
  },
  {
    key: 'canis-major',
    iau: 'CMa',
    name: 'Canis Major',
    symbol: 'Canis Major',
    dates: 'Northern winter',
    accent: '#b8dcff',
    note: 'Canis Major carries Sirius, the brightest star in the night sky, low in the southern winter sky.',
    brightestStarName: 'Sirius',
  },
]

const allConstellationSeeds = [...zodiacSeeds, ...popularConstellationSeeds]
const popularConstellationKeySet = new Set(popularConstellationSeeds.map((seed) => seed.key))

const featuredStarSeeds: FeaturedStarSeed[] = [
  {
    name: 'Polaris',
    constellation: 'Ursa Minor',
    color: '#d7e5ff',
    priority: 5,
    zodiacSignKey: 'ursa-minor',
  },
  {
    name: 'Sirius',
    constellation: 'Canis Major',
    color: '#f7fbff',
    priority: 5,
    zodiacSignKey: 'canis-major',
  },
  {
    name: 'Capella',
    constellation: 'Auriga',
    color: '#ffe6c2',
    priority: 4,
  },
  {
    name: 'Betelgeuse',
    constellation: 'Orion',
    color: '#ffd3c2',
    priority: 4,
    zodiacSignKey: 'orion',
  },
  {
    name: 'Rigel',
    constellation: 'Orion',
    color: '#d7e5ff',
    priority: 4,
    zodiacSignKey: 'orion',
  },
  {
    name: 'Aldebaran',
    constellation: 'Taurus',
    color: '#ffd7af',
    priority: 4,
    zodiacSignKey: 'taurus',
  },
  {
    name: 'Procyon',
    constellation: 'Canis Minor',
    color: '#f3f7ff',
    priority: 3,
  },
  {
    name: 'Pollux',
    constellation: 'Gemini',
    color: '#ffe5bf',
    priority: 3,
    zodiacSignKey: 'gemini',
  },
  {
    name: 'Regulus',
    constellation: 'Leo',
    color: '#f6f7ff',
    priority: 3,
    zodiacSignKey: 'leo',
  },
  {
    name: 'Spica',
    constellation: 'Virgo',
    color: '#dce8ff',
    priority: 3,
    zodiacSignKey: 'virgo',
  },
  {
    name: 'Arcturus',
    constellation: 'Bootes',
    color: '#ffe2bc',
    priority: 5,
  },
  {
    name: 'Antares',
    constellation: 'Scorpius',
    color: '#ffb9a0',
    priority: 4,
    zodiacSignKey: 'scorpio',
  },
  {
    name: 'Vega',
    constellation: 'Lyra',
    color: '#d7e5ff',
    priority: 5,
  },
  {
    name: 'Deneb',
    constellation: 'Cygnus',
    color: '#e6f0ff',
    priority: 4,
    zodiacSignKey: 'cygnus',
  },
  {
    name: 'Altair',
    constellation: 'Aquila',
    color: '#f5f7ff',
    priority: 4,
  },
  {
    name: 'Fomalhaut',
    constellation: 'Piscis Austrinus',
    color: '#d7e5ff',
    priority: 3,
  },
  {
    name: 'Alioth',
    constellation: 'Ursa Major',
    color: '#e9f1ff',
    priority: 4,
    zodiacSignKey: 'ursa-major',
  },
  {
    name: 'Schedar',
    constellation: 'Cassiopeia',
    color: '#ffe4d4',
    priority: 4,
    zodiacSignKey: 'cassiopeia',
  },
]

type StellariumConstellation = {
  iau: string
  common_name?: {
    english?: string
    native?: string
  }
  lines: Array<Array<number | string>>
}

type SesameResult = {
  raDegrees: number
  decDegrees: number
}

type WikipediaSummary = {
  description: string | null
  extract: string | null
  imageUrl: string | null
  imageLicenseName: string | null
  imageLicenseUrl: string | null
  imageAttribution: string | null
  imageSourceUrl: string | null
}

type HipRow = {
  hipId: number
  magnitude: number
  ra: number
  dec: number
}

export async function syncSkyCatalog(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'Supabase database is not configured. Add a Postgres connection string before syncing.',
    )
  }

  const stellarium = await fetchWesternConstellationCatalog()
  const constellationEntries = allConstellationSeeds.map((seed) => {
    const constellation = stellarium.get(seed.iau)

    if (!constellation) {
      throw new Error(`Missing Stellarium constellation for ${seed.iau}.`)
    }

    const { starHipIds, edgeHipPairs } = extractConstellationLineData(constellation.lines)
    return {
      ...seed,
      starHipIds,
      edgeHipPairs,
    }
  })

  const constellationHipIds = Array.from(
    new Set(constellationEntries.flatMap((entry) => entry.starHipIds)),
  )
  const lineStars = Array.from((await fetchConstellationLineStars(constellationHipIds)).values())
  const fieldStars = await fetchBrightFieldStars(BRIGHT_STAR_MAGNITUDE_LIMIT)
  const starRows = dedupeStarRows([...lineStars, ...fieldStars])

  const constellationRecords = await Promise.all(
    constellationEntries.map(async (entry) => {
      const starRecords = entry.starHipIds
        .map((hipId) => starRows.get(hipId))
        .filter((row): row is HipRow => row !== undefined)
      const centerRa = getCircularMeanDegrees(starRecords.map((star) => star.ra)) / 15
      const centerDec =
        starRecords.reduce((sum, star) => sum + star.dec, 0) / Math.max(starRecords.length, 1)
      const brightestSummary = await fetchWikipediaSummary(
        entry.brightestStarWikiTitle ?? entry.brightestStarName,
      )

      return {
        key: entry.key,
        iau: entry.iau,
        name: entry.name,
        symbol: entry.symbol,
        dates: entry.dates,
        accent: entry.accent,
        note: entry.note,
        brightestStarName: entry.brightestStarName,
        brightestStarSubtitle: brightestSummary.description,
        brightestStarSummary: brightestSummary.extract,
        brightestStarImageUrl: brightestSummary.imageUrl,
        brightestStarImageLicenseName: brightestSummary.imageLicenseName,
        brightestStarImageLicenseUrl: brightestSummary.imageLicenseUrl,
        brightestStarImageAttribution: brightestSummary.imageAttribution,
        brightestStarImageSourceUrl: brightestSummary.imageSourceUrl,
        centerRa,
        centerDec,
        starHipIdsJson: JSON.stringify(entry.starHipIds),
        edgeHipPairsJson: JSON.stringify(entry.edgeHipPairs),
      }
    }),
  )

  const featuredStarRecords = await Promise.all(
    featuredStarSeeds.map(async (seed) => {
      const coords = await resolveStarCoordinates(seed.name)
      const summary = await fetchWikipediaSummary(seed.wikiTitle ?? seed.name)

      return {
        name: seed.name,
        wikiTitle: seed.wikiTitle ?? seed.name,
        constellation: seed.constellation,
        zodiacSignKey: seed.zodiacSignKey ?? null,
        color: seed.color,
        priority: seed.priority,
        ra: coords.raDegrees / 15,
        dec: coords.decDegrees,
        fact:
          summary.extract ??
          `${seed.name} is a highlighted guide star in ${seed.constellation}.`,
        imageUrl: summary.imageUrl,
        imageLicenseName: summary.imageLicenseName,
        imageLicenseUrl: summary.imageLicenseUrl,
        imageAttribution: summary.imageAttribution,
        imageSourceUrl: summary.imageSourceUrl,
      }
    }),
  )

  await transaction(async (db) => {
    await db.execute('DELETE FROM "Constellation"')
    await db.execute('DELETE FROM "Star"')
    await db.execute('DELETE FROM "FeaturedStar"')

    for (const star of Array.from(starRows.values())) {
      await db.execute(
        `
          INSERT INTO "Star" ("hipId", "ra", "dec", "magnitude")
          VALUES (?, ?, ?, ?)
        `,
        [star.hipId, star.ra / 15, star.dec, star.magnitude],
      )
    }

    for (const record of constellationRecords) {
      await db.execute(
        `
          INSERT INTO "Constellation" (
            "key",
            "iau",
            "name",
            "symbol",
            "dates",
            "accent",
            "note",
            "brightestStarName",
            "brightestStarSubtitle",
            "brightestStarSummary",
            "brightestStarImageUrl",
            "brightestStarImageLicenseName",
            "brightestStarImageLicenseUrl",
            "brightestStarImageAttribution",
            "brightestStarImageSourceUrl",
            "centerRa",
            "centerDec",
            "starHipIdsJson",
            "edgeHipPairsJson"
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          record.key,
          record.iau,
          record.name,
          record.symbol,
          record.dates,
          record.accent,
          record.note,
          record.brightestStarName,
          record.brightestStarSubtitle ?? null,
          record.brightestStarSummary ?? null,
          record.brightestStarImageUrl ?? null,
          record.brightestStarImageLicenseName ?? null,
          record.brightestStarImageLicenseUrl ?? null,
          record.brightestStarImageAttribution ?? null,
          record.brightestStarImageSourceUrl ?? null,
          record.centerRa,
          record.centerDec,
          record.starHipIdsJson,
          record.edgeHipPairsJson,
        ],
      )
    }

    for (const record of featuredStarRecords) {
      await db.execute(
        `
          INSERT INTO "FeaturedStar" (
            "name",
            "wikiTitle",
            "constellation",
            "zodiacSignKey",
            "color",
            "priority",
            "ra",
            "dec",
            "fact",
            "imageUrl",
            "imageLicenseName",
            "imageLicenseUrl",
            "imageAttribution",
            "imageSourceUrl"
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          record.name,
          record.wikiTitle ?? null,
          record.constellation,
          record.zodiacSignKey ?? null,
          record.color,
          record.priority,
          record.ra,
          record.dec,
          record.fact,
          record.imageUrl ?? null,
          record.imageLicenseName ?? null,
          record.imageLicenseUrl ?? null,
          record.imageAttribution ?? null,
          record.imageSourceUrl ?? null,
        ],
      )
    }

    await db.execute(
      `
        INSERT INTO "SyncState" ("key", "checksum")
        VALUES (?, ?)
        ON CONFLICT("key") DO UPDATE SET
          "checksum" = excluded."checksum",
          "updatedAt" = CURRENT_TIMESTAMP
      `,
      ['sky-catalog', `field:${fieldStars.length}|line:${lineStars.length}`],
    )
  })
}

export async function syncPopularConstellations(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'Supabase database is not configured. Add a Postgres connection string before syncing.',
    )
  }

  const stellarium = await fetchWesternConstellationCatalog()
  const constellationEntries = popularConstellationSeeds.map((seed) => {
    const constellation = stellarium.get(seed.iau)

    if (!constellation) {
      throw new Error(`Missing Stellarium constellation for ${seed.iau}.`)
    }

    const { starHipIds, edgeHipPairs } = extractConstellationLineData(constellation.lines)

    return {
      ...seed,
      starHipIds,
      edgeHipPairs,
    }
  })

  const constellationHipIds = Array.from(
    new Set(constellationEntries.flatMap((entry) => entry.starHipIds)),
  )
  const starRows = await fetchConstellationLineStars(constellationHipIds)

  const constellationRecords = await Promise.all(
    constellationEntries.map(async (entry) => {
      const starRecords = entry.starHipIds
        .map((hipId) => starRows.get(hipId))
        .filter((row): row is HipRow => row !== undefined)
      const centerRa = getCircularMeanDegrees(starRecords.map((star) => star.ra)) / 15
      const centerDec =
        starRecords.reduce((sum, star) => sum + star.dec, 0) / Math.max(starRecords.length, 1)
      const brightestSummary = await fetchWikipediaSummary(
        entry.brightestStarWikiTitle ?? entry.brightestStarName,
      )

      return {
        key: entry.key,
        iau: entry.iau,
        name: entry.name,
        symbol: entry.symbol,
        dates: entry.dates,
        accent: entry.accent,
        note: entry.note,
        brightestStarName: entry.brightestStarName,
        brightestStarSubtitle: brightestSummary.description,
        brightestStarSummary: brightestSummary.extract,
        brightestStarImageUrl: brightestSummary.imageUrl,
        brightestStarImageLicenseName: brightestSummary.imageLicenseName,
        brightestStarImageLicenseUrl: brightestSummary.imageLicenseUrl,
        brightestStarImageAttribution: brightestSummary.imageAttribution,
        brightestStarImageSourceUrl: brightestSummary.imageSourceUrl,
        centerRa,
        centerDec,
        starHipIdsJson: JSON.stringify(entry.starHipIds),
        edgeHipPairsJson: JSON.stringify(entry.edgeHipPairs),
      }
    }),
  )
  const popularFeaturedStarRecords = await Promise.all(
    featuredStarSeeds
      .filter((seed) => seed.zodiacSignKey && popularConstellationKeySet.has(seed.zodiacSignKey))
      .map(async (seed) => {
        const coords = await resolveStarCoordinates(seed.name)
        const summary = await fetchWikipediaSummary(seed.wikiTitle ?? seed.name)

        return {
          name: seed.name,
          wikiTitle: seed.wikiTitle ?? seed.name,
          constellation: seed.constellation,
          zodiacSignKey: seed.zodiacSignKey ?? null,
          color: seed.color,
          priority: seed.priority,
          ra: coords.raDegrees / 15,
          dec: coords.decDegrees,
          fact:
            summary.extract ??
            `${seed.name} is a highlighted guide star in ${seed.constellation}.`,
          imageUrl: summary.imageUrl,
          imageLicenseName: summary.imageLicenseName,
          imageLicenseUrl: summary.imageLicenseUrl,
          imageAttribution: summary.imageAttribution,
          imageSourceUrl: summary.imageSourceUrl,
        }
      }),
  )

  await transaction(async (db) => {
    for (const star of Array.from(starRows.values())) {
      await db.execute(
        `
          INSERT INTO "Star" ("hipId", "ra", "dec", "magnitude")
          VALUES (?, ?, ?, ?)
          ON CONFLICT("hipId") DO UPDATE SET
            "ra" = excluded."ra",
            "dec" = excluded."dec",
            "magnitude" = excluded."magnitude",
            "updatedAt" = CURRENT_TIMESTAMP
        `,
        [star.hipId, star.ra / 15, star.dec, star.magnitude],
      )
    }

    for (const record of constellationRecords) {
      await db.execute(
        `
          INSERT INTO "Constellation" (
            "key",
            "iau",
            "name",
            "symbol",
            "dates",
            "accent",
            "note",
            "brightestStarName",
            "brightestStarSubtitle",
            "brightestStarSummary",
            "brightestStarImageUrl",
            "brightestStarImageLicenseName",
            "brightestStarImageLicenseUrl",
            "brightestStarImageAttribution",
            "brightestStarImageSourceUrl",
            "centerRa",
            "centerDec",
            "starHipIdsJson",
            "edgeHipPairsJson"
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT("key") DO UPDATE SET
            "iau" = excluded."iau",
            "name" = excluded."name",
            "symbol" = excluded."symbol",
            "dates" = excluded."dates",
            "accent" = excluded."accent",
            "note" = excluded."note",
            "brightestStarName" = excluded."brightestStarName",
            "brightestStarSubtitle" = excluded."brightestStarSubtitle",
            "brightestStarSummary" = excluded."brightestStarSummary",
            "brightestStarImageUrl" = excluded."brightestStarImageUrl",
            "brightestStarImageLicenseName" = excluded."brightestStarImageLicenseName",
            "brightestStarImageLicenseUrl" = excluded."brightestStarImageLicenseUrl",
            "brightestStarImageAttribution" = excluded."brightestStarImageAttribution",
            "brightestStarImageSourceUrl" = excluded."brightestStarImageSourceUrl",
            "centerRa" = excluded."centerRa",
            "centerDec" = excluded."centerDec",
            "starHipIdsJson" = excluded."starHipIdsJson",
            "edgeHipPairsJson" = excluded."edgeHipPairsJson",
            "updatedAt" = CURRENT_TIMESTAMP
        `,
        [
          record.key,
          record.iau,
          record.name,
          record.symbol,
          record.dates,
          record.accent,
          record.note,
          record.brightestStarName,
          record.brightestStarSubtitle ?? null,
          record.brightestStarSummary ?? null,
          record.brightestStarImageUrl ?? null,
          record.brightestStarImageLicenseName ?? null,
          record.brightestStarImageLicenseUrl ?? null,
          record.brightestStarImageAttribution ?? null,
          record.brightestStarImageSourceUrl ?? null,
          record.centerRa,
          record.centerDec,
          record.starHipIdsJson,
          record.edgeHipPairsJson,
        ],
      )
    }

    for (const record of popularFeaturedStarRecords) {
      await db.execute(
        `
          INSERT INTO "FeaturedStar" (
            "name",
            "wikiTitle",
            "constellation",
            "zodiacSignKey",
            "color",
            "priority",
            "ra",
            "dec",
            "fact",
            "imageUrl",
            "imageLicenseName",
            "imageLicenseUrl",
            "imageAttribution",
            "imageSourceUrl"
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT("name") DO UPDATE SET
            "wikiTitle" = excluded."wikiTitle",
            "constellation" = excluded."constellation",
            "zodiacSignKey" = excluded."zodiacSignKey",
            "color" = excluded."color",
            "priority" = excluded."priority",
            "ra" = excluded."ra",
            "dec" = excluded."dec",
            "fact" = excluded."fact",
            "imageUrl" = excluded."imageUrl",
            "imageLicenseName" = excluded."imageLicenseName",
            "imageLicenseUrl" = excluded."imageLicenseUrl",
            "imageAttribution" = excluded."imageAttribution",
            "imageSourceUrl" = excluded."imageSourceUrl",
            "updatedAt" = CURRENT_TIMESTAMP
        `,
        [
          record.name,
          record.wikiTitle ?? null,
          record.constellation,
          record.zodiacSignKey ?? null,
          record.color,
          record.priority,
          record.ra,
          record.dec,
          record.fact,
          record.imageUrl ?? null,
          record.imageLicenseName ?? null,
          record.imageLicenseUrl ?? null,
          record.imageAttribution ?? null,
          record.imageSourceUrl ?? null,
        ],
      )
    }

    await db.execute(
      `
        INSERT INTO "SyncState" ("key", "checksum")
        VALUES (?, ?)
        ON CONFLICT("key") DO UPDATE SET
          "checksum" = excluded."checksum",
          "updatedAt" = CURRENT_TIMESTAMP
      `,
      [
        'sky-popular-constellations',
        `count:${constellationRecords.length}|stars:${starRows.size}|guides:${popularFeaturedStarRecords.length}`,
      ],
    )
  })
}

export async function syncSkyImageMetadata(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'Supabase database is not configured. Add a Postgres connection string before syncing.',
    )
  }

  const brightestTitleByKey = new Map(
    allConstellationSeeds.map((seed) => [seed.key, seed.brightestStarWikiTitle ?? seed.brightestStarName]),
  )
  const constellations = await queryAll<{
    key: string
    brightestStarName: string
  }>('SELECT "key", "brightestStarName" FROM "Constellation"')
  const featuredStars = await queryAll<{
    name: string
    wikiTitle: string | null
  }>('SELECT "name", "wikiTitle" FROM "FeaturedStar"')

  for (const constellation of constellations) {
    const title =
      brightestTitleByKey.get(constellation.key) ?? constellation.brightestStarName
    const summary = await fetchWikipediaSummary(title)

    await execute(
      `
        UPDATE "Constellation"
        SET
          "brightestStarImageUrl" = ?,
          "brightestStarImageLicenseName" = ?,
          "brightestStarImageLicenseUrl" = ?,
          "brightestStarImageAttribution" = ?,
          "brightestStarImageSourceUrl" = ?
        WHERE "key" = ?
      `,
      [
        summary.imageUrl,
        summary.imageLicenseName,
        summary.imageLicenseUrl,
        summary.imageAttribution,
        summary.imageSourceUrl,
        constellation.key,
      ],
    )
  }

  for (const star of featuredStars) {
    const title = star.wikiTitle ?? star.name
    const summary = await fetchWikipediaSummary(title)

    await execute(
      `
        UPDATE "FeaturedStar"
        SET
          "imageUrl" = ?,
          "imageLicenseName" = ?,
          "imageLicenseUrl" = ?,
          "imageAttribution" = ?,
          "imageSourceUrl" = ?
        WHERE "name" = ?
      `,
      [
        summary.imageUrl,
        summary.imageLicenseName,
        summary.imageLicenseUrl,
        summary.imageAttribution,
        summary.imageSourceUrl,
        star.name,
      ],
    )
  }
}

export async function isSkyCatalogEmpty(): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return true
  }

  const result = queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM "Constellation"')
  return ((await result)?.count ?? 0) === 0
}

async function fetchWesternConstellationCatalog(): Promise<Map<string, StellariumConstellation>> {
  const response = await fetchWithRetry(STELLARIUM_WESTERN_URL, {
    headers: {
      'user-agent': USER_AGENT,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Stellarium catalog: ${response.status}`)
  }

  const json = (await response.json()) as {
    constellations: Record<string, StellariumConstellation>
  }

  return new Map(
    Object.values(json.constellations)
      .filter((entry) => allConstellationSeeds.some((seed) => seed.iau === entry.iau))
      .map((entry) => [entry.iau, entry]),
  )
}

async function fetchHipparcosStarsByHipIds(hipIds: number[]): Promise<HipRow[]> {
  if (hipIds.length === 0) {
    return []
  }

  const rows: HipRow[] = []
  const uniqueHipIds = Array.from(new Set(hipIds))

  for (let index = 0; index < uniqueHipIds.length; index += 40) {
    const chunk = uniqueHipIds.slice(index, index + 40)
    const query = `
      SELECT HIP, Vmag, RAICRS, DEICRS
      FROM "I/239/hip_main"
      WHERE HIP IN (${chunk.join(',')})
    `

    rows.push(...(await fetchHipparcosQuery(query)))
  }

  return rows
}

async function fetchConstellationLineStars(hipIds: number[]): Promise<Map<number, HipRow>> {
  const uniqueHipIds = Array.from(new Set(hipIds))
  const storedRows = await fetchStoredStarsByHipIds(uniqueHipIds)
  const storedMap = new Map(storedRows.map((row) => [row.hipId, row]))
  const missingHipIds = uniqueHipIds.filter((hipId) => !storedMap.has(hipId))

  if (missingHipIds.length === 0) {
    return dedupeStarRows(storedRows)
  }

  let fetchedRows: HipRow[] = []

  try {
    fetchedRows = await fetchHipparcosStarsByHipIds(missingHipIds)
  } catch {
    fetchedRows = []
  }

  const fetchedMap = new Map(fetchedRows.map((row) => [row.hipId, row]))
  const unresolvedHipIds = missingHipIds.filter((hipId) => !fetchedMap.has(hipId))
  const fallbackRows = await Promise.all(
    unresolvedHipIds.map((hipId) => fetchFallbackHipparcosStar(hipId)),
  )

  return dedupeStarRows([
    ...storedRows,
    ...fetchedRows,
    ...fallbackRows.filter((row): row is HipRow => row !== null),
  ])
}

async function fetchStoredStarsByHipIds(hipIds: number[]): Promise<HipRow[]> {
  if (hipIds.length === 0) {
    return []
  }

  const rows = await queryAll<{
    hipId: number
    ra: number
    dec: number
    magnitude: number
  }>(`
    SELECT "hipId", "ra", "dec", "magnitude"
    FROM "Star"
    WHERE "hipId" IN (${hipIds.join(',')})
  `)

  return rows.map((row) => ({
    hipId: row.hipId,
    ra: row.ra * 15,
    dec: row.dec,
    magnitude: row.magnitude,
  }))
}

async function fetchBrightFieldStars(maxMagnitude: number): Promise<HipRow[]> {
  const query = `
    SELECT HIP, Vmag, RAICRS, DEICRS
    FROM "I/239/hip_main"
    WHERE Vmag IS NOT NULL AND Vmag <= ${maxMagnitude}
  `

  return fetchHipparcosQuery(query)
}

async function fetchHipparcosQuery(query: string): Promise<HipRow[]> {
  const url =
    `${VIZIER_TAP_URL}?request=doQuery&lang=ADQL&format=json&query=` +
    encodeURIComponent(query)
  const response = await fetchWithRetry(url, {
    headers: {
      'user-agent': USER_AGENT,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to query VizieR TAP: ${response.status}`)
  }

  const json = (await response.json()) as {
    data: Array<[number, number | null, number, number]>
  }

  return json.data
    .filter((row) => row[0] != null && row[2] != null && row[3] != null)
    .map(([hipId, magnitude, ra, dec]) => ({
      hipId,
      magnitude: magnitude ?? 6,
      ra,
      dec,
    }))
}

async function resolveStarCoordinates(name: string): Promise<SesameResult> {
  const response = await fetchWithRetry(`${SESAME_URL}${encodeURIComponent(name)}`, {
    headers: {
      'user-agent': USER_AGENT,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to resolve ${name} via Sesame: ${response.status}`)
  }

  const xml = await response.text()
  const raMatch = xml.match(/<jradeg>([^<]+)<\/jradeg>/)
  const decMatch = xml.match(/<jdedeg>([^<]+)<\/jdedeg>/)

  if (!raMatch || !decMatch) {
    throw new Error(`No Sesame coordinates found for ${name}.`)
  }

  return {
    raDegrees: Number(raMatch[1]),
    decDegrees: Number(decMatch[1]),
  }
}

async function fetchFallbackHipparcosStar(hipId: number): Promise<HipRow | null> {
  try {
    const coords = await resolveStarCoordinates(`HIP ${hipId}`)

    return {
      hipId,
      ra: coords.raDegrees,
      dec: coords.decDegrees,
      magnitude: 5.6,
    }
  } catch {
    return null
  }
}

async function fetchWikipediaSummary(title: string): Promise<WikipediaSummary> {
  const response = await fetchWithRetry(`${WIKIPEDIA_SUMMARY_URL}/${encodeURIComponent(title)}`, {
    headers: {
      'user-agent': USER_AGENT,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return {
      description: null,
      extract: null,
      imageUrl: null,
      imageLicenseName: null,
      imageLicenseUrl: null,
      imageAttribution: null,
      imageSourceUrl: null,
    }
  }

  const json = (await response.json()) as {
    description?: string
    extract?: string
    thumbnail?: {
      source?: string
    }
    originalimage?: {
      source?: string
    }
  }
  const openImage = await fetchOpenLicensedPageImage(title)

  return {
    description: json.description ?? null,
    extract: json.extract ?? null,
    imageUrl: openImage?.imageUrl ?? null,
    imageLicenseName: openImage?.licenseName ?? null,
    imageLicenseUrl: openImage?.licenseUrl ?? null,
    imageAttribution: openImage?.attribution ?? null,
    imageSourceUrl: openImage?.sourceUrl ?? null,
  }
}

type OpenLicensedImage = {
  imageUrl: string
  licenseName: string | null
  licenseUrl: string | null
  attribution: string | null
  sourceUrl: string | null
}

async function fetchOpenLicensedPageImage(title: string): Promise<OpenLicensedImage | null> {
  try {
    const fileTitle = await fetchWikipediaLeadImageTitle(title)

    if (!fileTitle) {
      return null
    }

    const response = await fetchWithRetry(
      `${WIKIPEDIA_ACTION_URL}?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&redirects=1&titles=${encodeURIComponent(fileTitle)}`,
      {
        headers: {
          'user-agent': USER_AGENT,
        },
        cache: 'no-store',
      },
    )

    if (!response.ok) {
      return null
    }

    const json = (await response.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            imageinfo?: Array<{
              url?: string
              descriptionurl?: string
              extmetadata?: Record<
                string,
                {
                  value?: string
                }
              >
            }>
          }
        >
      }
    }
    const page = Object.values(json.query?.pages ?? {})[0]
    const image = page?.imageinfo?.[0]

    if (!image?.url) {
      return null
    }

    const metadata = image.extmetadata ?? {}

    if (!isApprovedOpenLicense(metadata)) {
      return null
    }

    return {
      imageUrl: image.url,
      licenseName:
        extractMetadataText(metadata.LicenseShortName) ??
        extractMetadataText(metadata.UsageTerms) ??
        null,
      licenseUrl: extractMetadataText(metadata.LicenseUrl) ?? null,
      attribution: buildImageAttribution(metadata),
      sourceUrl: image.descriptionurl ?? null,
    }
  } catch {
    return null
  }
}

async function fetchWikipediaLeadImageTitle(title: string): Promise<string | null> {
  const response = await fetchWithRetry(
    `${WIKIPEDIA_ACTION_URL}?action=query&format=json&prop=pageimages&piprop=name|original&redirects=1&titles=${encodeURIComponent(title)}`,
    {
      headers: {
        'user-agent': USER_AGENT,
      },
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    return null
  }

  const json = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          pageimage?: string
        }
      >
    }
  }
  const page = Object.values(json.query?.pages ?? {})[0]
  const pageImage = page?.pageimage?.trim()

  if (!pageImage) {
    return null
  }

  return pageImage.startsWith('File:') ? pageImage : `File:${pageImage}`
}

function isApprovedOpenLicense(
  metadata: Record<
    string,
    {
      value?: string
    }
  >,
): boolean {
  const candidates = [
    extractMetadataText(metadata.License),
    extractMetadataText(metadata.LicenseShortName),
    extractMetadataText(metadata.UsageTerms),
    extractMetadataText(metadata.LicenseUrl),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase())
  const restrictions = (extractMetadataText(metadata.Restrictions) ?? '').trim().toLowerCase()
  const hasBlockedTerms = candidates.some(
    (value) =>
      value.includes('fair use') ||
      value.includes('all rights reserved') ||
      value.includes('noncommercial') ||
      value.includes('no derivatives') ||
      value.includes('by-nc') ||
      value.includes('by-nd') ||
      value.includes('by-nc-sa') ||
      value.includes('by-nc-nd'),
  )
  const hasAllowedTerms = candidates.some(
    (value) =>
      value.includes('creativecommons.org/licenses/by/') ||
      value.includes('creativecommons.org/licenses/by-sa/') ||
      value.includes('creativecommons.org/publicdomain/zero/1.0') ||
      value.includes('creativecommons.org/publicdomain/mark/1.0') ||
      value.includes('cc by') ||
      value.includes('cc-by') ||
      value.includes('cc by-sa') ||
      value.includes('cc-by-sa') ||
      value.includes('cc0') ||
      value.startsWith('pd') ||
      value.includes('public domain') ||
      value.includes('gfdl') ||
      value.includes('gnu free documentation license') ||
      value.includes('free art license'),
  )

  return hasAllowedTerms && !hasBlockedTerms && restrictions.length === 0
}

function buildImageAttribution(
  metadata: Record<
    string,
    {
      value?: string
    }
  >,
): string | null {
  const artist = extractMetadataText(metadata.Artist)
  const credit = extractMetadataText(metadata.Credit)

  if (artist && credit && artist !== credit) {
    return `${artist} / ${credit}`
  }

  return artist ?? credit ?? null
}

function extractMetadataText(field?: { value?: string }): string | null {
  const value = field?.value?.trim()

  if (!value) {
    return null
  }

  const withoutTags = value.replace(/<[^>]*>/g, ' ')
  const decoded = withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()

  return decoded || null
}

async function fetchWithRetry(
  input: string,
  init: RequestInit,
  attempts = 4,
): Promise<Response> {
  let lastResponse: Response | null = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(input, init)

    if (response.ok || !shouldRetryStatus(response.status) || attempt === attempts) {
      return response
    }

    lastResponse = response
    await wait(400 * 2 ** (attempt - 1))
  }

  if (lastResponse) {
    return lastResponse
  }

  throw new Error(`Failed to fetch ${input}.`)
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getCircularMeanDegrees(angles: number[]): number {
  if (angles.length === 0) {
    return 0
  }

  const vector = angles.reduce(
    (sum, angle) => {
      const radians = (angle * Math.PI) / 180

      return {
        x: sum.x + Math.cos(radians),
        y: sum.y + Math.sin(radians),
      }
    },
    { x: 0, y: 0 },
  )

  if (Math.abs(vector.x) < 1e-6 && Math.abs(vector.y) < 1e-6) {
    return normalizeDegrees(angles[0] ?? 0)
  }

  return normalizeDegrees((Math.atan2(vector.y, vector.x) * 180) / Math.PI)
}

function normalizeDegrees(angle: number): number {
  return ((angle % 360) + 360) % 360
}

function extractConstellationLineData(
  lines: Array<Array<number | string>>,
): {
  starHipIds: number[]
  edgeHipPairs: Array<[number, number]>
} {
  const starHipIds = new Set<number>()
  const edgeHipPairs: Array<[number, number]> = []

  lines.forEach((line) => {
    let previousHipId: number | null = null

    line.forEach((point) => {
      if (typeof point !== 'number' || !Number.isFinite(point)) {
        previousHipId = null
        return
      }

      starHipIds.add(point)

      if (previousHipId != null) {
        edgeHipPairs.push([previousHipId, point])
      }

      previousHipId = point
    })
  })

  return {
    starHipIds: Array.from(starHipIds),
    edgeHipPairs,
  }
}

function dedupeStarRows(rows: HipRow[]): Map<number, HipRow> {
  const map = new Map<number, HipRow>()

  rows.forEach((row) => {
    const existing = map.get(row.hipId)

    if (!existing || row.magnitude < existing.magnitude) {
      map.set(row.hipId, row)
    }
  })

  return map
}
