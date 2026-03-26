import type { ChartType, Color, ScriptableContext } from 'chart.js'

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

export { getColorValue, addAlpha, horizontalGradiend, verticalGradiend }
