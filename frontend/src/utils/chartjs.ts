import { ArcElement, Chart, type ChartType, type Color, type Plugin, type ScriptableContext } from 'chart.js'

import type { AnyObject } from './helper'

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

const conicGradiend = (stops: { offset: number; color: string }[]) => {
  let width!: number, height!: number, gradient!: CanvasGradient

  return <T extends ChartType>(context: ScriptableContext<T>): Color | undefined => {
    const chart = context.chart,
      { ctx, chartArea } = chart

    if (chartArea) {
      if (!gradient || width !== chart.width || height !== chart.height) {
        width = chart.width
        height = chart.height

        gradient = ctx.createConicGradient(-Math.PI / 2, width / 2, height / 2)
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
  view: ArcElement
  x: number
  y: number
  x1: number
  y1: number
  label: string
  value: number
  isLeft: boolean
  padding: number
  stroke: string
  svgPath?: string
}

interface OuterLabelsOptions {
  enabled: boolean
  padding: number
  stroke: string[] | Record<number, string> | ((ctx: ScriptableContext<'doughnut'>, options: AnyObject) => string)
  external: (ctx: { chart: Chart; labels: OuterLabel[] }) => void
}

declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    outerLabels?: OuterLabelsOptions
  }
}

const outerLabelsPlugin: Plugin<ChartType, OuterLabelsOptions> = {
  id: 'outerLabels',
  defaults: {
    padding: 20,
    stroke: [],
  },
  afterDatasetsDraw: (chart, args, options) => {
    if (options.enabled) {
      const meta = chart.getDatasetMeta(0),
        dataset = chart.config.data.datasets[0],
        labels: OuterLabel[] = []

      if (meta.data?.length && dataset?.type == 'doughnut') {
        ;(meta.data as ArcElement[]).forEach((view, id) => {
          if (!(view as any).hidden && view.circumference !== 0) {
            const angle = view.startAngle + (view.endAngle - view.startAngle) / 2,
              x = view.x + Math.cos(angle) * view.outerRadius,
              y = view.y + Math.sin(angle) * view.outerRadius

            // console.log(view, id, dataset, meta)

            labels.push({
              id,
              view,
              x,
              y,
              x1: x,
              y1: y,
              label: chart.data.labels![id] as string,
              value: dataset.data[id] as number,
              isLeft: x < view.x,
              padding: options.padding,
              stroke:
                typeof options.stroke == 'function'
                  ? options.stroke(
                      {
                        active: false,
                        chart,
                        dataIndex: id,
                        dataset: dataset as any,
                        datasetIndex: 0,
                        mode: 'default',
                        parsed: dataset.data[id] as any,
                        raw: dataset.data[id],
                        type: 'data',
                      },
                      options
                    )
                  : options.stroke[id] || (view.options.backgroundColor as string),
            })
          }
        })

        options.external({ chart, labels })
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

export {
  getColorValue,
  addAlpha,
  horizontalGradiend,
  verticalGradiend,
  conicGradiend,
  compensateBorderPlugin,
  outerLabelsPlugin,
}
