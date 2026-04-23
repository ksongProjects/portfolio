'use client'

import { forwardRef, useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  DEFAULT_SIGN_KEY,
  MAX_VERTICAL_VIEW_ANGLE,
  MIN_VERTICAL_VIEW_ANGLE,
  SKY_STORAGE_KEYS,
  VANCOUVER_LOCATION,
  VERTICAL_VIEW_ANGLE,
  VIEW_ANGLE_STEP,
} from '@/lib/sky/constants'
import { getSkyDetailsContent } from '@/lib/sky/details'
import { drawSkyScene, resizeSkyCanvas } from '@/lib/sky/render'
import { buildSkyViewportScene, findSkyHitTarget } from '@/lib/sky/scene'
import { buildSkySnapshot } from '@/lib/sky/snapshot'
import type { SkyScene, SkySnapshot } from '@/lib/sky/types'
import {
  clamp,
  clampViewAltitude,
  formatAltitudeLabel,
  formatClock,
  formatCompassLabel,
  getHorizontalViewAngle,
  normalizeAngle,
  readStorage,
  shortestAngleDelta,
  writeStorage,
} from '@/lib/sky/utils'
import type { SkyDataset, SkyFocus } from '@/lib/types'
import { PageMobileNav } from '@/components/site-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { SkyDetailsDrawer } from './sky-details-drawer'

type NightSkySectionProps = {
  dataset: SkyDataset
  initialNowIso: string
}

type SkyDragState =
  | {
      pointerId: number
      startX: number
      startY: number
      startAzimuth: number
      startAltitude: number
      startVerticalViewAngle: number
      width: number
      height: number
      moved: boolean
    }
  | null

type ViewCenter = {
  azimuth: number
  altitude: number
}

type ViewMoveMode = 'none' | 'jump' | 'animate'

type SkyPerformanceProfile = {
  maxDpr: number
  maxFieldStars: number
  maxReferenceStars: number
  edgeInterpolationSteps: number
  showGuides: boolean
  showFieldHalos: boolean
  showReferenceLabels: boolean
  constellationLabelMode: 'all' | 'focused'
}

const railButtonClassName =
  'h-auto w-full justify-start rounded-none border-0 bg-transparent px-0 py-0 font-inherit text-inherit shadow-none hover:bg-transparent hover:text-inherit focus-visible:border-transparent focus-visible:ring-0 active:translate-y-0'

function getZodiacRailButtonClassName({
  isActive,
  isBelowHorizon,
}: {
  isActive: boolean
  isBelowHorizon: boolean
}) {
  return cn(
    'sky-zodiac-button',
    railButtonClassName,
    isActive && 'is-active',
    isBelowHorizon && 'is-below-horizon',
  )
}

function getSkyObjectButtonClassName({
  isActive,
  isBelowHorizon = false,
}: {
  isActive: boolean
  isBelowHorizon?: boolean
}) {
  return cn(
    'sky-object-row',
    railButtonClassName,
    isActive && 'is-active',
    isBelowHorizon && 'is-below-horizon',
  )
}

function getSkyPerformanceProfile({
  isCoarsePointer,
  isDragging,
}: {
  isCoarsePointer: boolean
  isDragging: boolean
}): SkyPerformanceProfile {
  if (!isCoarsePointer) {
    return {
      maxDpr: 2,
      maxFieldStars: 700,
      maxReferenceStars: 10,
      edgeInterpolationSteps: 12,
      showGuides: true,
      showFieldHalos: true,
      showReferenceLabels: true,
      constellationLabelMode: 'all',
    }
  }

  if (isDragging) {
    return {
      maxDpr: 1.2,
      maxFieldStars: 140,
      maxReferenceStars: 5,
      edgeInterpolationSteps: 5,
      showGuides: true,
      showFieldHalos: false,
      showReferenceLabels: false,
      constellationLabelMode: 'focused',
    }
  }

  return {
    maxDpr: 1.35,
    maxFieldStars: 240,
    maxReferenceStars: 6,
    edgeInterpolationSteps: 8,
    showGuides: true,
    showFieldHalos: false,
    showReferenceLabels: false,
    constellationLabelMode: 'focused',
  }
}

