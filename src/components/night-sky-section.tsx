'use client'

import { forwardRef, useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  DEFAULT_SIGN_KEY,
  FALLBACK_LOCATION,
  MAX_VERTICAL_VIEW_ANGLE,
  MIN_VERTICAL_VIEW_ANGLE,
  SKY_STORAGE_KEYS,
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
import type { AppLocation, SkyDataset, SkyFocus } from '@/lib/types'
import { SkyDetailsDrawer } from './sky-details-drawer'
import { SectionMobileNav } from './site-nav'

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
      showGuides: false,
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
    showGuides: false,
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
      FALLBACK_LOCATION,
      initialNow,
    )

    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const statusLineRef = useRef<HTMLParagraphElement | null>(null)
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
    const [location, setLocation] = useState<AppLocation>(FALLBACK_LOCATION)
    const [now, setNow] = useState(initialNow)
    const [snapshot, setSnapshot] = useState(initialSnapshot)
    const [isDetailsOpen, setIsDetailsOpen] = useState(true)
    const [isCoarsePointer, setIsCoarsePointer] = useState(false)
    const [verticalViewAngle, setVerticalViewAngle] = useState(VERTICAL_VIEW_ANGLE)

    const updateStatusLine = useEffectEvent((nextSnapshot?: SkySnapshot) => {
      const snapshotValue = nextSnapshot ?? snapshotRef.current
      const viewCenter = viewCenterRef.current
      const statusLine = statusLineRef.current

      if (!snapshotValue || !viewCenter || !statusLine) {
        return
      }

      statusLine.textContent = [
        snapshotValue.location.label,
        formatClock(snapshotValue.now, snapshotValue.location.timezone),
        `view ${formatCompassLabel(viewCenter.azimuth)}`,
        `tilt ${formatAltitudeLabel(viewCenter.altitude)}`,
      ].join(' / ')
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
      const surface = resizeSkyCanvas(canvas, performanceProfile.maxDpr)

      if (!surface) {
        return
      }

      const scene = buildSkyViewportScene(
        snapshotValue.allPositions,
        snapshotValue.fieldStarPositions,
        snapshotValue.referenceStarPositions,
        viewCenter,
        surface.width,
        surface.height,
        {
          maxFieldStars: performanceProfile.maxFieldStars,
          maxReferenceStars: performanceProfile.maxReferenceStars,
          edgeInterpolationSteps: performanceProfile.edgeInterpolationSteps,
          showGuides: performanceProfile.showGuides,
          verticalViewAngle: verticalViewAngleRef.current,
        },
      )

      sceneRef.current = scene

      drawSkyScene(context, canvas, {
        scene,
        surface,
        selectedSignKey,
        focus: skyFocus,
        showGuide: performanceProfile.showGuides,
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
      (nextCenter: ViewCenter, moveMode: Exclude<ViewMoveMode, 'none'>, sourceSnapshot?: SkySnapshot) => {
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
          updateStatusLine(sourceSnapshot)
          scheduleRender()
          return
        }

        const startCenter = viewCenterRef.current
        const azimuthDelta = shortestAngleDelta(targetCenter.azimuth, startCenter.azimuth)
        const altitudeDelta = targetCenter.altitude - startCenter.altitude
        const travel = Math.hypot(azimuthDelta, altitudeDelta)

        if (travel < 0.3) {
          viewCenterRef.current = targetCenter
          updateStatusLine(sourceSnapshot)
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

          updateStatusLine(sourceSnapshot)
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

        moveViewToCenter(
          {
            azimuth: signEntry.position.azimuth,
            altitude: signEntry.position.altitude,
          },
          moveMode,
          snapshotValue,
        )
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

        moveViewToCenter(
          {
            azimuth: star.position.azimuth,
            altitude: star.position.altitude,
          },
          moveMode,
          snapshotValue,
        )
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
        location,
        now,
      )

      snapshotRef.current = nextSnapshot
      setSnapshot(nextSnapshot)

      if (recenterView || !viewCenterRef.current) {
        moveViewToSign(selectedSign.key, 'jump', nextSnapshot)
        return
      }

      updateStatusLine(nextSnapshot)
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
      const frame = window.requestAnimationFrame(() => {
        if (dataset.allConstellations.some((sign) => sign.key === savedSign)) {
          recenterNextSnapshotRef.current = true
          setSelectedSignKey(savedSign)
          setSkyFocus({
            kind: 'sign',
            signKey: savedSign,
          })
        }
      })

      return () => {
        window.cancelAnimationFrame(frame)
      }
    }, [dataset.allConstellations])

    useEffect(() => {
      writeStorage(SKY_STORAGE_KEYS.sign, selectedSignKey)
    }, [selectedSignKey])

    useEffect(() => {
      const shouldRecenter = recenterNextSnapshotRef.current || !viewCenterRef.current
      recenterNextSnapshotRef.current = false
      syncSnapshot(shouldRecenter)
    }, [location, selectedSignKey])

    useEffect(() => {
      syncSnapshot(false)
    }, [now])

    useEffect(() => {
      updateStatusLine()
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
        updateStatusLine()
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
      if (!('geolocation' in navigator)) {
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          recenterNextSnapshotRef.current = true
          setLocation({
            label: 'Current location',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timezone:
              Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_LOCATION.timezone,
            source: 'geolocation',
            detail: 'Using browser geolocation for the night sky.',
          })
        },
        () => {
          recenterNextSnapshotRef.current = true
          setLocation(FALLBACK_LOCATION)
        },
        {
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 15 * 60 * 1000,
        },
      )
    }, [])

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
    const popularVisibleStars = getPopularVisibleStars(snapshot, skyFocus)
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

    return (
      <section className="stars-demo" id="stars" ref={ref}>
        <div className="stars-demo__inner">
          <SectionMobileNav currentSection="stars" />
          <div
            className="stars-layout"
            data-details-open={isDetailsOpen ? 'true' : 'false'}
          >
            <div className="sky-stage">
              <div className="sky-stage__header">
                <div className="sky-stage__tools">
                  <p className="sky-stage__status" id="sky-status-line" ref={statusLineRef} />
                </div>
              </div>

              <div className="sky-canvas-shell">
                <div
                  className={`sky-canvas-visibility sky-canvas-visibility--${details.visibilityBadge.tone}`}
                >
                  {details.visibilityBadge.label}
                </div>
                <canvas
                  ref={canvasRef}
                  className="sky-canvas"
                  id="sky-canvas"
                  aria-label={`${selectedSign.name} constellation preview in night mode. Drag to pan and click visible stars or constellations for details.`}
                />
                <div className="sky-canvas-zoom" aria-label="Sky zoom controls">
                  <button
                    type="button"
                    className="sky-canvas-zoom__button"
                    aria-label="Zoom in"
                    onClick={() => {
                      adjustZoom('in')
                    }}
                    disabled={!canZoomIn}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="sky-canvas-zoom__button"
                    aria-label="Zoom out"
                    onClick={() => {
                      adjustZoom('out')
                    }}
                    disabled={!canZoomOut}
                  >
                    -
                  </button>
                </div>
              </div>
            </div>

            <aside
              className="zodiac-rail"
              aria-label="Constellation selection"
              data-details-open={isDetailsOpen ? 'true' : 'false'}
            >
              <button
                type="button"
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
              </button>

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
                          <button
                            type="button"
                            key={sign.key}
                            data-sign={sign.key}
                            className={`${isSelected ? 'is-active ' : ''}${altitude <= 0 ? 'is-below-horizon' : ''}`.trim()}
                            aria-pressed={isSelected}
                            onClick={() => {
                              recenterNextSnapshotRef.current = false
                              selectSign(sign.key, 'animate')
                            }}
                          >
                            <strong>{sign.name}</strong>
                            <span>{sign.railSubtitle ?? sign.dates}</span>
                            <small>{visibilityLabel}</small>
                          </button>
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
                            <button
                              type="button"
                              key={sign.key}
                              data-sign={sign.key}
                              className={`${isSelected ? 'is-active ' : ''}${altitude <= 0 ? 'is-below-horizon' : ''}`.trim()}
                              aria-pressed={isSelected}
                              onClick={() => {
                                recenterNextSnapshotRef.current = false
                                selectSign(sign.key, 'animate')
                              }}
                            >
                              <strong>{sign.name}</strong>
                              <span>{sign.railSubtitle ?? sign.dates}</span>
                              <small>{visibilityLabel}</small>
                            </button>
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
                            <button
                              type="button"
                              key={star.key}
                              className={`sky-object-row${star.isActive ? ' is-active' : ''}`}
                              aria-pressed={star.isActive}
                              onClick={() => {
                                selectReferenceStar(star.focus!.starName, 'animate')
                              }}
                            >
                              {content}
                            </button>
                          ) : (
                            <div className="sky-object-row sky-object-row--static" key={star.key}>
                              {content}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  ) : null}

                  {popularVisibleStars.length > 0 ? (
                    <section className="zodiac-rail__group">
                      <p className="zodiac-rail__label zodiac-rail__label--section">
                        Popular stars above horizon
                      </p>
                      <div className="sky-object-list" aria-label="Popular stars above horizon">
                        {popularVisibleStars.map((star) => (
                          <button
                            type="button"
                            key={star.key}
                            className={`sky-object-row${star.isActive ? ' is-active' : ''}`}
                            aria-pressed={star.isActive}
                            onClick={() => {
                              selectReferenceStar(star.focus.starName, 'animate')
                            }}
                          >
                            <strong>{star.name}</strong>
                            <span>{star.subtitle}</span>
                            <small>{star.meta}</small>
                          </button>
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

type VisibleStarRailItem = {
  key: string
  name: string
  subtitle: string
  meta: string
  isActive: boolean
}

type VisibleBrightStarRailItem = VisibleStarRailItem & {
  focus: { kind: 'star'; starName: string } | null
}

type VisiblePopularStarRailItem = VisibleStarRailItem & {
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
      }
    })
}

function getPopularVisibleStars(
  snapshot: SkySnapshot,
  currentFocus: SkyFocus,
): VisiblePopularStarRailItem[] {
  return snapshot.referenceStarPositions
    .filter((star) => star.position.altitude > 0)
    .sort((first, second) => second.priority - first.priority || second.position.altitude - first.position.altitude)
    .slice(0, 6)
    .map((star) => ({
      key: `popular-${star.name}`,
      name: star.name,
      subtitle: star.constellation,
      meta: [
        formatCompassLabel(star.position.azimuth),
        formatAltitudeLabel(star.position.altitude),
      ].join(' / '),
      focus: {
        kind: 'star',
        starName: star.name,
      },
      isActive: currentFocus.kind === 'star' && currentFocus.starName === star.name,
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
