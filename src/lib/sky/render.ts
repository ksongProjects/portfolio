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
  drawHorizon(ctx, scene)
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
  ctx.font = '12px "Anonymous Pro"'
  ctx.textBaseline = 'alphabetic'

  scene.altitudeGuides.forEach(({ altitude, label, paths, labelPoint, major }) => {
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
    paths.forEach((path) => {
      ctx.beginPath()
      ctx.moveTo(path[0].x, path[0].y)

      for (let index = 1; index < path.length; index += 1) {
        ctx.lineTo(path[index].x, path[index].y)
      }

      ctx.stroke()
    })

    if (labelPoint) {
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,255,255,0.54)'
      ctx.textAlign = 'left'
      ctx.fillText(label, 12, Math.max(18, Math.min(height - 10, labelPoint.y - 6)))
    }
  })

  scene.azimuthGuides.forEach(({ label, paths, labelPoint, major }) => {
    ctx.strokeStyle = major ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1
    ctx.setLineDash(major ? [6, 11] : [3, 13])
    paths.forEach((path) => {
      ctx.beginPath()
      ctx.moveTo(path[0].x, path[0].y)

      for (let index = 1; index < path.length; index += 1) {
        ctx.lineTo(path[index].x, path[index].y)
      }

      ctx.stroke()
    })

    if (major && labelPoint) {
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,255,255,0.54)'
      const placement = getEdgeAwareLabelPlacement(labelPoint, width, height)
      ctx.textAlign = placement.textAlign
      ctx.textBaseline = placement.textBaseline
      ctx.fillText(label, placement.x, placement.y)
      ctx.textBaseline = 'alphabetic'
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
    const isBelowHorizon = star.position.altitude < 0
    const opacity = isBelowHorizon ? star.opacity * 0.18 : star.opacity
    const haloOpacity = isBelowHorizon ? 0 : star.opacity * 0.12

    if (star.haloRadius > 0) {
      ctx.globalAlpha = haloOpacity
      ctx.fillStyle = star.color
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.haloRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = opacity
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
      const strokeOpacity = isSelected
        ? isBelowHorizon
          ? 0.5
          : 0.98
        : isBelowHorizon
          ? 0.14
          : 0.48
      const textOpacity = isSelected
        ? isBelowHorizon
          ? 0.7
          : 0.95
        : isBelowHorizon
          ? 0.2
          : 0.58
      const strokeWidth = isSelected ? 2.4 : 1.3

      ctx.strokeStyle = sign.accent
      ctx.shadowColor = sign.accent
      ctx.lineWidth = strokeWidth
      ctx.lineCap = 'round'
      ctx.setLineDash(isBelowHorizon ? [4, 9] : [])
      ctx.globalAlpha = strokeOpacity

      visibleEdges.forEach(({ points }) => {
        ctx.beginPath()

        points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y)
            return
          }

          ctx.lineTo(point.x, point.y)
        })

        ctx.stroke()
      })

      projected.forEach((point) => {
        if (!point.visible) {
          return
        }

        ctx.shadowColor = 'rgba(255,255,255,0.4)'
        ctx.globalAlpha = isFocused
          ? isBelowHorizon
            ? 0.74
            : 1
          : isSelected
            ? isBelowHorizon
              ? 0.56
              : 0.92
            : isBelowHorizon
              ? 0.2
              : 0.76
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.setLineDash([])
      ctx.shadowBlur = 0
      ctx.globalAlpha = textOpacity
      ctx.fillStyle = '#ffffff'
      ctx.font = `${labelFontSize}px "Anonymous Pro"`
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
    const isBelowHorizon = star.position.altitude < 0
    const opacity = isBelowHorizon ? 0.22 : 0.62

    if (isFocused) {
      ctx.globalAlpha = isBelowHorizon ? 0.14 : 0.22
      ctx.fillStyle = star.color
      ctx.beginPath()
      ctx.arc(star.x, star.y, 11, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = isBelowHorizon ? 0.55 : 0.85
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
    ctx.font = `${star.labelFontSize}px "Anonymous Pro"`
    ctx.fillText(star.name, star.labelX, star.labelY)
  })

  ctx.restore()
}

function getEdgeAwareLabelPlacement(
  point: { x: number; y: number },
  width: number,
  height: number,
): {
  x: number
  y: number
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
} {
  const edgeThreshold = 28
  let x = point.x
  let y = point.y
  let textAlign: CanvasTextAlign = 'center'
  let textBaseline: CanvasTextBaseline = 'middle'

  if (point.x <= edgeThreshold) {
    textAlign = 'left'
    x += 6
  } else if (point.x >= width - edgeThreshold) {
    textAlign = 'right'
    x -= 6
  }

  if (point.y <= edgeThreshold) {
    textBaseline = 'top'
    y += 6
  } else if (point.y >= height - edgeThreshold) {
    textBaseline = 'bottom'
    y -= 6
  }

  return {
    x,
    y,
    textAlign,
    textBaseline,
  }
}

function drawHorizon(
  ctx: CanvasRenderingContext2D,
  scene: SkyScene,
): void {
  if (!scene.horizon) {
    return
  }

  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 1
  scene.horizon.paths.forEach((path) => {
    ctx.beginPath()
    ctx.moveTo(path[0].x, path[0].y)

    for (let index = 1; index < path.length; index += 1) {
      ctx.lineTo(path[index].x, path[index].y)
    }

    ctx.stroke()
  })

  if (scene.horizon.labelPoint) {
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.font = '12px "Anonymous Pro"'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('horizon / 0 deg', scene.horizon.labelPoint.x - 10, scene.horizon.labelPoint.y - 10)
  }

  ctx.restore()
}
