import '@unovis/ts/styles/index.js'

export type ChartAccessor<Datum, Value = number> = (
  datum: Datum,
  index: number,
  ...args: unknown[]
) => Value

export type CartesianChartSeries<Datum> = {
  key: string
  label: string
  y: ChartAccessor<Datum, number>
  color?: string
}

export type ChartLegendItem = {
  label: string
  color: string
}

export const chartPalette: string[] = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#7c3aed',
  '#ea580c',
  '#4f46e5'
]

export function useUnovisStyles() {
  return true
}

export function resolveChartColor(color: string | undefined, index: number): string {
  return color ?? chartPalette[index % chartPalette.length] ?? chartPalette[0]!
}

export function buildLegendItems<Datum>(series: CartesianChartSeries<Datum>[]): ChartLegendItem[] {
  return series.map((item, index) => ({
    label: item.label,
    color: resolveChartColor(item.color, index)
  }))
}

export function compactNumberTickFormat(locale = 'id-ID', maximumFractionDigits = 1) {
  return (tick: number | Date) => {
    if (tick instanceof Date) {
      return tick.toLocaleDateString(locale)
    }

    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits
    }).format(tick)
  }
}

export function sumBy<Datum>(data: Datum[], accessor: ChartAccessor<Datum, number>) {
  return data.reduce((sum, item, index) => sum + accessor(item, index), 0)
}
