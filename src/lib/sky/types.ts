import type {
  AppLocation,
  ConstellationPosition,
  ReferenceStar,
  SkyCatalogStar,
  ZodiacSign,
} from '@/lib/types'

export type ViewCenter = {
  azimuth: number
  altitude: number
}

export type ScreenPoint = {
  x: number
  y: number
}

export type Bounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type PositionedCatalogStar = SkyCatalogStar & {
  position: ConstellationPosition
}

export type PositionedReferenceStar = ReferenceStar & {
  position: ConstellationPosition
}

export type SkySnapshotEntry = {
  sign: ZodiacSign
  position: ConstellationPosition
  stars: PositionedCatalogStar[]
}

export type SkySnapshot = {
  location: AppLocation
  now: Date
  actualSky: 'day' | 'night'
  allPositions: SkySnapshotEntry[]
  fieldStarPositions: PositionedCatalogStar[]
  referenceStarPositions: PositionedReferenceStar[]
  moon: {
    position: ConstellationPosition
    phaseFraction: number
    phaseAngle: number
    phaseDegrees: number
    waxing: boolean
    brightLimbAngle: number
  }
  current: {
    time: Date
    position: ConstellationPosition
  }
}

export type VisibleFieldStar = PositionedCatalogStar & {
  x: number
  y: number
  radius: number
  opacity: number
  haloRadius: number
  color: string
  visible: boolean
}

export type VisibleConstellationPoint = PositionedCatalogStar & {
  x: number
  y: number
  radius: number
  visible: boolean
}

export type VisibleConstellationEdge = {
  startIndex: number
  endIndex: number
  points: ScreenPoint[]
}

export type VisibleConstellation = {
  sign: ZodiacSign
  position: ConstellationPosition
  center: ScreenPoint
  projected: VisibleConstellationPoint[]
  visibleEdges: VisibleConstellationEdge[]
  bounds: Bounds
  labelText: string
  labelX: number
  labelY: number
  labelFontSize: number
  labelWidth: number
  visible: boolean
}

export type VisibleReferenceStar = PositionedReferenceStar & {
  x: number
  y: number
  labelX: number
  labelY: number
  labelFontSize: number
  labelWidth: number
  visible: boolean
}

export type VisibleMoon = {
  position: ConstellationPosition
  x: number
  y: number
  radius: number
  labelX: number
  labelY: number
  labelFontSize: number
  visible: boolean
  phaseFraction: number
  phaseAngle: number
  phaseDegrees: number
  waxing: boolean
  brightLimbAngle: number
}

export type AltitudeGuide = {
  altitude: number
  major: boolean
  label: string
  paths: ScreenPoint[][]
  labelPoint: ScreenPoint | null
}

export type AzimuthGuide = {
  azimuth: number
  major: boolean
  label: string
  paths: ScreenPoint[][]
  labelPoint: ScreenPoint | null
}

export type HorizonGuide = {
  paths: ScreenPoint[][]
  labelPoint: ScreenPoint | null
}

export type SkyScene = {
  horizon: HorizonGuide | null
  moon: VisibleMoon | null
  visibleFieldStars: VisibleFieldStar[]
  visibleConstellations: VisibleConstellation[]
  visibleReferenceStars: VisibleReferenceStar[]
  altitudeGuides: AltitudeGuide[]
  azimuthGuides: AzimuthGuide[]
}

export type SkySurface = {
  width: number
  height: number
  dpr: number
}
