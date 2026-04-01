import {
  MAX_VIEW_ALTITUDE,
  MIN_VIEW_ALTITUDE,
  VERTICAL_VIEW_ANGLE,
} from './constants'
import type { ScreenPoint, ViewCenter } from './types'

type ProjectedSkyCoordinates = ScreenPoint & {
  normalizedX: number
  normalizedY: number
}

export function projectSkyPosition(
  position: { azimuth: number; altitude: number },
  viewCenter: ViewCenter,
  width: number,
  height: number,
): ScreenPoint {
  const projected = projectSkyPositionSafe(position, viewCenter, width, height)

  return projected ?? { x: Number.NaN, y: Number.NaN }
}

export function projectAzimuthToX(
  azimuth: number,
  centerAzimuth: number,
  width: number,
  height: number,
): number {
  return projectSkyPosition({ azimuth, altitude: 0 }, { azimuth: centerAzimuth, altitude: 0 }, width, height).x
}

export function projectAltitudeToY(
  altitude: number,
  centerAltitude: number,
  height: number,
): number {
  return height / 2 - ((altitude - centerAltitude) / VERTICAL_VIEW_ANGLE) * height
}

export function getHorizontalViewAngle(width: number, height: number): number {
  const safeHeight = Math.max(height, 1)
  const aspectRatio = Math.max(width, 1) / safeHeight
  const verticalRadians = degreesToRadians(VERTICAL_VIEW_ANGLE)

  return radiansToDegrees(2 * Math.atan(Math.tan(verticalRadians / 2) * aspectRatio))
}

export function projectSkyPositionSafe(
  position: { azimuth: number; altitude: number },
  viewCenter: ViewCenter,
  width: number,
  height: number,
): ScreenPoint | null {
  const projected = getProjectedSkyCoordinates(position, viewCenter, width, height)

  if (!projected) {
    return null
  }

  if (Math.abs(projected.normalizedX) > 4 || Math.abs(projected.normalizedY) > 4) {
    return null
  }

  return {
    x: projected.x,
    y: projected.y,
  }
}

export function projectSkyPositionToViewportEdge(
  position: { azimuth: number; altitude: number },
  viewCenter: ViewCenter,
  width: number,
  height: number,
  inset = 18,
): ScreenPoint | null {
  const projected = getProjectedSkyCoordinates(position, viewCenter, width, height)

  if (!projected) {
    return null
  }

  const minX = Math.min(inset, Math.max(0, width / 2))
  const maxX = Math.max(minX, width - inset)
  const minY = Math.min(inset, Math.max(0, height / 2))
  const maxY = Math.max(minY, height - inset)

  if (
    projected.x >= minX &&
    projected.x <= maxX &&
    projected.y >= minY &&
    projected.y <= maxY
  ) {
    return {
      x: projected.x,
      y: projected.y,
    }
  }

  const centerX = width / 2
  const centerY = height / 2
  const deltaX = projected.x - centerX
  const deltaY = projected.y - centerY
  const candidates: number[] = []

  if (deltaX !== 0) {
    candidates.push((minX - centerX) / deltaX, (maxX - centerX) / deltaX)
  }

  if (deltaY !== 0) {
    candidates.push((minY - centerY) / deltaY, (maxY - centerY) / deltaY)
  }

  const clampedPoint = candidates
    .filter((candidate) => candidate > 0)
    .sort((first, second) => first - second)
    .map((candidate) => ({
      x: centerX + deltaX * candidate,
      y: centerY + deltaY * candidate,
    }))
    .find(
      (candidate) =>
        candidate.x >= minX - 0.5 &&
        candidate.x <= maxX + 0.5 &&
        candidate.y >= minY - 0.5 &&
        candidate.y <= maxY + 0.5,
    )

  return {
    x: clamp(minX, clampedPoint?.x ?? projected.x, maxX),
    y: clamp(minY, clampedPoint?.y ?? projected.y, maxY),
  }
}

export function skyPositionToVector(position: {
  azimuth: number
  altitude: number
}): { x: number; y: number; z: number } {
  const azimuthRadians = degreesToRadians(position.azimuth)
  const altitudeRadians = degreesToRadians(position.altitude)
  const cosAltitude = Math.cos(altitudeRadians)

  return {
    x: cosAltitude * Math.sin(azimuthRadians),
    y: cosAltitude * Math.cos(azimuthRadians),
    z: Math.sin(altitudeRadians),
  }
}

