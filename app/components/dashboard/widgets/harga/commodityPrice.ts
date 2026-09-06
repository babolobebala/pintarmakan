import type { DatasetSchemaField } from '~~/shared/datasets'

export type HargaPriceRangeKey = '7H' | '1B' | '1T'

export const hargaPriceRangeOptions: readonly {
  key: HargaPriceRangeKey
  label: string
  hint: string
  days: number
}[] = [{
  key: '7H',
  label: '7H',
  hint: '7 Hari',
  days: 7
}, {
  key: '1B',
  label: '1B',
  hint: '1 Bulan',
  days: 30
}, {
  key: '1T',
  label: '1T',
  hint: '1 Tahun',
  days: 365
}]

export const defaultHargaPriceRange: HargaPriceRangeKey = '1B'

export function getHargaPriceRangeOption(key: HargaPriceRangeKey) {
  return hargaPriceRangeOptions.find(option => option.key === key) ?? hargaPriceRangeOptions[1]!
}

const commodityUnitPattern = /^(.+?)\s*\(Rp\/(kg|l)\)$/i

export type ParsedCommodityField = {
  key: string
  name: string
  /** Human-readable unit phrase, e.g. 'per kg' / 'per liter'. Null when label has no unit suffix. */
  unitLabel: string | null
}

/**
 * Presentation-only label/unit parsing. The Dataset schema label stays untouched;
 * we only strip the trailing "(Rp/kg)" / "(Rp/L)" token for the compact front card.
 */
export function parseCommodityField(field: Pick<DatasetSchemaField, 'key' | 'label'>): ParsedCommodityField {
  const label = field.label?.trim() || field.key
  const match = commodityUnitPattern.exec(label)

  if (!match) {
    return { key: field.key, name: label, unitLabel: null }
  }

  const unitCode = (match[2] ?? '').toLowerCase()

  return {
    key: field.key,
    name: (match[1] ?? label).trim(),
    unitLabel: unitCode === 'l' ? 'per liter' : 'per kg'
  }
}

export function shiftIsoDate(periodDate: string, deltaDays: number) {
  const [yearString = '0', monthString = '1', dayString = '1'] = periodDate.split('-')
  const date = new Date(Date.UTC(
    Number(yearString),
    Number(monthString) - 1,
    Number(dayString) + deltaDays
  ))

  return date.toISOString().slice(0, 10)
}

export const rupiahNumberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
export const changePercentFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

export function formatRupiah(value: number) {
  return rupiahNumberFormatter.format(value)
}

export function formatChangePercent(value: number) {
  return changePercentFormatter.format(value)
}
