import { Chart, type ChartType, type Color, type Plugin, type ScriptableContext } from 'chart.js'
import { toFont } from 'chart.js/helpers'

const computedStyle = getComputedStyle(document.getElementById('page')!)

const addAlpha = (color: string, opacity: number) => {
  if (color.startsWith('#')) {
    const alphaHex = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, '0')

    if (color.length < 7) {
      return `#${color[1]!}${color[1]!}${color[2]!}${color[2]!}${color[3]!}${color[3]!}${alphaHex}`
    }

    return color.slice(0, 7) + alphaHex
  } else if (color.endsWith(')')) {
    if (color.includes('/')) {
      return color.split('/')[0] + `/ ${opacity})`
    } else if (color.includes(',')) {
      const parts = color.split(',')

      return `${parts[0]},${parts[1]},${parts[2]}, ${opacity})`
    }

    return color.slice(0, -1) + ` / ${opacity})`
  }

  return color
}

const getColorValue = (variableName: string, opacity?: number) => {
  const value = computedStyle.getPropertyValue(variableName).trim()

  return opacity! >= 0 ? addAlpha(value, opacity!) : value
}

const horizontalGradiend = (stops: { offset: number; color: string }[]) => {
  let width!: number, gradient!: CanvasGradient

  return <T extends ChartType>(context: ScriptableContext<T>): Color | undefined => {
    const chart = context.chart,
      { ctx, chartArea } = chart

    if (chartArea) {
      const chartWidth = chartArea.right - chartArea.left

      if (!gradient || width !== chartWidth) {
        width = chartWidth

        gradient = ctx.createLinearGradient(0, 0, width, 0)
        for (const stop of stops) {
          gradient.addColorStop(stop.offset, stop.color)
        }
      }

      return gradient
    }
  }
}

const verticalGradiend = (stops: { offset: number; color: string }[]) => {
  let height!: number, max!: number, gradient!: CanvasGradient

  return <T extends ChartType>(context: ScriptableContext<T>): Color | undefined => {
    const chart = context.chart,
      { ctx, chartArea, scales } = chart

    if (chartArea) {
      const chartHeight = chartArea.bottom - chartArea.top,
        yMax = scales.y!.max

      if (!gradient || height !== chartHeight || max != yMax) {
        height = chartHeight
        max = yMax

        gradient = ctx.createLinearGradient(0, scales.y!.getPixelForValue(max), 0, chartArea.bottom)
        for (const stop of stops) {
          gradient.addColorStop(stop.offset, stop.color)
        }
      }

      return gradient
    }
  }
}

export type OuterLabel = {
  id: number
  isLeft: boolean
  x: number
  y: number
  value: number
  label: string
}

interface OuterLabelsOptions {
  enabled: boolean
  offset: number
  padding: number
  twoLines: boolean
  font: any
  color: any
  external: (ctx: { chart: Chart; labels: OuterLabel[] }) => void
}

declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    outerLabels?: OuterLabelsOptions
  }
}

const intersectCircleLine = (circle: any, line: any) => {
  const v1 = { x: line.p2.x - line.p1.x, y: line.p2.y - line.p1.y }
  const v2 = { x: line.p1.x - circle.center.x, y: line.p1.y - circle.center.y }
  let a = v1.x * v2.x + v1.y * v2.y
  const b = 2 * (v1.x * v1.x + v1.y * v1.y)
  a *= -2
  const c = Math.sqrt(a * a - 2 * b * (v2.x * v2.x + v2.y * v2.y - circle.radius * circle.radius))

  if (isNaN(c)) return []

  const u1 = (a - c) / b
  const u2 = (a + c) / b
  const ret = []

  if (u1 <= 1 && u1 >= 0) ret.push({ x: line.p1.x + v1.x * u1, y: line.p1.y + v1.y * u1 })
  if (u2 <= 1 && u2 >= 0) ret.push({ x: line.p1.x + v1.x * u2, y: line.p1.y + v1.y * u2 })

  return ret
}

