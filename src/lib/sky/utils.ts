import {
  HORIZONTAL_VIEW_ANGLE,
  MAX_VIEW_ALTITUDE,
  MIN_VIEW_ALTITUDE,
  VERTICAL_VIEW_ANGLE,
} from './constants'
import type { ScreenPoint, ViewCenter } from './types'

export function projectSkyPosition(
  position: { azimuth: number; altitude: number },
  viewCenter: ViewCenter,
  width: number,
  height: number,
): ScreenPoint {
  const azimuthDelta = shortestAngleDelta(position.azimuth, viewCenter.azimuth)
  const altitudeDelta = position.altitude - viewCenter.altitude

  return {
    x: width / 2 + (azimuthDelta / HORIZONTAL_VIEW_ANGLE) * width,
    y: height / 2 - (altitudeDelta / VERTICAL_VIEW_ANGLE) * height,
  }
}

export function projectAzimuthToX(
  azimuth: number,
  centerAzimuth: number,
  width: number,
): number {
  return width / 2 + (shortestAngleDelta(azimuth, centerAzimuth) / HORIZONTAL_VIEW_ANGLE) * width
}

export function projectAltitudeToY(
  altitude: number,
  centerAltitude: number,
  height: number,
): number {
  return height / 2 - ((altitude - centerAltitude) / VERTICAL_VIEW_ANGLE) * height
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
