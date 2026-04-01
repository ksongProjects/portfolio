import { Body, Equator, Horizon, Observer } from 'astronomy-engine'
import type {
  AppLocation,
  ConstellationPosition,
  ReferenceStar,
  SkyCatalogStar,
  ZodiacSign,
} from '@/lib/types'
import type { SkySnapshot } from './types'

export function buildSkySnapshot(
  sign: ZodiacSign,
  zodiacSigns: ZodiacSign[],
  skyFieldStars: SkyCatalogStar[],
  referenceStars: ReferenceStar[],
  location: AppLocation,
  now: Date,
): SkySnapshot {
  const observer = new Observer(location.latitude, location.longitude, 0)
  const allPositions = zodiacSigns.map((entry) => {
    const stars = entry.stars.map((star) => ({
      ...star,
      position: getCatalogStarPosition(star, observer, now),
    }))

    return {
      sign: entry,
      position: getConstellationPosition(entry, stars, observer, now),
      stars,
    }
  })
  const fieldStarPositions = skyFieldStars.map((star) => ({
    ...star,
    position: getCatalogStarPosition(star, observer, now),
  }))
  const referenceStarPositions = referenceStars.map((star) => ({
    ...star,
    position: getCatalogStarPosition(star, observer, now),
  }))
  const currentPosition =
    allPositions.find((entry) => entry.sign.key === sign.key)?.position ??
    getConstellationPosition(sign, [], observer, now)
  const sunPosition = getSunPosition(observer, now)
  const actualSky = sunPosition.altitude <= -6 ? 'night' : 'day'

  return {
    location,
    now,
    actualSky,
    allPositions,
    fieldStarPositions,
    referenceStarPositions,
    current: {
      time: now,
      position: currentPosition,
    },
  }
}

function getConstellationPosition(
  sign: ZodiacSign,
  stars: Array<{ position: ConstellationPosition }>,
  observer: Observer,
  time: Date,
): ConstellationPosition {
  if (stars.length > 0) {
    return {
      azimuth: getCircularMeanDegrees(stars.map((star) => star.position.azimuth)),
      altitude:
        stars.reduce((sum, star) => sum + star.position.altitude, 0) / Math.max(stars.length, 1),
    }
  }

  const normalizedRa = sign.centerRa > 24 ? sign.centerRa / 15 : sign.centerRa
  const horizontal = Horizon(time, observer, normalizedRa, sign.centerDec, 'normal')

  return {
    azimuth: horizontal.azimuth,
    altitude: horizontal.altitude,
  }
}

function getCatalogStarPosition(
  star: Pick<SkyCatalogStar, 'ra' | 'dec'> | Pick<ReferenceStar, 'ra' | 'dec'>,
  observer: Observer,
  time: Date,
): ConstellationPosition {
  const horizontal = Horizon(time, observer, star.ra, star.dec, 'normal')

  return {
    azimuth: horizontal.azimuth,
    altitude: horizontal.altitude,
  }
}

function getSunPosition(observer: Observer, time: Date): ConstellationPosition {
  const equatorial = Equator(Body.Sun, time, observer, true, true)
  const horizontal = Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal')

  return {
    azimuth: horizontal.azimuth,
    altitude: horizontal.altitude,
  }
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
