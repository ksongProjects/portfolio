'use client'

import { forwardRef, useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  DEFAULT_SIGN_KEY,
  FALLBACK_LOCATION,
  HORIZONTAL_VIEW_ANGLE,
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
  normalizeAngle,
  readStorage,
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

export const NightSkySection = forwardRef<HTMLElement, NightSkySectionProps>(
  function NightSkySection({ dataset, initialNowIso, isActive }, ref) {
    const initialSign = findZodiacSign(dataset, DEFAULT_SIGN_KEY)
    const initialNow = new Date(initialNowIso)
    const initialSnapshot = buildSkySnapshot(
      initialSign,
      dataset.zodiacSigns,
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

    const syncSnapshot = useEffectEvent((recenterView: boolean) => {
      const selectedSign = findZodiacSign(dataset, selectedSignKey)
      const nextSnapshot = buildSkySnapshot(
        selectedSign,
        dataset.zodiacSigns,
        dataset.fieldStars,
        dataset.referenceStars,
        location,
        now,
      )

      snapshotRef.current = nextSnapshot
      setSnapshot(nextSnapshot)

      if (recenterView || !viewCenterRef.current) {
        viewCenterRef.current = {
          azimuth: normalizeAngle(nextSnapshot.current.position.azimuth),
          altitude: clampViewAltitude(nextSnapshot.current.position.altitude),
        }
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
        setSelectedSignKey(target.signKey)
        setSkyFocus(target)
        return
      }

      const star = snapshotRef.current.referenceStarPositions.find(
        (entry) => entry.name === target.starName,
      )

      if (star?.zodiacSignKey && star.zodiacSignKey !== selectedSignKey) {
        recenterNextSnapshotRef.current = false
        setSelectedSignKey(star.zodiacSignKey)
        setSkyFocus(target)
        return
      }

      setSkyFocus(target)
    })

    useEffect(() => {
      const savedSign = readStorage<string>(SKY_STORAGE_KEYS.sign, DEFAULT_SIGN_KEY)
      const savedGuide = readStorage<string>(SKY_STORAGE_KEYS.guide, 'shown')
      const frame = window.requestAnimationFrame(() => {
        if (dataset.zodiacSigns.some((sign) => sign.key === savedSign)) {
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
    }, [dataset.zodiacSigns])

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
            dragState.startAzimuth - (deltaX / dragState.width) * HORIZONTAL_VIEW_ANGLE,
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

    const details = getSkyDetailsContent(skyFocus, snapshot, selectedSignKey)
    const selectedSign = findZodiacSign(dataset, selectedSignKey)

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

              <canvas
                ref={canvasRef}
                className="sky-canvas"
                id="sky-canvas"
                aria-label={`${selectedSign.name} constellation preview in night mode. Drag to pan and click visible stars or constellations for details.`}
              />
            </div>
          </div>

          <aside
            className="zodiac-rail"
            aria-label="Zodiac sign selection"
            aria-hidden={!isActive}
          >
            <div className="zodiac-rail__drawer">
              <p className="zodiac-rail__label">Sky details</p>
              <SkyDetailsDrawer details={details} />
            </div>

            <div className="zodiac-rail__inner">
              <p className="zodiac-rail__label">Zodiac signs</p>
              <div className="zodiac-list" id="zodiac-list">
                {dataset.zodiacSignsByYear.map((sign) => {
                  const isSelected = sign.key === selectedSignKey

                  return (
                    <button
                      type="button"
                      key={sign.key}
                      data-sign={sign.key}
                      className={isSelected ? 'is-active' : undefined}
                      aria-pressed={isSelected}
                      onClick={() => {
                        recenterNextSnapshotRef.current = true
                        setSelectedSignKey(sign.key)
                        setSkyFocus({
                          kind: 'sign',
                          signKey: sign.key,
                        })
                      }}
                    >
                      <strong>{sign.name}</strong>
                      <span>{sign.dates}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>
    )
  },
)

function findZodiacSign(dataset: SkyDataset, signKey: string) {
  return (
    dataset.zodiacSigns.find((sign) => sign.key === signKey) ??
    dataset.zodiacSigns.find((sign) => sign.key === DEFAULT_SIGN_KEY) ??
    dataset.zodiacSigns[0]
  )
}