const getAngle = (origin: any, point: any) => {
  let angle = Math.atan2(point.y - origin.y, point.x - origin.x)
  if (angle < -Math.PI / 2) angle += 2 * Math.PI
  return angle
}

const generatePoints = (view: any, config: any, meta: any) => {
  const gap = config.padding,
    fontSize = toFont(config.font).lineHeight

  const textTotalHeight = config.twoLines ? fontSize * 2 + gap : fontSize

  const topBound = view.y - view.outerRadius
  const bottomBound = view.y + view.outerRadius

  const startY = topBound + textTotalHeight / 2
  const endY = bottomBound - textTotalHeight / 2

  let step = textTotalHeight + 2

  const visibleSegments = meta.data.filter((v: any) => !v.hidden && v.circumference > 0).length
  const requiredSlices = Math.ceil(visibleSegments / 2)

  if (startY < endY) {
    const possibleSlices = Math.floor((endY - startY) / step) + 1
    if (possibleSlices < requiredSlices && requiredSlices > 1) {
      step = (endY - startY) / (requiredSlices - 1)
    }
  }

  const left = []
  const right = []
  const line = { p1: { x: -9999, y: 0 }, p2: { x: 9999, y: 0 } }
  const circle = {
    radius: view.outerRadius + config.offset,
    center: { x: view.x, y: view.y },
  }

  let n = startY
  while (n <= endY + 0.1) {
    line.p1.y = n
    line.p2.y = n
    const intersection = intersectCircleLine(circle, line)

    for (let i = 0; i < intersection.length; ++i) {
      const point: any = intersection[i]
      const data = { x: point.x, y: point.y, angle: getAngle(view, point), taken: false }

      if (point.x < view.x) left.push(data)
      else right.push(data)
    }
    n += step
  }

  return [...left, ...right]
}

const resolveLabels = (points: any, meta: any, dataset: any, config: any, chart: any) => {
  const labels: any = []

  const rightSegments: any = []
  const leftSegments: any = []

  meta.data.forEach((view: any, i: any) => {
    if (view.hidden || view.circumference === 0) return
    const angle = view.startAngle + (view.endAngle - view.startAngle) / 2
    const targetX = view.x + Math.cos(angle) * view.outerRadius

    if (targetX < view.x) leftSegments.push({ view, i, angle })
    else rightSegments.push({ view, i, angle })
  })

  leftSegments.reverse()

  const processQueue = [...rightSegments, ...leftSegments]

  processQueue.forEach((seg) => {
    const availablePoints = points.filter((p: any) => !p.taken)
    if (!availablePoints.length) return

    const closestPoint = availablePoints.reduce((prev: any, curr: any) =>
      Math.abs(curr.angle - seg.angle) < Math.abs(prev.angle - seg.angle) ? curr : prev
    )

    closestPoint.taken = true

    const label = chart.config.data.labels[seg.i] || ''
    const value = dataset.data[seg.i]

    labels.push({ ...closestPoint, label, value, view: seg.view })
  })

  return labels
}

const drawLabels = (chart: Chart, labels: any, config: any) => {
  const ctx = chart.ctx,
    externalData: OuterLabel[] = []

  labels.forEach((point: any) => {
    ctx.save()

    const view = point.view
    const isLeft = point.x < view.x

    ctx.textBaseline = 'middle'
    ctx.textAlign = isLeft ? 'right' : 'left'

    const endX: number = point.x
    const endY: number = point.y

    const angle = view.startAngle + (view.endAngle - view.startAngle) / 2,
      cos = Math.cos(angle),
      sin = Math.sin(angle)

    const midR = view.outerRadius - 5
    const sX = view.x + cos * midR
    const sY = view.y + sin * midR

    const aX = view.x + cos * view.outerRadius
    const aY = view.y + sin * view.outerRadius
    const dist = Math.hypot(endX - aX, endY - aY)

    const cp1X = sX + cos * (5 + dist * 0.15)
    const cp1Y = sY + sin * (5 + dist * 0.15)

    const curvature = config.lineCurvature ?? 0.15
    const cp2X = (sX + endX) / 2 + cos * dist * curvature
    const cp2Y = (sY + endY) / 2 + sin * dist * curvature

    ctx.strokeStyle = view.options.backgroundColor

    ctx.beginPath()
    ctx.moveTo(endX, endY)
    ctx.setLineDash([2, 4])
    ctx.bezierCurveTo(cp2X, cp2Y, cp1X, cp1Y, sX, sY)
    ctx.stroke()

    ctx.restore()

    externalData.push({
      id: view.$context.dataIndex,
      isLeft: isLeft,
      x: endX,
      y: endY,
      value: point.value,
      label: point.label,
    })
  })

  if (typeof config.external === 'function') {
    config.external({ chart, labels: externalData })
  }
}

