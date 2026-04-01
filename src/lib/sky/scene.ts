import type { SkyFocus } from '@/lib/types'
import {
  SKY_GRID_INCREMENT,
  SKY_GRID_MAJOR_INCREMENT,
  SKY_GRID_VISIBILITY_MARGIN,
} from './constants'
import type { ScreenPoint, SkyScene, SkySnapshot, ViewCenter } from './types'
import {
  distanceToSegment,
  estimateMonoTextWidth,
  formatCompassLabel,
  getConstellationStarRadius,
  getSkyFieldVisuals,
  interpolateSkyPositions,
  isPointInRect,
  isPointWithinViewport,
  normalizeAngle,
  projectSkyPositionSafe,
  projectSkyPositionToViewportEdge,
} from './utils'

export function buildSkyViewportScene(
  positions: SkySnapshot['allPositions'],
  fieldStarPositions: SkySnapshot['fieldStarPositions'],
  referencePositions: SkySnapshot['referenceStarPositions'],
  viewCenter: ViewCenter,
  width: number,
  height: number,
): SkyScene {
  const viewportMargin = 24
  const visibleFieldStars = fieldStarPositions
    .map((star) => {
      const projected = projectSkyPositionSafe(star.position, viewCenter, width, height)
      const visuals = getSkyFieldVisuals(star.magnitude)

      return {
        ...star,
        x: projected?.x ?? 0,
        y: projected?.y ?? 0,
        radius: visuals.radius,
        opacity: visuals.opacity,
        haloRadius: visuals.haloRadius,
        color: '#f7fbff',
        visible:
          projected !== null &&
          projected.x >= -40 &&
          projected.x <= width + 40 &&
          projected.y >= -40 &&
          projected.y <= height + 40,
      }
    })
    .filter((star) => star.visible)
    .sort((first, second) => second.magnitude - first.magnitude)

  const visibleConstellations = positions
    .map(({ sign, position, stars }) => {
      const center = projectSkyPositionSafe(position, viewCenter, width, height)
      const projected = stars.map((star) => {
        const projectedStar = projectSkyPositionSafe(star.position, viewCenter, width, height)

        return {
          ...star,
          x: projectedStar?.x ?? 0,
          y: projectedStar?.y ?? 0,
          radius: getConstellationStarRadius(star.magnitude),
          visible:
            projectedStar !== null &&
            isPointWithinViewport(projectedStar.x, projectedStar.y, width, height, viewportMargin),
        }
      })
      const visibleEdges = sign.edges
        .flatMap(([startIndex, endIndex]) => {
          const first = projected[startIndex]
          const second = projected[endIndex]
          const firstPosition = stars[startIndex]?.position
          const secondPosition = stars[endIndex]?.position

          if (!first || !second || !firstPosition || !secondPosition) {
            return []
          }

          return projectSkyPolyline(
            interpolateSkyPositions(firstPosition, secondPosition, 12),
            viewCenter,
            width,
            height,
          ).map((points) => ({
            startIndex,
            endIndex,
            points,
          }))
        })
      const boundsSource = [
        ...projected.filter((point) => point.visible),
        ...visibleEdges.flatMap((edge) => edge.points),
      ]
      const bounds = boundsSource.reduce(
        (range, point) => ({
          minX: Math.min(range.minX, point.x),
          maxX: Math.max(range.maxX, point.x),
          minY: Math.min(range.minY, point.y),
          maxY: Math.max(range.maxY, point.y),
        }),
        {
          minX: center?.x ?? width / 2,
          maxX: center?.x ?? width / 2,
          minY: center?.y ?? height / 2,
          maxY: center?.y ?? height / 2,
        },
      )
      const visible = projected.some((point) => point.visible) || visibleEdges.length > 0
      const labelText = sign.name.toUpperCase()
      const labelFontSize = 12
      const labelWidth = estimateMonoTextWidth(labelText, labelFontSize)
      const labelPlacement = getConstellationLabelPlacement(
        projected
          .filter((point) => point.visible)
          .map((point) => ({
            x: point.x,
            y: point.y,
          })),
        visibleEdges.flatMap((edge) => edge.points),
        labelWidth,
        labelFontSize,
        width,
        height,
      )

      return {
        sign,
        position,
        center: center ?? labelPlacement,
        projected,
        visibleEdges,
        bounds,
        labelText,
        labelX: labelPlacement.x,
        labelY: labelPlacement.y,
        labelFontSize,
        labelWidth,
        visible,
      }
    })
    .filter((entry) => entry.visible)

  const visibleReferenceStars = referencePositions
    .map((star) => {
      const projected = projectSkyPositionSafe(star.position, viewCenter, width, height)

      return {
        ...star,
        x: projected?.x ?? 0,
        y: projected?.y ?? 0,
        labelX: Math.min(width - 12, Math.max(12, (projected?.x ?? 0) + 10)),
        labelY: Math.max(18, Math.min(height - 12, (projected?.y ?? 0) - 8)),
        labelFontSize: 11,
        labelWidth: estimateMonoTextWidth(star.name, 11),
        visible:
          projected !== null &&
          projected.x >= -80 &&
          projected.x <= width + 80 &&
          projected.y >= -50 &&
          projected.y <= height + 50,
      }
    })
    .filter((star) => star.visible)
    .sort((first, second) => second.priority - first.priority)
    .slice(0, 10)

  const altitudeGuides = Array.from(
    { length: Math.floor(180 / SKY_GRID_INCREMENT) + 1 },
    (_, index) => -90 + index * SKY_GRID_INCREMENT,
  )
    .filter((altitude) => altitude !== 0)
    .map((altitude) => {
      const paths = projectSkyPolyline(
        sampleAltitudeGuide(altitude, viewCenter.azimuth),
        viewCenter,
        width,
        height,
      )

      return {
        altitude,
        major: Math.abs(altitude) % SKY_GRID_MAJOR_INCREMENT === 0,
        label: `${altitude > 0 ? '+' : ''}${altitude}\u00B0`,
        paths,
        labelPoint: getGuideLabelPoint(paths, 'left', width, height),
      }
    })
    .filter(({ paths }) => paths.length > 0)

  const azimuthGuides = Array.from(
    { length: Math.floor(360 / SKY_GRID_INCREMENT) },
    (_, index) => index * SKY_GRID_INCREMENT,
  )
    .map((azimuth) => {
      const paths = projectSkyPolyline(
        sampleAzimuthGuide(azimuth),
        viewCenter,
        width,
        height,
      )

      return {
        azimuth,
        major: azimuth % SKY_GRID_MAJOR_INCREMENT === 0,
        label: `${formatCompassLabel(azimuth)} ${azimuth}\u00B0`,
        paths,
        labelPoint:
          azimuth % SKY_GRID_MAJOR_INCREMENT === 0
            ? projectSkyPositionToViewportEdge(
                { azimuth, altitude: 0 },
                viewCenter,
                width,
                height,
                18,
              )
            : null,
      }
    })
    .filter(({ paths }) => paths.length > 0)

  const horizonPaths = projectSkyPolyline(
    sampleAltitudeGuide(0, viewCenter.azimuth),
    viewCenter,
    width,
    height,
  )

  return {
    horizon:
      horizonPaths.length > 0
        ? {
            paths: horizonPaths,
            labelPoint: getGuideLabelPoint(horizonPaths, 'right', width, height),
          }
        : null,
    visibleFieldStars,
    visibleConstellations,
    visibleReferenceStars,
    altitudeGuides,
    azimuthGuides,
  }
}

