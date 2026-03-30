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
      position: getConstellationPosition(entry, observer, now),
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
    getConstellationPosition(sign, observer, now)
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
  observer: Observer,
  time: Date,
): ConstellationPosition {
  const horizontal = Horizon(time, observer, sign.centerRa, sign.centerDec, 'normal')

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
