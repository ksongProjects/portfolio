import type { AppLocation } from '@/lib/types'

export const DEFAULT_SIGN_KEY = 'scorpio'

export const HORIZONTAL_VIEW_ANGLE = 150
export const VERTICAL_VIEW_ANGLE = 100
export const SKY_GRID_INCREMENT = 10
export const SKY_GRID_MAJOR_INCREMENT = 30
export const SKY_GRID_VISIBILITY_MARGIN = 24
export const MIN_VIEW_ALTITUDE = -75
export const MAX_VIEW_ALTITUDE = 85

export const SKY_STORAGE_KEYS = {
  sign: 'portfolio-sky-sign',
  guide: 'portfolio-sky-guide',
} as const

export const FALLBACK_LOCATION: AppLocation = {
  label: 'Vancouver, BC, Canada',
  latitude: 49.2827,
  longitude: -123.1207,
  timezone: 'America/Vancouver',
  source: 'fallback',
  detail: 'Using Vancouver because location access was not available.',
}