export function vectorToSkyPosition(vector: {
  x: number
  y: number
  z: number
}): { azimuth: number; altitude: number } {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1
  const normalized = {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  }

  return {
    azimuth: normalizeAngle(radiansToDegrees(Math.atan2(normalized.x, normalized.y))),
    altitude: radiansToDegrees(Math.asin(clamp(-1, normalized.z, 1))),
  }
}

export function interpolateSkyPositions(
  start: { azimuth: number; altitude: number },
  end: { azimuth: number; altitude: number },
  steps: number,
): Array<{ azimuth: number; altitude: number }> {
  const startVector = skyPositionToVector(start)
  const endVector = skyPositionToVector(end)
  const dotProduct = clamp(
    -1,
    startVector.x * endVector.x + startVector.y * endVector.y + startVector.z * endVector.z,
    1,
  )
  const angle = Math.acos(dotProduct)

  if (angle < 1e-5) {
    return [start, end]
  }

  const sinAngle = Math.sin(angle)
  const sampleCount = Math.max(2, steps)

  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const t = index / sampleCount
    const weightA = Math.sin((1 - t) * angle) / sinAngle
    const weightB = Math.sin(t * angle) / sinAngle

    return vectorToSkyPosition({
      x: startVector.x * weightA + endVector.x * weightB,
      y: startVector.y * weightA + endVector.y * weightB,
      z: startVector.z * weightA + endVector.z * weightB,
    })
  })
}

function getCameraBasis(viewCenter: ViewCenter) {
  const forward = skyPositionToVector(viewCenter)
  const azimuthRadians = degreesToRadians(viewCenter.azimuth)
  const right = {
    x: Math.cos(azimuthRadians),
    y: -Math.sin(azimuthRadians),
    z: 0,
  }
  const up = normalizeVector(cross(right, forward))

  return {
    forward,
    right,
    up,
  }
}

function cross(
  first: { x: number; y: number; z: number },
  second: { x: number; y: number; z: number },
) {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  }
}

function dot(
  first: { x: number; y: number; z: number },
  second: { x: number; y: number; z: number },
) {
  return first.x * second.x + first.y * second.y + first.z * second.z
}

function normalizeVector(vector: { x: number; y: number; z: number }) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  }
}

function getProjectedSkyCoordinates(
  position: { azimuth: number; altitude: number },
  viewCenter: ViewCenter,
  width: number,
  height: number,
): ProjectedSkyCoordinates | null {
  const point = skyPositionToVector(position)
  const basis = getCameraBasis(viewCenter)
  const cameraX = dot(point, basis.right)
  const cameraY = dot(point, basis.up)
  const cameraZ = dot(point, basis.forward)

  if (cameraZ <= 0.0001) {
    return null
  }

  const aspectRatio = Math.max(width, 1) / Math.max(height, 1)
  const tanHalfVertical = Math.tan(degreesToRadians(VERTICAL_VIEW_ANGLE) / 2)
  const tanHalfHorizontal = tanHalfVertical * aspectRatio
  const normalizedX = cameraX / (cameraZ * tanHalfHorizontal)
  const normalizedY = cameraY / (cameraZ * tanHalfVertical)

  if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) {
    return null
  }

  return {
    x: width / 2 + normalizedX * (width / 2),
    y: height / 2 - normalizedY * (height / 2),
    normalizedX,
    normalizedY,
  }
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI
}

export function getSkyFieldVisuals(magnitude: number): {
  radius: number
  opacity: number
  haloRadius: number
} {
  const normalized = clamp(0, (4.8 - magnitude) / 5.2, 1)

  return {
    radius: 0.35 + normalized * 2.25,
    opacity: 0.14 + normalized * 0.76,
    haloRadius: magnitude <= 1.4 ? 1.8 + normalized * 4.2 : 0,
  }
}

export function getConstellationStarRadius(magnitude: number): number {
  return clamp(1.15, 3.05 - magnitude * 0.34, 2.75)
}

