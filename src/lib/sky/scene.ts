import type { SkyFocus } from '@/lib/types'
import {
  SKY_GRID_INCREMENT,
  SKY_GRID_MAJOR_INCREMENT,
  SKY_GRID_VISIBILITY_MARGIN,
} from './constants'
import type { ScreenPoint, SkyScene, SkySnapshot, ViewCenter, VisibleConstellationEdge } from './types'
import {
  clipSegmentToViewport,
  distanceToSegment,
  estimateMonoTextWidth,
  formatCompassLabel,
  getConstellationStarRadius,
  getSkyFieldVisuals,
  isPointInRect,
  isPointWithinViewport,
  projectAltitudeToY,
  projectAzimuthToX,
  projectSkyPosition,
} from './utils'

export function buildSkyViewportScene(
  positions: SkySnapshot['allPositions'],
  fieldStarPositions: SkySnapshot['fieldStarPositions'],
  referencePositions: SkySnapshot['referenceStarPositions'],
  viewCenter: ViewCenter,
  width: number,
  height: number,
): SkyScene {
  const horizonY = projectAltitudeToY(0, viewCenter.altitude, height)
  const viewportMargin = 24
  const visibleFieldStars = fieldStarPositions
    .map((star) => {
      const projected = projectSkyPosition(star.position, viewCenter, width, height)
      const visuals = getSkyFieldVisuals(star.magnitude)

      return {
        ...star,
        x: projected.x,
        y: projected.y,
        radius: visuals.radius,
        opacity: visuals.opacity,
        haloRadius: visuals.haloRadius,
        color: '#f7fbff',
        visible:
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
      const center = projectSkyPosition(position, viewCenter, width, height)
      const projected = stars.map((star) => {
        const projectedStar = projectSkyPosition(star.position, viewCenter, width, height)

        return {
          ...star,
          x: projectedStar.x,
          y: projectedStar.y,
          radius: getConstellationStarRadius(star.magnitude),
          visible: isPointWithinViewport(
            projectedStar.x,
            projectedStar.y,
            width,
            height,
            viewportMargin,
          ),
        }
      })
      const visibleEdges = sign.edges
        .map(([startIndex, endIndex]) => {
          const first = projected[startIndex]
          const second = projected[endIndex]

          if (!first || !second || (!first.visible && !second.visible)) {
            return null
          }

          const clipped = clipSegmentToViewport(first, second, width, height, viewportMargin)

          if (!clipped) {
            return null
          }

          return {
            startIndex,
            endIndex,
            start: clipped.start,
            end: clipped.end,
          }
        })
        .filter((edge): edge is VisibleConstellationEdge => edge !== null)
      const boundsSource = [
        ...projected.filter((point) => point.visible),
        ...visibleEdges.flatMap((edge) => [edge.start, edge.end]),
      ]
      const bounds = boundsSource.reduce(
        (range, point) => ({
          minX: Math.min(range.minX, point.x),
          maxX: Math.max(range.maxX, point.x),
          minY: Math.min(range.minY, point.y),
          maxY: Math.max(range.maxY, point.y),
        }),
        {
          minX: center.x,
          maxX: center.x,
          minY: center.y,
          maxY: center.y,
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
        visibleEdges.flatMap((edge) => [edge.start, edge.end]),
        labelWidth,
        labelFontSize,
        width,
        height,
      )

      return {
        sign,
        position,
        center,
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
      const projected = projectSkyPosition(star.position, viewCenter, width, height)

      return {
        ...star,
        x: projected.x,
        y: projected.y,
        labelX: Math.min(width - 12, Math.max(12, projected.x + 10)),
        labelY: Math.max(18, Math.min(height - 12, projected.y - 8)),
        labelFontSize: 11,
        labelWidth: estimateMonoTextWidth(star.name, 11),
        visible:
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
    .map((altitude) => ({
      altitude,
      y: projectAltitudeToY(altitude, viewCenter.altitude, height),
      major: Math.abs(altitude) % SKY_GRID_MAJOR_INCREMENT === 0,
      label: `${altitude > 0 ? '+' : ''}${altitude}\u00B0`,
    }))
    .filter(({ y }) => y >= -SKY_GRID_VISIBILITY_MARGIN && y <= height + SKY_GRID_VISIBILITY_MARGIN)

  const azimuthGuides = Array.from(
    { length: Math.floor(360 / SKY_GRID_INCREMENT) },
    (_, index) => index * SKY_GRID_INCREMENT,
  )
    .map((azimuth) => ({
      azimuth,
      x: projectAzimuthToX(azimuth, viewCenter.azimuth, width),
      major: azimuth % SKY_GRID_MAJOR_INCREMENT === 0,
      label: `${formatCompassLabel(azimuth)} ${azimuth}\u00B0`,
    }))
    .filter(({ x }) => x >= -SKY_GRID_VISIBILITY_MARGIN && x <= width + SKY_GRID_VISIBILITY_MARGIN)

  return {
    horizonY,
    horizonLine: horizonY >= 0 && horizonY <= height,
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

    entry.visibleEdges.forEach(({ start, end }) => {
      score = Math.min(score, distanceToSegment(point, start, end))
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
