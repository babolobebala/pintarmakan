export const datasetIdPattern = /^[A-Z][A-Z0-9_]*$/

export const datasetIdValidationMessage
  = 'Dataset ID must start with an uppercase letter and contain only uppercase letters, numbers, and underscores.'

export const supportedDatasetFieldTypes = [
  'number',
  'text',
  'string',
  'textarea',
  'select',
  'boolean',
  'date'
] as const

export const supportedDatasetPeriodicities = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY'
] as const

export type DatasetFieldType = (typeof supportedDatasetFieldTypes)[number]
export type DatasetPeriodicity = (typeof supportedDatasetPeriodicities)[number]

export type DatasetSchemaFieldOption = {
  readonly value: string
  readonly label: string
}

export type DatasetSchemaField = {
  readonly key: string
  readonly label: string
  readonly type: DatasetFieldType
  readonly required: boolean
  readonly unit?: string | null
  readonly options?: readonly DatasetSchemaFieldOption[]
}

export type DatasetRecordValidationIssue = {
  readonly key: string
  readonly label: string
  readonly message: string
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeDatasetFieldType(value: unknown): DatasetFieldType {
  switch (typeof value === 'string' ? value.trim().toLowerCase() : '') {
    case 'number':
      return 'number'
    case 'textarea':
      return 'textarea'
    case 'select':
      return 'select'
    case 'boolean':
      return 'boolean'
    case 'date':
      return 'date'
    case 'text':
      return 'text'
    case 'string':
    default:
      return 'string'
  }
}

function normalizeDateString(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())

  if (!match) {
    return null
  }

  const [, year, month, day] = match
  const normalized = `${year}-${month}-${day}`
  const parsedDate = new Date(`${normalized}T00:00:00Z`)

  return Number.isNaN(parsedDate.getTime())
    || parsedDate.toISOString().slice(0, 10) !== normalized
    ? null
    : normalized
}

function padNumber(value: number) {
  return String(value).padStart(2, '0')
}

function getIsoWeekStart(year: number, week: number) {
  const januaryFourth = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = januaryFourth.getUTCDay() || 7
  const mondayOfWeekOne = new Date(januaryFourth)

  mondayOfWeekOne.setUTCDate(januaryFourth.getUTCDate() - dayOfWeek + 1)

  const monday = new Date(mondayOfWeekOne)
  monday.setUTCDate(mondayOfWeekOne.getUTCDate() + (week - 1) * 7)

  return monday.toISOString().slice(0, 10)
}

export function formatDatasetJsonValue(value: unknown) {
  return JSON.stringify(isJsonObject(value) ? value : {}, null, 2)
}