const outerLabelsPlugin: Plugin<ChartType, OuterLabelsOptions> = {
  id: 'outerLabels',
  defaults: {
    offset: 15,
    padding: 5,
    twoLines: false,
  },
  afterDatasetsDraw: (chart, args, options) => {
    if (options.enabled) {
      const meta = chart.getDatasetMeta(0)
      const dataset = chart.config.data.datasets[0]

      if (meta.data?.length && dataset) {
        const points = generatePoints(meta.data[0], options, meta)

        if (points.length) {
          drawLabels(chart, resolveLabels(points, meta, dataset, options, chart), options)
        }
      }
    }
  },
}

const compensateBorderPlugin = {
  id: 'compensateBorder',
  afterDatasetDraw(chart: any, args: any) {
    const meta = args.meta
    const ctx = chart.ctx

    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000'

    meta.data.forEach((arc: any) => {
      if (arc.hidden || arc.circumference === 0) return

      const bw = arc.options.borderWidth ?? 0
      const gapPx = Array.isArray(bw) ? Math.max(...bw) : bw

      if (gapPx > 0) {
        ctx.lineWidth = gapPx
        ctx.beginPath()
        ctx.arc(arc.x, arc.y, arc.outerRadius, arc.startAngle, arc.endAngle)
        ctx.arc(arc.x, arc.y, arc.innerRadius, arc.endAngle, arc.startAngle, true)
        ctx.closePath()

        ctx.stroke()
      }
    })

    ctx.restore()
  },
  afterUpdate(chart: any) {
    const meta = chart.getDatasetMeta(0)
    if (!meta.data || !meta.data.length) return

    const outerR = meta.data[0].outerRadius
    if (!outerR) return

    const dataset = chart.data.datasets[0]
    const bw = dataset.borderWidth ?? 0
    const gapPx = Array.isArray(bw) ? Math.max(...bw) : bw
    if (gapPx <= 0) return

    const gapRad = gapPx / outerR

    const visibleArcs = meta.data.filter((a: any) => !a.hidden && a.circumference > 0)
    const n = visibleArcs.length
    if (n === 0) return

    const circOpt = chart.options.circumference ?? 360
    const rotOpt = chart.options.rotation ?? -90

    const totalCircumference = circOpt * (Math.PI / 180)
    const startAngle = rotOpt * (Math.PI / 180)

    const dataAngle = totalCircumference - gapRad * n
    if (dataAngle <= 0) return

    const totalData = visibleArcs.reduce((sum: any, arc: any) => {
      const dataIndex = arc.$context.dataIndex
      return sum + (+dataset.data[dataIndex] || 0)
    }, 0)

    let cur = startAngle

    meta.data.forEach((arc: any) => {
      if (arc.hidden || arc.circumference === 0) return

      const dataIndex = arc.$context.dataIndex
      const val = +dataset.data[dataIndex] || 0

      const visualSpan = (val / totalData) * dataAngle

      const actualSpan = visualSpan + gapRad

      arc.startAngle = cur
      arc.endAngle = cur + actualSpan
      arc.circumference = actualSpan

      cur += actualSpan
    })
  },
}

export { getColorValue, addAlpha, horizontalGradiend, verticalGradiend, compensateBorderPlugin, outerLabelsPlugin }
