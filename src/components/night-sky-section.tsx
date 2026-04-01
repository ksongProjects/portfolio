'use client'

import { forwardRef, useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  DEFAULT_SIGN_KEY,
  FALLBACK_LOCATION,
  SKY_STORAGE_KEYS,
  VERTICAL_VIEW_ANGLE,
} from '@/lib/sky/constants'
import { getSkyDetailsContent } from '@/lib/sky/details'
import { drawSkyScene, resizeSkyCanvas } from '@/lib/sky/render'
import { buildSkyViewportScene, findSkyHitTarget } from '@/lib/sky/scene'
import { buildSkySnapshot } from '@/lib/sky/snapshot'
import type { SkyScene, SkySnapshot } from '@/lib/sky/types'
import {
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

type NightSkySectionProps = {
  dataset: SkyDataset
  initialNowIso: string
  isActive: boolean
}

type SkyDragState =
  | {
      pointerId: number
      startX: number
      startY: number
      startAzimuth: number
      startAltitude: number
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

export const NightSkySection = forwardRef<HTMLElement, NightSkySectionProps>(
  function NightSkySection({ dataset, initialNowIso, isActive }, ref) {
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

    const [selectedSignKey, setSelectedSignKey] = useState(initialSign.key)
    const [skyFocus, setSkyFocus] = useState<SkyFocus>({
      kind: 'sign',
      signKey: initialSign.key,
    })
    const [showSkyGuide, setShowSkyGuide] = useState(true)
    const [location, setLocation] = useState<AppLocation>(FALLBACK_LOCATION)
    const [now, setNow] = useState(initialNow)
    const [snapshot, setSnapshot] = useState(initialSnapshot)
    const [isDetailsOpen, setIsDetailsOpen] = useState(true)

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

      const surface = resizeSkyCanvas(canvas)

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
      )

      sceneRef.current = scene

      drawSkyScene(context, canvas, {
        scene,
        surface,
        selectedSignKey,
        focus: skyFocus,
        showGuide: showSkyGuide,
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
      const savedGuide = readStorage<string>(SKY_STORAGE_KEYS.guide, 'shown')
      const frame = window.requestAnimationFrame(() => {
        if (dataset.allConstellations.some((sign) => sign.key === savedSign)) {
          recenterNextSnapshotRef.current = true
          setSelectedSignKey(savedSign)
          setSkyFocus({
            kind: 'sign',
            signKey: savedSign,
          })
        }

        setShowSkyGuide(savedGuide !== 'hidden')
      })

      return () => {
        window.cancelAnimationFrame(frame)
      }
    }, [dataset.allConstellations])

    useEffect(() => {
      writeStorage(SKY_STORAGE_KEYS.sign, selectedSignKey)
    }, [selectedSignKey])

    useEffect(() => {
      writeStorage(SKY_STORAGE_KEYS.guide, showSkyGuide ? 'shown' : 'hidden')
    }, [showSkyGuide])

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
    }, [selectedSignKey, showSkyGuide, skyFocus, snapshot])

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
      const canvas = canvasRef.current

      if (!canvas) {
        return
      }

      const endDrag = (pointerId?: number) => {
        if (pointerId != null && canvas.hasPointerCapture(pointerId)) {
          canvas.releasePointerCapture(pointerId)
        }

        dragStateRef.current = null
        canvas.classList.remove('is-dragging')
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
              (deltaX / dragState.width) * getHorizontalViewAngle(dragState.width, dragState.height),
          ),
          altitude: clampViewAltitude(
            dragState.startAltitude + (deltaY / dragState.height) * VERTICAL_VIEW_ANGLE,
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
    }, [])

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

    return (
      <section className="stars-demo" id="stars" ref={ref}>
        <div className="stars-demo__inner">
          <header className="section-head section-head--stars">
            <p className="section-marker">02 / Night Sky</p>
            <h2>Night Sky</h2>
          </header>

          <div className="stars-layout">
            <div className="sky-stage">
              <div className="sky-stage__header">
                <div className="sky-stage__tools">
                  <div className="sky-stage__toggles">
                    <button
                      type="button"
                      className="sky-tool-toggle"
                      id="sky-guide-toggle"
                      aria-pressed={showSkyGuide}
                      onClick={() => {
                        setShowSkyGuide((current) => !current)
                      }}
                    >
                      {showSkyGuide ? 'Hide guide overlay' : 'Show guide overlay'}
                    </button>
                  </div>
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
              </div>
            </div>
          </div>

          <aside
            className="zodiac-rail"
            aria-label="Constellation selection"
            aria-hidden={!isActive}
            data-details-open={isDetailsOpen ? 'true' : 'false'}
          >
            {isDetailsOpen ? (
              <div className="zodiac-rail__drawer" id="sky-details-panel">
                <p className="zodiac-rail__label">Sky details</p>
                <SkyDetailsDrawer details={details} onSelectFocus={handleDetailsFocusSelect} />
              </div>
            ) : null}

            <div className="zodiac-rail__inner-shell">
              <button
                type="button"
                className="zodiac-rail__drawer-toggle"
                aria-controls="sky-details-panel"
                aria-expanded={isDetailsOpen}
                aria-label={isDetailsOpen ? 'Hide sky details' : 'Show sky details'}
                onClick={() => {
                  setIsDetailsOpen((current) => !current)
                }}
              >
                <span className="zodiac-rail__drawer-toggle-icon" aria-hidden="true">
                  {isDetailsOpen ? '>' : '<'}
                </span>
              </button>

              <div className="zodiac-rail__inner">
                <div className="zodiac-rail__groups">
                  <p className="zodiac-rail__label">Zodiac signs</p>
                  <div className="zodiac-list" id="zodiac-list">
                    {dataset.zodiacSignsByYear.map((sign) => {
                      const isSelected = sign.key === selectedSignKey
                      const altitude = signPositionByKey.get(sign.key)?.altitude ?? Number.NEGATIVE_INFINITY
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

                  {dataset.popularConstellations.length > 0 ? (
                    <>
                      <p className="zodiac-rail__label zodiac-rail__label--section">
                        Popular constellations
                      </p>
                      <div className="zodiac-list zodiac-list--popular">
                        {dataset.popularConstellations.map((sign) => {
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
                    </>
                  ) : null}

                  {brightestVisibleStars.length > 0 ? (
                    <>
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
                    </>
                  ) : null}

                  {popularVisibleStars.length > 0 ? (
                    <>
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
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
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