export function findSkyHitTarget(point: ScreenPoint, scene: SkyScene): SkyFocus | null {
  let bestTarget: SkyFocus | null = null
  let bestScore = Number.POSITIVE_INFINITY

  scene.visibleReferenceStars.forEach((star) => {
    let score = Math.hypot(point.x - star.x, point.y - star.y)

    if (score > 12) {
      score = Number.POSITIVE_INFINITY
    }

    if (
      isPointInRect(
        point,
        star.labelX - 4,
        star.labelY - star.labelFontSize - 2,
        star.labelWidth + 8,
        star.labelFontSize + 6,
      )
    ) {
      score = Math.min(score, 0.5)
    }

    if (score < bestScore) {
      bestScore = score
      bestTarget = {
        kind: 'star',
        starName: star.name,
      }
    }
  })

  scene.visibleConstellations.forEach((entry) => {
    let score = Number.POSITIVE_INFINITY

    entry.projected.forEach((pointEntry) => {
      if (!pointEntry.visible) {
        return
      }

      score = Math.min(score, Math.hypot(point.x - pointEntry.x, point.y - pointEntry.y))
    })

    entry.visibleEdges.forEach(({ points }) => {
      for (let index = 1; index < points.length; index += 1) {
        score = Math.min(score, distanceToSegment(point, points[index - 1], points[index]))
      }
    })

    if (
      isPointInRect(
        point,
        entry.labelX - entry.labelWidth / 2 - 4,
        entry.labelY - entry.labelFontSize - 3,
        entry.labelWidth + 8,
        entry.labelFontSize + 8,
      )
    ) {
      score = Math.min(score, 0.75)
    }

    if (score <= 14 && score < bestScore) {
      bestScore = score
      bestTarget = {
        kind: 'sign',
        signKey: entry.sign.key,
      }
    }
  })

  return bestTarget
}

