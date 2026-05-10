import type { ChartType, Color, ScriptableContext } from 'chart.js'

const computedStyle = getComputedStyle(document.getElementById('page')!)

export const compensateBorderPlugin = {
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

export { getColorValue, addAlpha, horizontalGradiend, verticalGradiend }
