import type { SkyFocus } from '@/lib/types'
import type { SkyScene, SkySurface } from './types'

type DrawSkySceneOptions = {
  scene: SkyScene
  surface: SkySurface
  selectedSignKey: string
  focus: SkyFocus
  showGuide: boolean
}

export function resizeSkyCanvas(canvas: HTMLCanvasElement): SkySurface | null {
  const bounds = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.round(bounds.width))
  const height = Math.max(1, Math.round(bounds.height))

  if (width === 0 || height === 0) {
    return null
  }

  const dpr = window.devicePixelRatio || 1
  const pixelWidth = Math.max(1, Math.round(width * dpr))
  const pixelHeight = Math.max(1, Math.round(height * dpr))

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }

  return {
    width,
    height,
    dpr,
  }
}

export function drawSkyScene(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  options: DrawSkySceneOptions,
): void {
  const { scene, surface, selectedSignKey, focus, showGuide } = options

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(surface.dpr, surface.dpr)

  drawSkyBackground(ctx, surface.width, surface.height)

  if (showGuide) {
    drawSkyGuideOverlay(ctx, scene, surface.width, surface.height)
  }

  drawSkyField(ctx, scene.visibleFieldStars)
  drawReferenceStars(ctx, scene.visibleReferenceStars, focus)
  drawConstellations(ctx, scene.visibleConstellations, selectedSignKey, focus)
  drawHorizon(ctx, scene, surface.width)
}

function drawSkyBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#081121')
  gradient.addColorStop(0.52, '#101d38')
  gradient.addColorStop(1, '#1a2c48')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const haze = ctx.createRadialGradient(
    width * 0.5,
    height * 0.18,
    0,
    width * 0.5,
    height * 0.18,
    width * 0.72,
  )
  haze.addColorStop(0, 'rgba(149, 171, 255, 0.16)')
  haze.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = haze
  ctx.fillRect(0, 0, width, height)
}

function drawSkyGuideOverlay(
  ctx: CanvasRenderingContext2D,
  scene: SkyScene,
  width: number,
  height: number,
): void {
  ctx.save()
  ctx.globalAlpha = 0.72
  ctx.font = '12px "IBM Plex Mono"'
  ctx.textBaseline = 'alphabetic'

  scene.altitudeGuides.forEach(({ altitude, label, y, major }) => {
    ctx.strokeStyle =
      altitude < 0
        ? major
          ? 'rgba(133, 163, 228, 0.2)'
          : 'rgba(118, 150, 220, 0.12)'
        : major
          ? 'rgba(255,255,255,0.18)'
          : 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.setLineDash(major ? [6, 10] : [3, 12])
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()

    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255,255,255,0.54)'
    ctx.textAlign = 'left'
    ctx.fillText(label, 12, Math.max(18, Math.min(height - 10, y - 6)))
  })

  scene.azimuthGuides.forEach(({ label, x, major }) => {
    ctx.strokeStyle = major ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1
    ctx.setLineDash(major ? [6, 11] : [3, 13])
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()

    if (major) {
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,255,255,0.54)'
      ctx.textAlign = 'center'
      ctx.fillText(label, x, height - 14)
    }
  })

  ctx.restore()
}

function drawSkyField(
  ctx: CanvasRenderingContext2D,
  stars: SkyScene['visibleFieldStars'],
): void {
  ctx.save()

  stars.forEach((star) => {
    if (star.haloRadius > 0) {
      ctx.globalAlpha = star.opacity * 0.12
      ctx.fillStyle = star.color
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.haloRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = star.opacity
    ctx.fillStyle = star.color
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.restore()
}

function drawConstellations(
  ctx: CanvasRenderingContext2D,
  constellations: SkyScene['visibleConstellations'],
  selectedSignKey: string,
  focus: SkyFocus,
): void {
  ctx.save()
  ctx.shadowBlur = 10

  constellations.forEach(
    ({ sign, position, projected, visibleEdges, labelText, labelX, labelY, labelFontSize }) => {
      const isSelected = sign.key === selectedSignKey
      const isBelowHorizon = position.altitude < 0
      const isFocused = focus.kind === 'sign' && focus.signKey === sign.key
      const strokeOpacity = isSelected ? 0.98 : isBelowHorizon ? 0.28 : 0.48
      const textOpacity = isSelected ? 0.95 : isBelowHorizon ? 0.38 : 0.58
      const strokeWidth = isSelected ? 2.4 : 1.3

      ctx.strokeStyle = sign.accent
      ctx.shadowColor = sign.accent
      ctx.lineWidth = strokeWidth
      ctx.lineCap = 'round'
      ctx.globalAlpha = strokeOpacity

      visibleEdges.forEach(({ start, end }) => {
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
      })

      projected.forEach((point) => {
        if (!point.visible) {
          return
        }

        ctx.shadowColor = 'rgba(255,255,255,0.4)'
        ctx.globalAlpha = isFocused ? 1 : isSelected ? 0.92 : isBelowHorizon ? 0.55 : 0.76
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.shadowBlur = 0
      ctx.globalAlpha = textOpacity
      ctx.fillStyle = '#ffffff'
      ctx.font = `${labelFontSize}px "IBM Plex Mono"`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(labelText, labelX, labelY)
      ctx.shadowBlur = 10
    },
  )

  ctx.restore()
}

function drawReferenceStars(
  ctx: CanvasRenderingContext2D,
  stars: SkyScene['visibleReferenceStars'],
  focus: SkyFocus,
): void {
  ctx.save()
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.shadowBlur = 0

  stars.forEach((star) => {
    const isFocused = focus.kind === 'star' && focus.starName === star.name
    const opacity = star.position.altitude < 0 ? 0.38 : 0.62

    if (isFocused) {
      ctx.globalAlpha = 0.22
      ctx.fillStyle = star.color
      ctx.beginPath()
      ctx.arc(star.x, star.y, 11, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = 0.85
      ctx.strokeStyle = star.color
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(star.x, star.y, 6, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.globalAlpha = opacity * 0.55
    ctx.fillStyle = star.color
    ctx.beginPath()
    ctx.arc(star.x, star.y, 2.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = isFocused ? 0.92 : opacity
    ctx.fillStyle = star.color
    ctx.font = `${star.labelFontSize}px "IBM Plex Mono"`
    ctx.fillText(star.name, star.labelX, star.labelY)
  })

  ctx.restore()
}

function drawHorizon(
  ctx: CanvasRenderingContext2D,
  scene: SkyScene,
  width: number,
): void {
  if (!scene.horizonLine) {
    return
  }

  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, scene.horizonY)
  ctx.lineTo(width, scene.horizonY)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = '12px "IBM Plex Mono"'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('horizon / 0 deg', width - 28, Math.max(18, scene.horizonY - 10))
  ctx.restore()
}