export function parseDatasetJsonInput(value: unknown, label: string) {
  if (isJsonObject(value)) {
    return value
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`)
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`${label} must be valid JSON.`)
  }

  if (!isJsonObject(parsed)) {
    throw new Error(`${label} must be a JSON object.`)
  }

  return parsed
}

export function getDatasetSchemaFields(dataSchema: unknown): DatasetSchemaField[] {
  if (!isJsonObject(dataSchema) || !Array.isArray(dataSchema.fields)) {
    return []
  }

  return dataSchema.fields
    .map<DatasetSchemaField | null>((field) => {
      if (!isJsonObject(field)) {
        return null
      }

      const key = typeof field.key === 'string' ? field.key.trim() : ''
      const label = typeof field.label === 'string' ? field.label.trim() : ''

      if (!key || !label) {
        return null
      }

      const options = Array.isArray(field.options)
        ? field.options.map((option) => {
            if (!isJsonObject(option)) {
              return null
            }

            const value = typeof option.value === 'string' ? option.value.trim() : ''

            if (!value) {
              return null
            }

            const optionLabel = typeof option.label === 'string' && option.label.trim()
              ? option.label.trim()
              : value

            return {
              value,
              label: optionLabel
            } satisfies DatasetSchemaFieldOption
          }).filter((option): option is DatasetSchemaFieldOption => !!option)
        : undefined

      return {
        key,
        label,
        type: normalizeDatasetFieldType(field.type),
        required: field.required === true,
        unit: typeof field.unit === 'string' && field.unit.trim()
          ? field.unit.trim()
          : undefined,
        options
      } satisfies DatasetSchemaField
    })
    .filter(Boolean) as DatasetSchemaField[]
}

export function getDatasetPeriodicity(dataConfig: unknown): DatasetPeriodicity | null {
  if (!isJsonObject(dataConfig)) {
    return null
  }

  const periodicity = dataConfig.periodicity

  if (typeof periodicity !== 'string') {
    return null
  }

  const normalized = periodicity.trim().toUpperCase()

  return supportedDatasetPeriodicities.includes(normalized as DatasetPeriodicity)
    ? normalized as DatasetPeriodicity
    : null
}

export function getDatasetRegionLevel(dataConfig: unknown) {
  if (!isJsonObject(dataConfig)) {
    return null
  }

  const regionLevel = dataConfig.regionLevel

  return typeof regionLevel === 'string' && regionLevel.trim()
    ? regionLevel.trim().toUpperCase()
    : null
}

export function getDefaultPeriodInput(periodicity: DatasetPeriodicity | null, date = new Date()) {
  const year = date.getUTCFullYear()
  const month = padNumber(date.getUTCMonth() + 1)
  const day = padNumber(date.getUTCDate())

  switch (periodicity) {
    case 'MONTHLY':
      return `${year}-${month}`
    case 'QUARTERLY':
      return `${year}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`
    case 'YEARLY':
      return String(year)
    case 'WEEKLY': {
      const start = new Date(Date.UTC(year, 0, 1))
      const diff = Math.floor((Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - start.getTime()) / 86400000)
      const week = Math.max(1, Math.ceil((diff + start.getUTCDay() + 1) / 7))

      return `${year}-W${padNumber(week)}`
    }
    case 'DAILY':
    default:
      return `${year}-${month}-${day}`
  }
}

export function normalizeDatasetPeriodInput(periodicity: DatasetPeriodicity | null, input: unknown) {
  const value = typeof input === 'string' ? input.trim() : ''

  if (!value) {
    throw new Error('Period is required.')
  }

  switch (periodicity) {
    case 'MONTHLY': {
      const match = /^(\d{4})-(\d{2})$/.exec(value)

      if (!match) {
        throw new Error('Monthly period must use the YYYY-MM format.')
      }

      const normalized = normalizeDateString(`${match[1]}-${match[2]}-01`)

      if (!normalized) {
        throw new Error('Monthly period is invalid.')
      }

      return normalized
    }
    case 'QUARTERLY': {
      const match = /^(\d{4})-Q([1-4])$/i.exec(value)

      if (!match) {
        throw new Error('Quarterly period must use the YYYY-QN format, for example 2026-Q3.')
      }

      const month = Number(match[2]) * 3 - 2
      const normalized = normalizeDateString(`${match[1]}-${padNumber(month)}-01`)

      if (!normalized) {
        throw new Error('Quarterly period is invalid.')
      }

      return normalized
    }
    case 'YEARLY': {
      const match = /^(\d{4})$/.exec(value)

      if (!match) {
        throw new Error('Yearly period must use the YYYY format.')
      }

      return `${match[1]}-01-01`
    }
    case 'WEEKLY': {
      const match = /^(\d{4})-W(\d{2})$/i.exec(value)

      if (!match) {
        throw new Error('Weekly period must use the YYYY-WNN format.')
      }

      const week = Number(match[2])

      if (week < 1 || week > 53) {
        throw new Error('Weekly period is invalid.')
      }

      return getIsoWeekStart(Number(match[1]), week)
    }
    case 'DAILY':
    default: {
      const normalized = normalizeDateString(value)

      if (!normalized) {
        throw new Error('Daily period must use a valid YYYY-MM-DD date.')
      }

      return normalized
    }
  }
}

export function formatDatasetPeriod(periodicity: DatasetPeriodicity | null, periodDate: string | Date) {
  const normalized = typeof periodDate === 'string'
    ? normalizeDateString(periodDate)
    : normalizeDateString(periodDate.toISOString().slice(0, 10))

  if (!normalized) {
    return typeof periodDate === 'string' ? periodDate : periodDate.toISOString()
  }

  const [yearString = '0', monthString = '1', dayString = '1'] = normalized.split('-')
  const year = Number(yearString)
  const month = Number(monthString)
  const day = Number(dayString)
  const date = new Date(Date.UTC(year, month - 1, day))

  switch (periodicity) {
    case 'MONTHLY':
      return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date)
    case 'QUARTERLY':
      return `Q${Math.floor((month - 1) / 3) + 1} ${year}`
    case 'YEARLY':
      return String(year)
    case 'WEEKLY':
      return `Minggu ${new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeZone: 'UTC'
      }).format(date)}`
    case 'DAILY':
    default:
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeZone: 'UTC'
      }).format(date)
  }
}

export function validateDatasetRecordData(
  dataSchema: unknown,
  input: unknown
): {
  readonly data: Record<string, unknown>
  readonly issues: readonly DatasetRecordValidationIssue[]
} {
  const fields = getDatasetSchemaFields(dataSchema)
  const values = isJsonObject(input) ? input : {}
  const data: Record<string, unknown> = {}
  const issues: DatasetRecordValidationIssue[] = []

  for (const field of fields) {
    const rawValue = values[field.key]
    const isEmpty
      = rawValue === undefined
        || rawValue === null
        || (typeof rawValue === 'string' && rawValue.trim() === '')

    if (isEmpty) {
      if (field.required) {
        issues.push({
          key: field.key,
          label: field.label,
          message: `${field.label} is required.`
        })
      }

      continue
    }

    switch (field.type) {
      case 'number': {
        const value = typeof rawValue === 'number'
          ? rawValue
          : Number(typeof rawValue === 'string' ? rawValue.trim() : rawValue)

        if (!Number.isFinite(value)) {
          issues.push({
            key: field.key,
            label: field.label,
            message: `${field.label} must be a valid number.`
          })
          continue
        }

        data[field.key] = value
        continue
      }
      case 'boolean': {
        if (typeof rawValue === 'boolean') {
          data[field.key] = rawValue
          continue
        }

        if (typeof rawValue === 'string') {
          const normalized = rawValue.trim().toLowerCase()

          if (normalized === 'true' || normalized === '1') {
            data[field.key] = true
            continue
          }

          if (normalized === 'false' || normalized === '0') {
            data[field.key] = false
            continue
          }
        }

        issues.push({
          key: field.key,
          label: field.label,
          message: `${field.label} must be true or false.`
        })
        continue
      }
      case 'select': {
        const value = typeof rawValue === 'string' ? rawValue.trim() : ''

        if (!value) {
          issues.push({
            key: field.key,
            label: field.label,
            message: `${field.label} must be selected from the available options.`
          })
          continue
        }

        const optionValues = new Set((field.options ?? []).map(option => option.value))

        if (optionValues.size > 0 && !optionValues.has(value)) {
          issues.push({
            key: field.key,
            label: field.label,
            message: `${field.label} must use one of the configured options.`
          })
          continue
        }

        data[field.key] = value
        continue
      }
      case 'date': {
        const value = typeof rawValue === 'string' ? normalizeDateString(rawValue) : null

        if (!value) {
          issues.push({
            key: field.key,
            label: field.label,
            message: `${field.label} must be a valid YYYY-MM-DD date.`
          })
          continue
        }

        data[field.key] = value
        continue
      }
      case 'textarea':
      case 'text':
      case 'string':
      default: {
        if (typeof rawValue !== 'string') {
          issues.push({
            key: field.key,
            label: field.label,
            message: `${field.label} must be text.`
          })
          continue
        }

        data[field.key] = rawValue
      }
    }
  }

  return {
    data,
    issues
  }
}