export const NightSkySection = forwardRef<HTMLElement, NightSkySectionProps>(
  function NightSkySection({ dataset, initialNowIso }, ref) {
    const initialSign = findConstellation(dataset, DEFAULT_SIGN_KEY)
    const initialNow = new Date(initialNowIso)
    const initialSnapshot = buildSkySnapshot(
      initialSign,
      dataset.allConstellations,
      dataset.fieldStars,
      dataset.referenceStars,
      VANCOUVER_LOCATION,
      initialNow,
    )
    const initialViewLabel = formatCompassLabel(initialSnapshot.current.position.azimuth)
    const initialTiltLabel = formatHudAltitudeLabel(initialSnapshot.current.position.altitude)

    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const tiltValueRef = useRef<HTMLSpanElement | null>(null)
    const viewValueRef = useRef<HTMLSpanElement | null>(null)
    const snapshotRef = useRef<SkySnapshot>(initialSnapshot)
    const sceneRef = useRef<SkyScene | null>(null)
    const viewCenterRef = useRef<ViewCenter>({
      azimuth: normalizeAngle(initialSnapshot.current.position.azimuth),
      altitude: clampViewAltitude(initialSnapshot.current.position.altitude),
    })
    const viewAnimationFrameRef = useRef<number | null>(null)
    const renderQueuedRef = useRef(false)
    const dragStateRef = useRef<SkyDragState>(null)
    const recenterNextSnapshotRef = useRef(false)
    const verticalViewAngleRef = useRef(VERTICAL_VIEW_ANGLE)

    const [selectedSignKey, setSelectedSignKey] = useState(initialSign.key)
    const [skyFocus, setSkyFocus] = useState<SkyFocus>({
      kind: 'sign',
      signKey: initialSign.key,
    })
    const [now, setNow] = useState(initialNow)
    const [snapshot, setSnapshot] = useState(initialSnapshot)
    const [isDetailsOpen, setIsDetailsOpen] = useState(true)
    const [isCoarsePointer, setIsCoarsePointer] = useState(false)
    const [showGuides, setShowGuides] = useState(true)
    const [verticalViewAngle, setVerticalViewAngle] = useState(VERTICAL_VIEW_ANGLE)

    const updateStatusHud = useEffectEvent(() => {
      const viewCenter = viewCenterRef.current
      const tiltValue = tiltValueRef.current
      const viewValue = viewValueRef.current

      if (!viewCenter || !tiltValue || !viewValue) {
        return
      }

      viewValue.textContent = formatCompassLabel(viewCenter.azimuth)
      tiltValue.textContent = formatHudAltitudeLabel(viewCenter.altitude)
    })

    const drawCanvas = useEffectEvent(() => {
      const canvas = canvasRef.current
      const snapshotValue = snapshotRef.current
      const viewCenter = viewCenterRef.current

      if (!canvas || !snapshotValue || !viewCenter) {
        return
      }

      const context = canvas.getContext('2d')

      if (!context) {
        return
      }

      const performanceProfile = getSkyPerformanceProfile({
        isCoarsePointer,
        isDragging: dragStateRef.current?.moved === true,
      })
      const shouldShowGuides = performanceProfile.showGuides && showGuides
      const surface = resizeSkyCanvas(canvas, performanceProfile.maxDpr)

      if (!surface) {
        return
      }

      const scene = buildSkyViewportScene(
        snapshotValue.allPositions,
        snapshotValue.fieldStarPositions,
        snapshotValue.referenceStarPositions,
        snapshotValue.moon,
        viewCenter,
        surface.width,
        surface.height,
        {
          maxFieldStars: performanceProfile.maxFieldStars,
          maxReferenceStars: performanceProfile.maxReferenceStars,
          edgeInterpolationSteps: performanceProfile.edgeInterpolationSteps,
          showGuides: shouldShowGuides,
          verticalViewAngle: verticalViewAngleRef.current,
        },
      )

      sceneRef.current = scene

      drawSkyScene(context, canvas, {
        scene,
        surface,
        selectedSignKey,
        focus: skyFocus,
        showGuide: shouldShowGuides,
        showFieldHalos: performanceProfile.showFieldHalos,
        showReferenceLabels: performanceProfile.showReferenceLabels,
        constellationLabelMode: performanceProfile.constellationLabelMode,
      })
    })

    const scheduleRender = useEffectEvent(() => {
      if (renderQueuedRef.current) {
        return
      }

      renderQueuedRef.current = true
      window.requestAnimationFrame(() => {
        renderQueuedRef.current = false
        drawCanvas()
      })
    })

    const cancelViewAnimation = useEffectEvent(() => {
      if (viewAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(viewAnimationFrameRef.current)
        viewAnimationFrameRef.current = null
      }
    })

    const moveViewToCenter = useEffectEvent(
      (nextCenter: ViewCenter, moveMode: Exclude<ViewMoveMode, 'none'>) => {
        const targetCenter = {
          azimuth: normalizeAngle(nextCenter.azimuth),
          altitude: clampViewAltitude(nextCenter.altitude),
        }

        cancelViewAnimation()

        if (
          moveMode === 'jump' ||
          typeof window === 'undefined' ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          viewCenterRef.current = targetCenter
          updateStatusHud()
          scheduleRender()
          return
        }

        const startCenter = viewCenterRef.current
        const azimuthDelta = shortestAngleDelta(targetCenter.azimuth, startCenter.azimuth)
        const altitudeDelta = targetCenter.altitude - startCenter.altitude
        const travel = Math.hypot(azimuthDelta, altitudeDelta)

        if (travel < 0.3) {
          viewCenterRef.current = targetCenter
          updateStatusHud()
          scheduleRender()
          return
        }

        const duration = Math.min(900, Math.max(420, 320 + travel * 4.2))
        const startedAt = window.performance.now()
        const easeInOutCubic = (value: number) =>
          value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2

        const step = (timestamp: number) => {
          const progress = Math.min(1, (timestamp - startedAt) / duration)
          const eased = easeInOutCubic(progress)

          viewCenterRef.current = {
            azimuth: normalizeAngle(startCenter.azimuth + azimuthDelta * eased),
            altitude: clampViewAltitude(startCenter.altitude + altitudeDelta * eased),
          }

          updateStatusHud()
          drawCanvas()

          if (progress < 1) {
            viewAnimationFrameRef.current = window.requestAnimationFrame(step)
            return
          }

          viewAnimationFrameRef.current = null
        }

        viewAnimationFrameRef.current = window.requestAnimationFrame(step)
      },
    )

    const moveViewToSign = useEffectEvent(
      (
        signKey: string,
        moveMode: Exclude<ViewMoveMode, 'none'>,
        sourceSnapshot?: SkySnapshot,
      ) => {
        const snapshotValue = sourceSnapshot ?? snapshotRef.current
        const signEntry = snapshotValue?.allPositions.find((entry) => entry.sign.key === signKey)

        if (!snapshotValue || !signEntry) {
          return
        }

        moveViewToCenter({
          azimuth: signEntry.position.azimuth,
          altitude: signEntry.position.altitude,
        }, moveMode)
      },
    )

    const moveViewToReferenceStar = useEffectEvent(
      (
        starName: string,
        moveMode: Exclude<ViewMoveMode, 'none'>,
        sourceSnapshot?: SkySnapshot,
      ) => {
        const snapshotValue = sourceSnapshot ?? snapshotRef.current
        const star = snapshotValue?.referenceStarPositions.find((entry) => entry.name === starName)

        if (!snapshotValue || !star) {
          return
        }

        moveViewToCenter({
          azimuth: star.position.azimuth,
          altitude: star.position.altitude,
        }, moveMode)
      },
    )

    const selectSign = useEffectEvent((signKey: string, moveMode: ViewMoveMode = 'none') => {
      if (moveMode !== 'none') {
        moveViewToSign(signKey, moveMode)
      }

      setSelectedSignKey((current) => (current === signKey ? current : signKey))
      setSkyFocus({
        kind: 'sign',
        signKey,
      })
    })

    const selectReferenceStar = useEffectEvent(
      (starName: string, moveMode: ViewMoveMode = 'none') => {
        const relatedStar = snapshotRef.current.referenceStarPositions.find(
          (entry) => entry.name === starName,
        )

        if (!relatedStar) {
          return
        }

        if (moveMode !== 'none') {
          moveViewToReferenceStar(starName, moveMode)
        }

        const relatedSignKey = relatedStar.zodiacSignKey

        if (relatedSignKey) {
          setSelectedSignKey((current) =>
            current === relatedSignKey ? current : relatedSignKey,
          )
        }

        setSkyFocus({
          kind: 'star',
          starName,
        })
      },
    )

    const syncSnapshot = useEffectEvent((recenterView: boolean) => {
      const selectedSign = findConstellation(dataset, selectedSignKey)
      const nextSnapshot = buildSkySnapshot(
        selectedSign,
        dataset.allConstellations,
        dataset.fieldStars,
        dataset.referenceStars,
        VANCOUVER_LOCATION,
        now,
      )

      snapshotRef.current = nextSnapshot
      setSnapshot(nextSnapshot)

      if (recenterView || !viewCenterRef.current) {
        moveViewToSign(selectedSign.key, 'jump', nextSnapshot)
        return
      }

        updateStatusHud()
        scheduleRender()
      })

    const getCanvasPoint = useEffectEvent((event: PointerEvent) => {
      const canvas = canvasRef.current

      if (!canvas) {
        return { x: 0, y: 0 }
      }

      const bounds = canvas.getBoundingClientRect()

      return {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      }
    })

    const updateCanvasInteractivity = useEffectEvent((event: PointerEvent) => {
      const canvas = canvasRef.current

      if (!canvas) {
        return
      }

      const scene = sceneRef.current
      const target = scene ? findSkyHitTarget(getCanvasPoint(event), scene) : null
      canvas.classList.toggle('is-interactive', target !== null)
    })

    const activateSkyTargetFromPoint = useEffectEvent((point: { x: number; y: number }) => {
      const target = sceneRef.current ? findSkyHitTarget(point, sceneRef.current) : null

      if (!target) {
        return
      }

      if (target.kind === 'sign') {
        recenterNextSnapshotRef.current = false
        selectSign(target.signKey)
        return
      }

      const star = snapshotRef.current.referenceStarPositions.find(
        (entry) => entry.name === target.starName,
      )

      if (star?.zodiacSignKey && star.zodiacSignKey !== selectedSignKey) {
        recenterNextSnapshotRef.current = false
        selectReferenceStar(target.starName)
        return
      }

      selectReferenceStar(target.starName)
    })

    useEffect(() => {
      const savedSign = readStorage<string>(SKY_STORAGE_KEYS.sign, DEFAULT_SIGN_KEY)
      const savedGuideSetting = readStorage<string>(SKY_STORAGE_KEYS.guide, 'true')
      const frame = window.requestAnimationFrame(() => {
        if (dataset.allConstellations.some((sign) => sign.key === savedSign)) {
          recenterNextSnapshotRef.current = true
          setSelectedSignKey(savedSign)
          setSkyFocus({
            kind: 'sign',
            signKey: savedSign,
          })
        }

        setShowGuides(savedGuideSetting !== 'false')
      })

      return () => {
        window.cancelAnimationFrame(frame)
      }
    }, [dataset.allConstellations])

    useEffect(() => {
      writeStorage(SKY_STORAGE_KEYS.sign, selectedSignKey)
    }, [selectedSignKey])

    useEffect(() => {
      writeStorage(SKY_STORAGE_KEYS.guide, showGuides ? 'true' : 'false')
    }, [showGuides])

    useEffect(() => {
      const shouldRecenter = recenterNextSnapshotRef.current || !viewCenterRef.current
      recenterNextSnapshotRef.current = false
      syncSnapshot(shouldRecenter)
    }, [selectedSignKey])

    useEffect(() => {
      syncSnapshot(false)
    }, [now])

    useEffect(() => {
      updateStatusHud()
      scheduleRender()
    }, [selectedSignKey, skyFocus, snapshot])

    useEffect(() => {
      return () => {
        if (viewAnimationFrameRef.current !== null) {
          window.cancelAnimationFrame(viewAnimationFrameRef.current)
        }
      }
    }, [])

    useEffect(() => {
      const canvas = canvasRef.current

      if (!canvas) {
        return
      }

      const resizeObserver = new ResizeObserver(() => {
        scheduleRender()
      })

      resizeObserver.observe(canvas)

      if ('fonts' in document) {
        void document.fonts.ready.then(() => {
          scheduleRender()
        })
      }

      return () => {
        resizeObserver.disconnect()
      }
    }, [])

    useEffect(() => {
      const mediaQuery = window.matchMedia('(pointer: coarse)')
      const syncPointerMode = () => {
        setIsCoarsePointer(mediaQuery.matches)
      }

      syncPointerMode()
      mediaQuery.addEventListener('change', syncPointerMode)

      return () => {
        mediaQuery.removeEventListener('change', syncPointerMode)
      }
    }, [])

    useEffect(() => {
      scheduleRender()
    }, [isCoarsePointer])

    useEffect(() => {
      verticalViewAngleRef.current = verticalViewAngle
      scheduleRender()
    }, [verticalViewAngle])

    useEffect(() => {
      scheduleRender()
    }, [showGuides])

    useEffect(() => {
      const canvas = canvasRef.current

      if (!canvas) {
        return
      }

      const endDrag = (pointerId?: number) => {
        const wasDragging = dragStateRef.current?.moved === true

        if (pointerId != null && canvas.hasPointerCapture(pointerId)) {
          canvas.releasePointerCapture(pointerId)
        }

        dragStateRef.current = null
        canvas.classList.remove('is-dragging')

        if (wasDragging) {
          scheduleRender()
        }
      }

      const handlePointerDown = (event: PointerEvent) => {
        const viewCenter = viewCenterRef.current

        if (event.button !== 0 || !viewCenter) {
          return
        }

        cancelViewAnimation()

        const bounds = canvas.getBoundingClientRect()

        dragStateRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startAzimuth: viewCenter.azimuth,
          startAltitude: viewCenter.altitude,
          startVerticalViewAngle: verticalViewAngleRef.current,
          width: Math.max(bounds.width, 1),
          height: Math.max(bounds.height, 1),
          moved: false,
        }

        canvas.setPointerCapture(event.pointerId)
        event.preventDefault()
      }

      const handlePointerMove = (event: PointerEvent) => {
        const dragState = dragStateRef.current

        if (!dragState || event.pointerId !== dragState.pointerId) {
          if (isCoarsePointer || event.pointerType !== 'mouse') {
            canvas.classList.remove('is-interactive')
            return
          }

          updateCanvasInteractivity(event)
          return
        }

        const deltaX = event.clientX - dragState.startX
        const deltaY = event.clientY - dragState.startY
        const dragDistance = Math.hypot(deltaX, deltaY)

        if (!dragState.moved && dragDistance < 3) {
          return
        }

        if (!dragState.moved) {
          dragState.moved = true
          canvas.classList.add('is-dragging')
          canvas.classList.remove('is-interactive')
        }

        viewCenterRef.current = {
          azimuth: normalizeAngle(
            dragState.startAzimuth -
              (deltaX / dragState.width) *
                getHorizontalViewAngle(
                  dragState.width,
                  dragState.height,
                  dragState.startVerticalViewAngle,
                ),
          ),
          altitude: clampViewAltitude(
            dragState.startAltitude +
              (deltaY / dragState.height) * dragState.startVerticalViewAngle,
          ),
        }

        event.preventDefault()
        updateStatusHud()
        scheduleRender()
      }

      const handlePointerUp = (event: PointerEvent) => {
        const dragState = dragStateRef.current

        if (!dragState || dragState.pointerId !== event.pointerId) {
          return
        }

        if (!dragState.moved) {
          activateSkyTargetFromPoint(getCanvasPoint(event))
        }

        endDrag(event.pointerId)
        updateCanvasInteractivity(event)
      }

      const handlePointerCancel = (event: PointerEvent) => {
        if (dragStateRef.current?.pointerId === event.pointerId) {
          endDrag(event.pointerId)
        }
      }

      const handleLostPointerCapture = () => {
        endDrag()
      }

      const handlePointerLeave = () => {
        if (!dragStateRef.current) {
          canvas.classList.remove('is-interactive')
        }
      }

      canvas.addEventListener('pointerdown', handlePointerDown)
      canvas.addEventListener('pointermove', handlePointerMove)
      canvas.addEventListener('pointerup', handlePointerUp)
      canvas.addEventListener('pointercancel', handlePointerCancel)
      canvas.addEventListener('lostpointercapture', handleLostPointerCapture)
      canvas.addEventListener('pointerleave', handlePointerLeave)

      return () => {
        canvas.removeEventListener('pointerdown', handlePointerDown)
        canvas.removeEventListener('pointermove', handlePointerMove)
        canvas.removeEventListener('pointerup', handlePointerUp)
        canvas.removeEventListener('pointercancel', handlePointerCancel)
        canvas.removeEventListener('lostpointercapture', handleLostPointerCapture)
        canvas.removeEventListener('pointerleave', handlePointerLeave)
      }
    }, [isCoarsePointer])

    useEffect(() => {
      const timer = window.setInterval(() => {
        setNow(new Date())
      }, 60_000)

      return () => {
        window.clearInterval(timer)
      }
    }, [])

    const handleDetailsFocusSelect = useEffectEvent((nextFocus: SkyFocus) => {
      if (nextFocus.kind === 'sign') {
        selectSign(nextFocus.signKey, 'animate')
        return
      }

      selectReferenceStar(nextFocus.starName, 'animate')
    })

    const details = getSkyDetailsContent(skyFocus, snapshot, selectedSignKey)
    const selectedSign = findConstellation(dataset, selectedSignKey)
    const brightestVisibleStars = getBrightestVisibleStars(snapshot, skyFocus)
    const popularStars = getPopularStars(snapshot, skyFocus)
    const signPositionByKey = new Map(
      snapshot.allPositions.map((entry) => [entry.sign.key, entry.position]),
    )
    const canZoomIn = verticalViewAngle > MIN_VERTICAL_VIEW_ANGLE
    const canZoomOut = verticalViewAngle < MAX_VERTICAL_VIEW_ANGLE

    const adjustZoom = (direction: 'in' | 'out') => {
      setVerticalViewAngle((current) =>
        clamp(
          MIN_VERTICAL_VIEW_ANGLE,
          current + (direction === 'in' ? -VIEW_ANGLE_STEP : VIEW_ANGLE_STEP),
          MAX_VERTICAL_VIEW_ANGLE,
        ),
      )
    }

    const selectSignFromRail = (signKey: string) => {
      recenterNextSnapshotRef.current = false
      selectSign(signKey, 'animate')
    }

    const selectReferenceStarFromRail = (starName: string) => {
      selectReferenceStar(starName, 'animate')
    }

    return (
      <section className="stars-demo" id="stars" ref={ref}>
        <div className="stars-demo__inner">
          <PageMobileNav />
          <div
            className="stars-layout"
            data-details-open={isDetailsOpen ? 'true' : 'false'}
          >
            <Card className="sky-stage">
              <div className="sky-canvas-shell">
                <canvas
                  ref={canvasRef}
                  className="sky-canvas"
                  id="sky-canvas"
                  aria-label={`${selectedSign.name} constellation preview in night mode. Drag to pan and click visible stars or constellations for details.`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="sky-canvas-toggle"
                  aria-pressed={showGuides}
                  onClick={() => {
                    setShowGuides((current) => !current)
                  }}
                >
                  {showGuides ? 'Hide grid' : 'Show grid'}
                </Button>
                <Badge variant="outline" className="sky-canvas-status">
                  <span className="sky-canvas-status__row">
                    <span>{snapshot.location.label}</span>
                    <span>{formatClock(snapshot.now, snapshot.location.timezone)}</span>
                  </span>
                  <span className="sky-canvas-status__row sky-canvas-status__row--emphasis">
                    <span>
                      View <span ref={viewValueRef}>{initialViewLabel}</span>
                    </span>
                    <span>
                      Tilt <span ref={tiltValueRef}>{initialTiltLabel}</span>
                    </span>
                  </span>
                  <span className="sky-canvas-status__row">
                    <span>Moon {getMoonPhaseLabel(snapshot.moon.phaseDegrees)}</span>
                    <span>{formatCompassLabel(snapshot.moon.position.azimuth)}</span>
                    <span>{formatAltitudeLabel(snapshot.moon.position.altitude)}</span>
                  </span>
                </Badge>
                <div className="sky-canvas-zoom" aria-label="Sky zoom controls">
                  <Button
                    variant="outline"
                    size="icon"
                    className="sky-canvas-zoom__button"
                    aria-label="Zoom in"
                    onClick={() => {
                      adjustZoom('in')
                    }}
                    disabled={!canZoomIn}
                  >
                    +
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="sky-canvas-zoom__button"
                    aria-label="Zoom out"
                    onClick={() => {
                      adjustZoom('out')
                    }}
                    disabled={!canZoomOut}
                  >
                    -
                  </Button>
                </div>
              </div>
            </Card>

            <aside
              className="zodiac-rail"
              aria-label="Constellation selection"
              data-details-open={isDetailsOpen ? 'true' : 'false'}
            >
              <Button
                variant="outline"
                size="icon-sm"
                className="zodiac-rail__drawer-toggle"
                aria-controls="sky-details-panel"
                aria-expanded={isDetailsOpen}
                aria-label={isDetailsOpen ? 'Hide details' : 'Show details'}
                onClick={() => {
                  setIsDetailsOpen((current) => !current)
                }}
              >
                <span className="zodiac-rail__drawer-toggle-icon" aria-hidden="true">
                  {isDetailsOpen ? '>' : '<'}
                </span>
              </Button>

              {isDetailsOpen ? (
                <div className="zodiac-rail__drawer" id="sky-details-panel">
                  <p className="zodiac-rail__label">Details</p>
                  <SkyDetailsDrawer details={details} onSelectFocus={handleDetailsFocusSelect} />
                </div>
              ) : null}

              <div className="zodiac-rail__inner">
                <div className="zodiac-rail__groups">
                  <section className="zodiac-rail__group">
                    <p className="zodiac-rail__label">Zodiac signs</p>
                    <div className="zodiac-list" id="zodiac-list">
                      {dataset.zodiacSignsByYear.map((sign) => {
                        const isSelected = sign.key === selectedSignKey
                        const altitude =
                          signPositionByKey.get(sign.key)?.altitude ?? Number.NEGATIVE_INFINITY
                        const visibilityLabel = getVisibilityLabel(altitude)

                        return (
                          <Button
                            type="button"
                            variant="ghost"
                            key={sign.key}
                            data-sign={sign.key}
                            className={getZodiacRailButtonClassName({
                              isActive: isSelected,
                              isBelowHorizon: altitude <= 0,
                            })}
                            aria-pressed={isSelected}
                            onClick={() => selectSignFromRail(sign.key)}
                          >
                            <strong>{sign.name}</strong>
                            <span>{sign.railSubtitle ?? sign.dates}</span>
                            <small>{visibilityLabel}</small>
                          </Button>
                        )
                      })}
                    </div>
                  </section>

                  {dataset.popularConstellations.length > 0 ? (
                    <section className="zodiac-rail__group">
                      <p className="zodiac-rail__label zodiac-rail__label--section">
                        Popular constellations
                      </p>
                      <div className="zodiac-list zodiac-list--popular">
                        {dataset.popularConstellations.map((sign) => {
                          const isSelected = sign.key === selectedSignKey
                          const altitude =
                            signPositionByKey.get(sign.key)?.altitude ??
                            Number.NEGATIVE_INFINITY
                          const visibilityLabel = getVisibilityLabel(altitude)

                          return (
                            <Button
                              type="button"
                              variant="ghost"
                              key={sign.key}
                              data-sign={sign.key}
                              className={getZodiacRailButtonClassName({
                                isActive: isSelected,
                                isBelowHorizon: altitude <= 0,
                              })}
                              aria-pressed={isSelected}
                              onClick={() => selectSignFromRail(sign.key)}
                            >
                              <strong>{sign.name}</strong>
                              <span>{sign.railSubtitle ?? sign.dates}</span>
                              <small>{visibilityLabel}</small>
                            </Button>
                          )
                        })}
                      </div>
                    </section>
                  ) : null}

                  {brightestVisibleStars.length > 0 ? (
                    <section className="zodiac-rail__group">
                      <p className="zodiac-rail__label zodiac-rail__label--section">
                        Brightest stars above horizon
                      </p>
                      <div className="sky-object-list" aria-label="Brightest stars above horizon">
                        {brightestVisibleStars.map((star) => {
                          const content = (
                            <>
                              <strong>{star.name}</strong>
                              <span>{star.subtitle}</span>
                              <small>{star.meta}</small>
                            </>
                          )

                          return star.focus ? (
                            <Button
                              type="button"
                              variant="ghost"
                              key={star.key}
                              className={getSkyObjectButtonClassName({
                                isActive: star.isActive,
                              })}
                              aria-pressed={star.isActive}
                              onClick={() => selectReferenceStarFromRail(star.focus!.starName)}
                            >
                              {content}
                            </Button>
                          ) : (
                            <div className="sky-object-row sky-object-row--static" key={star.key}>
                              {content}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  ) : null}

                  {popularStars.length > 0 ? (
                    <section className="zodiac-rail__group">
                      <p className="zodiac-rail__label zodiac-rail__label--section">
                        Popular stars
                      </p>
                      <div className="sky-object-list" aria-label="Popular stars">
                        {popularStars.map((star) => (
                          <Button
                            type="button"
                            variant="ghost"
                            key={star.key}
                            className={getSkyObjectButtonClassName({
                              isActive: star.isActive,
                              isBelowHorizon: star.isBelowHorizon,
                            })}
                            aria-pressed={star.isActive}
                            onClick={() => selectReferenceStarFromRail(star.focus.starName)}
                          >
                            <strong>{star.name}</strong>
                            <span>{star.subtitle}</span>
                            <small>{star.meta}</small>
                          </Button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    )
  },
)

function findConstellation(dataset: SkyDataset, signKey: string) {
  return (
    dataset.allConstellations.find((sign) => sign.key === signKey) ??
    dataset.allConstellations.find((sign) => sign.key === DEFAULT_SIGN_KEY) ??
    dataset.allConstellations[0] ??
    dataset.zodiacSigns[0]
  )
}

type StarRailItem = {
  key: string
  name: string
  subtitle: string
  meta: string
  isActive: boolean
  isBelowHorizon: boolean
}

type VisibleBrightStarRailItem = StarRailItem & {
  focus: { kind: 'star'; starName: string } | null
}

type PopularStarRailItem = StarRailItem & {
  focus: { kind: 'star'; starName: string }
}

function getBrightestVisibleStars(
  snapshot: SkySnapshot,
  currentFocus: SkyFocus,
): VisibleBrightStarRailItem[] {
  const referenceStarsByName = new Map(
    snapshot.referenceStarPositions.map((star) => [normalizeStarName(star.name), star]),
  )
  const signNameByHipId = new Map(
    snapshot.allPositions.flatMap((entry) =>
      entry.stars.map((star) => [star.hipId, entry.sign.name] as const),
    ),
  )
  const uniqueVisibleStars = new Map<
    number,
    (SkySnapshot['fieldStarPositions'][number] | SkySnapshot['allPositions'][number]['stars'][number]) & {
      name: string
    }
  >()

  ;[...snapshot.allPositions.flatMap((entry) => entry.stars), ...snapshot.fieldStarPositions].forEach(
    (star) => {
      if (!star.name || star.position.altitude <= 0 || uniqueVisibleStars.has(star.hipId)) {
        return
      }

      uniqueVisibleStars.set(star.hipId, {
        ...star,
        name: star.name,
      })
    },
  )

  return Array.from(uniqueVisibleStars.values())
    .sort((first, second) => first.magnitude - second.magnitude || second.position.altitude - first.position.altitude)
    .slice(0, 6)
    .map((star) => {
      const referenceStar = referenceStarsByName.get(normalizeStarName(star.name))
      const constellationName = signNameByHipId.get(star.hipId)

      return {
        key: `bright-${star.hipId}`,
        name: star.name,
        subtitle: constellationName ?? 'Visible above the horizon',
        meta: [
          `Mag ${formatStarMagnitude(star.magnitude)}`,
          formatCompassLabel(star.position.azimuth),
          formatAltitudeLabel(star.position.altitude),
        ].join(' / '),
        focus: referenceStar
          ? {
              kind: 'star',
              starName: referenceStar.name,
            }
          : null,
        isActive: currentFocus.kind === 'star' && currentFocus.starName === star.name,
        isBelowHorizon: false,
      }
    })
}

function getPopularStars(
  snapshot: SkySnapshot,
  currentFocus: SkyFocus,
): PopularStarRailItem[] {
  return snapshot.referenceStarPositions
    .sort((first, second) => second.priority - first.priority || second.position.altitude - first.position.altitude)
    .map((star) => ({
      key: `popular-${star.name}`,
      name: star.name,
      subtitle: star.constellation,
      meta: [
        getVisibilityLabel(star.position.altitude),
        formatCompassLabel(star.position.azimuth),
        formatAltitudeLabel(star.position.altitude),
      ].join(' / '),
      focus: {
        kind: 'star',
        starName: star.name,
      },
      isActive: currentFocus.kind === 'star' && currentFocus.starName === star.name,
      isBelowHorizon: star.position.altitude <= 0,
    }))
}

function normalizeStarName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function formatStarMagnitude(value: number): string {
  return Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1)
}

function getVisibilityLabel(altitude: number): string {
  return altitude > 0 ? 'Visible now' : 'Below horizon'
}

function formatHudAltitudeLabel(value: number): string {
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded}\u00B0`
}

function getMoonPhaseLabel(phaseDegrees: number): string {
  if (phaseDegrees < 22.5 || phaseDegrees >= 337.5) {
    return 'new'
  }

  if (phaseDegrees < 67.5) {
    return 'waxing crescent'
  }

  if (phaseDegrees < 112.5) {
    return 'first quarter'
  }

  if (phaseDegrees < 157.5) {
    return 'waxing gibbous'
  }

  if (phaseDegrees < 202.5) {
    return 'full'
  }

  if (phaseDegrees < 247.5) {
    return 'waning gibbous'
  }

  if (phaseDegrees < 292.5) {
    return 'last quarter'
  }

  return 'waning crescent'
}