function projectSkyPolyline(
  samples: Array<{ azimuth: number; altitude: number }>,
  viewCenter: ViewCenter,
  width: number,
  height: number,
): ScreenPoint[][] {
  const paths: ScreenPoint[][] = []
  let current: ScreenPoint[] = []
  let previous: ScreenPoint | null = null
  const jumpThreshold = Math.max(width, height) * 1.25

  samples.forEach((sample) => {
    const projected = projectSkyPositionSafe(sample, viewCenter, width, height)

    if (!projected) {
      if (current.length > 1) {
        paths.push(current)
      }

      current = []
      previous = null
      return
    }

    if (
      previous &&
      Math.hypot(projected.x - previous.x, projected.y - previous.y) > jumpThreshold
    ) {
      if (current.length > 1) {
        paths.push(current)
      }

      current = [projected]
      previous = projected
      return
    }

    current.push(projected)
    previous = projected
  })

  if (current.length > 1) {
    paths.push(current)
  }

  return paths.filter((path) =>
    path.some((point) => isPointWithinViewport(point.x, point.y, width, height, SKY_GRID_VISIBILITY_MARGIN)),
  )
}

function sampleAltitudeGuide(altitude: number, centerAzimuth: number) {
  return Array.from({ length: 181 }, (_, index) => ({
    azimuth: normalizeAngle(centerAzimuth - 180 + index * 2),
    altitude,
  }))
}

function sampleAzimuthGuide(azimuth: number) {
  return Array.from({ length: 181 }, (_, index) => ({
    azimuth,
    altitude: -90 + index,
  }))
}

function getGuideLabelPoint(
  paths: ScreenPoint[][],
  preference: 'left' | 'bottom' | 'right',
  width: number,
  height: number,
): ScreenPoint | null {
  const points = paths
    .flat()
    .filter((point) => isPointWithinViewport(point.x, point.y, width, height, 0))

  if (points.length === 0) {
    return null
  }

  if (preference === 'left') {
    return points.reduce((best, point) => (point.x < best.x ? point : best))
  }

  if (preference === 'right') {
    return points.reduce((best, point) => (point.x > best.x ? point : best))
  }

  return points.reduce((best, point) => (point.y > best.y ? point : best))
}

function getConstellationLabelPlacement(
  visiblePoints: ScreenPoint[],
  edgePoints: ScreenPoint[],
  labelWidth: number,
  labelFontSize: number,
  width: number,
  height: number,
): ScreenPoint {
  const source = visiblePoints.length > 0 ? visiblePoints : edgePoints

  if (source.length === 0) {
    return {
      x: Math.max(labelWidth / 2 + 12, 24),
      y: labelFontSize + 12,
    }
  }

  const center = source.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 },
  )
  const centerX = center.x / source.length
  const centerY = center.y / source.length
  const minX = labelWidth / 2 + 12
  const maxX = Math.max(minX, width - labelWidth / 2 - 12)

  let y = centerY - 8

  if (y < labelFontSize + 10) {
    y = centerY + labelFontSize + 10
  }

  return {
    x: Math.min(maxX, Math.max(minX, centerX)),
    y: Math.min(height - 12, Math.max(labelFontSize + 10, y)),
  }
}