export function estimateMonoTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.62
}

export function isPointWithinViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  margin = 0,
): boolean {
  return x >= -margin && x <= width + margin && y >= -margin && y <= height + margin
}

export function clipSegmentToViewport(
  start: ScreenPoint,
  end: ScreenPoint,
  width: number,
  height: number,
  margin = 0,
): { start: ScreenPoint; end: ScreenPoint } | null {
  const bounds = {
    left: -margin,
    right: width + margin,
    top: -margin,
    bottom: height + margin,
  }

  const INSIDE = 0
  const LEFT = 1
  const RIGHT = 2
  const BOTTOM = 4
  const TOP = 8

  const getOutCode = (point: ScreenPoint): number => {
    let code = INSIDE

    if (point.x < bounds.left) {
      code |= LEFT
    } else if (point.x > bounds.right) {
      code |= RIGHT
    }

    if (point.y < bounds.top) {
      code |= TOP
    } else if (point.y > bounds.bottom) {
      code |= BOTTOM
    }

    return code
  }

  let clippedStart = { ...start }
  let clippedEnd = { ...end }
  let startCode = getOutCode(clippedStart)
  let endCode = getOutCode(clippedEnd)

  while (true) {
    if ((startCode | endCode) === 0) {
      return {
        start: clippedStart,
        end: clippedEnd,
      }
    }

    if ((startCode & endCode) !== 0) {
      return null
    }

    const outCode = startCode !== 0 ? startCode : endCode
    const deltaX = clippedEnd.x - clippedStart.x
    const deltaY = clippedEnd.y - clippedStart.y
    let nextPoint = { x: clippedStart.x, y: clippedStart.y }

    if (outCode & TOP) {
      if (deltaY === 0) {
        return null
      }

      nextPoint = {
        x: clippedStart.x + (deltaX * (bounds.top - clippedStart.y)) / deltaY,
        y: bounds.top,
      }
    } else if (outCode & BOTTOM) {
      if (deltaY === 0) {
        return null
      }

      nextPoint = {
        x: clippedStart.x + (deltaX * (bounds.bottom - clippedStart.y)) / deltaY,
        y: bounds.bottom,
      }
    } else if (outCode & RIGHT) {
      if (deltaX === 0) {
        return null
      }

      nextPoint = {
        x: bounds.right,
        y: clippedStart.y + (deltaY * (bounds.right - clippedStart.x)) / deltaX,
      }
    } else if (outCode & LEFT) {
      if (deltaX === 0) {
        return null
      }

      nextPoint = {
        x: bounds.left,
        y: clippedStart.y + (deltaY * (bounds.left - clippedStart.x)) / deltaX,
      }
    }

    if (outCode === startCode) {
      clippedStart = nextPoint
      startCode = getOutCode(clippedStart)
    } else {
      clippedEnd = nextPoint
      endCode = getOutCode(clippedEnd)
    }
  }
}

export function isPointInRect(
  point: ScreenPoint,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height
}

export function distanceToSegment(
  point: ScreenPoint,
  start: ScreenPoint,
  end: ScreenPoint,
): number {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const lengthSquared = deltaX * deltaX + deltaY * deltaY

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t = clamp(
    0,
    ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared,
    1,
  )
  const projectionX = start.x + t * deltaX
  const projectionY = start.y + t * deltaY

  return Math.hypot(point.x - projectionX, point.y - projectionY)
}

export function shortestAngleDelta(target: number, current: number): number {
  return ((target - current + 540) % 360) - 180
}

export function normalizeAngle(value: number): number {
  return ((value % 360) + 360) % 360
}

export function clampViewAltitude(value: number): number {
  return clamp(MIN_VIEW_ALTITUDE, value, MAX_VIEW_ALTITUDE)
}

export function formatCompassLabel(azimuth: number): string {
  const labels = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ]
  const index = Math.round(normalizeAngle(azimuth) / 22.5) % labels.length
  return labels[index]
}

export function formatClock(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
    weekday: 'short',
  }).format(date)
}

export function formatAltitudeLabel(value: number): string {
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded} deg`
}

export function clamp(min: number, value: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (value as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures and continue with in-memory state.
  }
}
