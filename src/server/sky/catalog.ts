import { queryFirst, transaction } from '@/server/db'
import { isDatabaseConfigured } from '@/server/db/config'

type ZodiacSeed = {
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
const WIKIPEDIA_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary'
const SESAME_URL = 'https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/~SNV?'
const VIZIER_TAP_URL = 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync'
const BRIGHT_STAR_MAGNITUDE_LIMIT = 4.8

const zodiacSeeds: ZodiacSeed[] = [
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

const featuredStarSeeds: FeaturedStarSeed[] = [
  {
    name: 'Polaris',
    constellation: 'Ursa Minor',
    color: '#d7e5ff',
    priority: 5,
  },
  {
    name: 'Sirius',
    constellation: 'Canis Major',
    color: '#f7fbff',
    priority: 5,
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
  },
  {
    name: 'Rigel',
    constellation: 'Orion',
    color: '#d7e5ff',
    priority: 4,
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
]

type StellariumConstellation = {
  iau: string
  common_name?: {
    english?: string
    native?: string
  }
  lines: number[][]
}

type SesameResult = {
  raDegrees: number
  decDegrees: number
}

type WikipediaSummary = {
  description: string | null
  extract: string | null
  imageUrl: string | null
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

  const stellarium = await fetchWesternZodiacCatalog()
  const zodiacEntries = zodiacSeeds.map((seed) => {
    const constellation = stellarium.get(seed.iau)

    if (!constellation) {
      throw new Error(`Missing Stellarium constellation for ${seed.iau}.`)
    }

    const starHipIds = Array.from(new Set(constellation.lines.flat()))
    const edgeHipPairs = constellation.lines.flatMap((line) =>
      line.slice(0, -1).map((startHipId, index) => [startHipId, line[index + 1]] as [number, number]),
    )
    return {
      ...seed,
      commonName: constellation.common_name?.english ?? seed.name,
      starHipIds,
      edgeHipPairs,
    }
  })

  const zodiacHipIds = Array.from(new Set(zodiacEntries.flatMap((entry) => entry.starHipIds)))
  const lineStars = await fetchHipparcosStarsByHipIds(zodiacHipIds)
  const fieldStars = await fetchBrightFieldStars(BRIGHT_STAR_MAGNITUDE_LIMIT)
  const starRows = dedupeStarRows([...lineStars, ...fieldStars])

  const constellationRecords = await Promise.all(
    zodiacEntries.map(async (entry) => {
      const starRecords = entry.starHipIds
        .map((hipId) => starRows.get(hipId))
        .filter((row): row is HipRow => row !== undefined)
      const centerRa =
        starRecords.reduce((sum, star) => sum + star.ra, 0) / Math.max(starRecords.length, 1)
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
            "centerRa",
            "centerDec",
            "starHipIdsJson",
            "edgeHipPairsJson"
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            "imageUrl"
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

export async function isSkyCatalogEmpty(): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return true
  }

  const result = queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM "Constellation"')
  return ((await result)?.count ?? 0) === 0
}

async function fetchWesternZodiacCatalog(): Promise<Map<string, StellariumConstellation>> {
  const response = await fetch(STELLARIUM_WESTERN_URL, {
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
      .filter((entry) => zodiacSeeds.some((seed) => seed.iau === entry.iau))
      .map((entry) => [entry.iau, entry]),
  )
}

async function fetchHipparcosStarsByHipIds(hipIds: number[]): Promise<HipRow[]> {
  if (hipIds.length === 0) {
    return []
  }

  const query = `
    SELECT HIP, Vmag, RAICRS, DEICRS
    FROM "I/239/hip_main"
    WHERE HIP IN (${hipIds.join(',')})
  `

  return fetchHipparcosQuery(query)
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
  const response = await fetch(url, {
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
  const response = await fetch(`${SESAME_URL}${encodeURIComponent(name)}`, {
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

async function fetchWikipediaSummary(title: string): Promise<WikipediaSummary> {
  const response = await fetch(`${WIKIPEDIA_SUMMARY_URL}/${encodeURIComponent(title)}`, {
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

  return {
    description: json.description ?? null,
    extract: json.extract ?? null,
    imageUrl: json.originalimage?.source ?? json.thumbnail?.source ?? null,
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
