export const datasetIdPattern = /^[A-Z][A-Z0-9_]*$/

export const datasetIdValidationMessage
  = 'Dataset ID must start with an uppercase letter and contain only uppercase letters, numbers, and underscores.'

export const canonicalDatasetFieldTypes = [
  'string',
  'number',
  'select',
  'boolean',
  'date'
] as const

export const supportedDatasetFieldTypes = [
  ...canonicalDatasetFieldTypes,
  'text',
  'textarea'
] as const

export const canonicalDatasetPeriodicities = [
  'HARIAN',
  'BULANAN',
  'TRIWULANAN',
  'TAHUNAN'
] as const

export const supportedDatasetPeriodicities = canonicalDatasetPeriodicities

export const readableDatasetPeriodicities = [
  ...supportedDatasetPeriodicities] as const

export type DatasetFieldType = (typeof supportedDatasetFieldTypes)[number]
export type CanonicalDatasetFieldType = (typeof canonicalDatasetFieldTypes)[number]
export type DatasetPeriodicity = (typeof supportedDatasetPeriodicities)[number]
export type DatasetReadablePeriodicity = (typeof readableDatasetPeriodicities)[number]
export type CanonicalDatasetPeriodicity = DatasetPeriodicity

export type DatasetSchemaFieldOption = {
  readonly value: string
  readonly label: string
}

export type DatasetSchemaField = {
  readonly key: string
  readonly label: string
  readonly description?: string
  readonly type: DatasetFieldType
  readonly required: boolean
  readonly validation?: DatasetFieldValidation
  /** Legacy read compatibility only; new canonical definitions never emit this. */
  readonly unit?: string | null
  readonly options?: readonly DatasetSchemaFieldOption[]
}

export type DatasetFieldValidation = {
  readonly minLength?: number
  readonly maxLength?: number
  readonly min?: number
  readonly max?: number
  readonly decimalPlaces?: number
}

export type DatasetSchemaDefinition = {
  readonly version: 1
  readonly fields: readonly DatasetSchemaFieldDefinition[]
}

export type DatasetSchemaFieldDefinition = {
  readonly key: string
  readonly label: string
  readonly description?: string
  readonly type: CanonicalDatasetFieldType
  readonly required: boolean
  readonly validation?: DatasetFieldValidation
  readonly options?: readonly DatasetSchemaFieldOption[]
}

export type DatasetConfigDefinition = {
  readonly version: 1
  readonly periodicity: CanonicalDatasetPeriodicity
  readonly regionLevel: 'KABUPATEN' | 'KECAMATAN' | 'DESA'
  readonly startPeriod: string
  readonly endPeriod?: string
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

function assertOnlyAllowedProperties(
  value: Record<string, unknown>,
  allowedProperties: readonly string[],
  subject: string
) {
  const unsupportedProperty = Object.keys(value).find(key => !allowedProperties.includes(key))

  if (unsupportedProperty) {
    throw new Error(`${subject}: properti "${unsupportedProperty}" tidak didukung.`)
  }
}

function getRequiredFieldString(value: unknown, property: 'key' | 'label', subject: string) {
  const normalized = typeof value === 'string' ? value.trim() : ''

  if (!normalized) {
    throw new Error(`${subject}: ${property} wajib diisi.`)
  }

  return normalized
}

function getOptionalDescription(value: unknown, subject: string) {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new Error(`${subject}: description harus berupa teks.`)
  }

  return value.trim()
}

function getOptionalValidationObject(value: unknown, subject: string) {
  if (value === undefined) {
    return undefined
  }

  if (!isJsonObject(value)) {
    throw new Error(`${subject}: validation harus berupa objek.`)
  }

  return value
}

function getNonNegativeInteger(value: unknown, property: string, subject: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${subject}: ${property} harus berupa bilangan bulat non-negatif.`)
  }

  return value
}

function getFiniteNumber(value: unknown, property: string, subject: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${subject}: ${property} harus berupa angka terbatas.`)
  }

  return value
}

function validateStringFieldValidation(value: unknown, subject: string) {
  const validation = getOptionalValidationObject(value, subject)

  if (!validation) {
    return undefined
  }

  assertOnlyAllowedProperties(validation, ['minLength', 'maxLength'], `${subject}: validation`)

  const minLength = validation.minLength === undefined
    ? undefined
    : getNonNegativeInteger(validation.minLength, 'minLength', subject)
  const maxLength = validation.maxLength === undefined
    ? undefined
    : getNonNegativeInteger(validation.maxLength, 'maxLength', subject)

  if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
    throw new Error(`${subject}: minLength tidak boleh lebih besar dari maxLength.`)
  }

  return minLength === undefined && maxLength === undefined
    ? undefined
    : { minLength, maxLength } satisfies DatasetFieldValidation
}

function validateNumberFieldValidation(value: unknown, subject: string) {
  const validation = getOptionalValidationObject(value, subject)

  if (!validation) {
    return undefined
  }

  assertOnlyAllowedProperties(validation, ['min', 'max', 'decimalPlaces'], `${subject}: validation`)

  const min = validation.min === undefined
    ? undefined
    : getFiniteNumber(validation.min, 'min', subject)
  const max = validation.max === undefined
    ? undefined
    : getFiniteNumber(validation.max, 'max', subject)
  const decimalPlaces = validation.decimalPlaces === undefined
    ? undefined
    : getNonNegativeInteger(validation.decimalPlaces, 'decimalPlaces', subject)

  if (min !== undefined && max !== undefined && min > max) {
    throw new Error(`${subject}: min tidak boleh lebih besar dari max.`)
  }

  return min === undefined && max === undefined && decimalPlaces === undefined
    ? undefined
    : { min, max, decimalPlaces } satisfies DatasetFieldValidation
}

function validateSelectOptions(value: unknown, subject: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${subject}: options wajib berisi setidaknya satu pilihan.`)
  }

  const values = new Set<string>()

  return value.map((option, index) => {
    if (!isJsonObject(option)) {
      throw new Error(`${subject}: option ke-${index + 1} harus berupa objek.`)
    }

    assertOnlyAllowedProperties(option, ['value', 'label'], `${subject}: option ke-${index + 1}`)

    const optionValue = typeof option.value === 'string' ? option.value.trim() : ''
    const optionLabel = typeof option.label === 'string' ? option.label.trim() : ''

    if (!optionValue) {
      throw new Error(`${subject}: option value wajib diisi.`)
    }

    if (!optionLabel) {
      throw new Error(`${subject}: option label wajib diisi.`)
    }

    if (values.has(optionValue)) {
      throw new Error(`${subject}: option value "${optionValue}" harus unik.`)
    }

    values.add(optionValue)

    return {
      value: optionValue,
      label: optionLabel
    } satisfies DatasetSchemaFieldOption
  })
}

function validateDatasetSchemaField(value: unknown, index: number): DatasetSchemaFieldDefinition {
  const subject = `Field ke-${index + 1}`

  if (!isJsonObject(value)) {
    throw new Error(`${subject} harus berupa objek.`)
  }

  const key = getRequiredFieldString(value.key, 'key', subject)
  const label = getRequiredFieldString(value.label, 'label', subject)

  if (typeof value.type !== 'string' || !canonicalDatasetFieldTypes.includes(value.type as CanonicalDatasetFieldType)) {
    const type = typeof value.type === 'string' ? value.type : String(value.type ?? '')

    throw new Error(`Tipe field "${type}" tidak didukung.`)
  }

  if (typeof value.required !== 'boolean') {
    throw new Error(`Field "${key}": required harus berupa boolean.`)
  }

  const type = value.type as CanonicalDatasetFieldType
  const fieldSubject = `Field "${key}"`
  const commonProperties = ['key', 'label', 'description', 'type', 'required']
  const allowedProperties = type === 'string'
    ? [...commonProperties, 'validation']
    : type === 'number'
      ? [...commonProperties, 'validation']
      : type === 'select'
        ? [...commonProperties, 'options']
        : commonProperties

  assertOnlyAllowedProperties(value, allowedProperties, fieldSubject)

  const description = getOptionalDescription(value.description, fieldSubject)

  if (type === 'string') {
    const validation = validateStringFieldValidation(value.validation, fieldSubject)

    return {
      key,
      label,
      ...(description === undefined ? {} : { description }),
      type,
      required: value.required,
      ...(validation === undefined ? {} : { validation })
    }
  }

  if (type === 'number') {
    const validation = validateNumberFieldValidation(value.validation, fieldSubject)

    return {
      key,
      label,
      ...(description === undefined ? {} : { description }),
      type,
      required: value.required,
      ...(validation === undefined ? {} : { validation })
    }
  }

  if (type === 'select') {
    return {
      key,
      label,
      ...(description === undefined ? {} : { description }),
      type,
      required: value.required,
      options: validateSelectOptions(value.options, fieldSubject)
    }
  }

  return {
    key,
    label,
    ...(description === undefined ? {} : { description }),
    type,
    required: value.required
  }
}

export function validateDatasetSchemaDefinition(value: unknown): DatasetSchemaDefinition {
  if (!isJsonObject(value)) {
    throw new Error('Data schema harus berupa objek.')
  }

  assertOnlyAllowedProperties(value, ['version', 'fields'], 'Data schema')

  if (value.version !== 1) {
    throw new Error('Data schema version harus bernilai 1.')
  }

  if (!Array.isArray(value.fields)) {
    throw new Error('Data schema fields harus berupa array.')
  }

  const keys = new Set<string>()
  const fields = value.fields.map((field, index) => {
    const validatedField = validateDatasetSchemaField(field, index)

    if (keys.has(validatedField.key)) {
      throw new Error(`Key field "${validatedField.key}" duplikat.`)
    }

    keys.add(validatedField.key)

    return validatedField
  })

  return {
    version: 1,
    fields
  }
}

export function validateDatasetConfigDefinition(value: unknown): DatasetConfigDefinition {
  if (!isJsonObject(value)) {
    throw new Error('Data config harus berupa objek.')
  }

  assertOnlyAllowedProperties(value, ['version', 'periodicity', 'regionLevel', 'startPeriod', 'endPeriod'], 'Data config')

  if (value.version !== 1) {
    throw new Error('Data config version harus bernilai 1.')
  }

  if (typeof value.periodicity !== 'string' || !canonicalDatasetPeriodicities.includes(value.periodicity as CanonicalDatasetPeriodicity)) {
    const periodicity = typeof value.periodicity === 'string' ? value.periodicity : String(value.periodicity ?? '')

    throw new Error(`periodicity "${periodicity}" tidak didukung.`)
  }

  if (value.regionLevel !== 'KABUPATEN' && value.regionLevel !== 'KECAMATAN' && value.regionLevel !== 'DESA') {
    const regionLevel = typeof value.regionLevel === 'string' ? value.regionLevel : String(value.regionLevel ?? '')

    throw new Error(`regionLevel "${regionLevel}" tidak didukung.`)
  }

  if (typeof value.startPeriod !== 'string' || !value.startPeriod.trim()) {
    throw new Error('startPeriod wajib diisi.')
  }

  const startPeriod = normalizeDateString(value.startPeriod)

  if (!startPeriod) {
    throw new Error('startPeriod harus menggunakan format YYYY-MM-DD.')
  }

  const periodicity = value.periodicity as CanonicalDatasetPeriodicity
  const normalizedStartPeriod = normalizeDatasetPeriodDate(periodicity, startPeriod)

  if (normalizedStartPeriod !== startPeriod) {
    throw new Error(`startPeriod harus merupakan awal periode ${periodicity}.`)
  }

  let endPeriod: string | undefined

  if (value.endPeriod !== undefined) {
    if (typeof value.endPeriod !== 'string' || !value.endPeriod.trim()) {
      throw new Error('endPeriod harus menggunakan format YYYY-MM-DD.')
    }

    const normalizedEndPeriodValue = normalizeDateString(value.endPeriod)

    if (!normalizedEndPeriodValue) {
      throw new Error('endPeriod harus menggunakan format YYYY-MM-DD.')
    }

    endPeriod = normalizedEndPeriodValue

    const normalizedEndPeriod = normalizeDatasetPeriodDate(periodicity, endPeriod)

    if (normalizedEndPeriod !== endPeriod) {
      throw new Error(`endPeriod harus merupakan awal periode ${periodicity}.`)
    }

    if (endPeriod < startPeriod) {
      throw new Error('endPeriod tidak boleh sebelum startPeriod.')
    }
  } else if (startPeriod > getCurrentDatasetPeriod(periodicity)) {
    throw new Error('startPeriod tidak boleh setelah periode saat ini untuk Dataset tanpa endPeriod.')
  }

  return {
    version: 1,
    periodicity,
    regionLevel: value.regionLevel,
    startPeriod,
    ...(endPeriod ? { endPeriod } : {})
  }
}

function getTolerantFieldValidation(value: unknown, type: DatasetFieldType) {
  if (!isJsonObject(value)) {
    return undefined
  }

  if (type === 'string') {
    const minLength = typeof value.minLength === 'number'
      && Number.isInteger(value.minLength)
      && value.minLength >= 0
      ? value.minLength
      : undefined
    const maxLength = typeof value.maxLength === 'number'
      && Number.isInteger(value.maxLength)
      && value.maxLength >= 0
      ? value.maxLength
      : undefined

    return minLength !== undefined && maxLength !== undefined && minLength > maxLength
      ? undefined
      : minLength === undefined && maxLength === undefined
        ? undefined
        : { minLength, maxLength } satisfies DatasetFieldValidation
  }

  if (type === 'number') {
    const min = typeof value.min === 'number' && Number.isFinite(value.min)
      ? value.min
      : undefined
    const max = typeof value.max === 'number' && Number.isFinite(value.max)
      ? value.max
      : undefined
    const decimalPlaces = typeof value.decimalPlaces === 'number'
      && Number.isInteger(value.decimalPlaces)
      && value.decimalPlaces >= 0
      ? value.decimalPlaces
      : undefined

    return min !== undefined && max !== undefined && min > max
      ? undefined
      : min === undefined && max === undefined && decimalPlaces === undefined
        ? undefined
        : { min, max, decimalPlaces } satisfies DatasetFieldValidation
  }

  return undefined
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

      const type = normalizeDatasetFieldType(field.type)
      const rawType = typeof field.type === 'string' ? field.type.trim().toLowerCase() : ''
      const validation = (rawType === 'string' || rawType === 'number')
        ? getTolerantFieldValidation(field.validation, type)
        : undefined

      return {
        key,
        label,
        description: typeof field.description === 'string' ? field.description.trim() : undefined,
        type,
        required: field.required === true,
        unit: typeof field.unit === 'string' && field.unit.trim()
          ? field.unit.trim()
          : undefined,
        validation,
        options
      } satisfies DatasetSchemaField
    })
    .filter(Boolean) as DatasetSchemaField[]
}

export function getDatasetPeriodicity(dataConfig: unknown): DatasetReadablePeriodicity | null {
  if (!isJsonObject(dataConfig)) {
    return null
  }

  const periodicity = dataConfig.periodicity

  if (typeof periodicity !== 'string') {
    return null
  }

  const normalized = periodicity.trim().toUpperCase()

  return readableDatasetPeriodicities.includes(normalized as DatasetReadablePeriodicity)
    ? normalized as DatasetReadablePeriodicity
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

export function getDefaultPeriodInput(periodicity: DatasetReadablePeriodicity | null, date = new Date()) {
  const year = date.getUTCFullYear()
  const month = padNumber(date.getUTCMonth() + 1)
  const day = padNumber(date.getUTCDate())

  switch (periodicity) {
    case 'BULANAN':
      return `${year}-${month}`
    case 'TRIWULANAN':
      return `${year}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`
    case 'TAHUNAN':
      return String(year)
    case 'HARIAN':
    default:
      return `${year}-${month}-${day}`
  }
}

export function normalizeDatasetPeriodInput(periodicity: DatasetReadablePeriodicity | null, input: unknown) {
  const value = typeof input === 'string' ? input.trim() : ''

  if (!value) {
    throw new Error('Period is required.')
  }

  switch (periodicity) {
    case 'BULANAN': {
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
    case 'TRIWULANAN': {
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
    case 'TAHUNAN': {
      const match = /^(\d{4})$/.exec(value)

      if (!match) {
        throw new Error('Yearly period must use the YYYY format.')
      }

      return `${match[1]}-01-01`
    }
    case 'HARIAN':
    default: {
      const normalized = normalizeDateString(value)

      if (!normalized) {
        throw new Error('Daily period must use a valid YYYY-MM-DD date.')
      }

      return normalized
    }
  }
}

function normalizeDatasetPeriodDate(periodicity: CanonicalDatasetPeriodicity, value: string) {
  const [year, month] = value.split('-')

  switch (periodicity) {
    case 'BULANAN':
      return `${year}-${month}-01`
    case 'TRIWULANAN':
      return `${year}-${padNumber(Math.floor((Number(month) - 1) / 3) * 3 + 1)}-01`
    case 'TAHUNAN':
      return `${year}-01-01`
    case 'HARIAN':
    default:
      return value
  }
}

/** Validates a DatasetRecord's stored canonical YYYY-MM-DD period date without parsing raw UI input. */
export function validateCanonicalDatasetPeriodDate(periodicity: DatasetReadablePeriodicity | null, input: unknown) {
  const value = typeof input === 'string' ? input.trim() : ''
  const normalized = normalizeDateString(value)

  if (!normalized) {
    throw new Error('Period must use a valid YYYY-MM-DD date.')
  }

  if (!periodicity) {
    throw new Error('Dataset periodicity is not supported.')
  }

  if (normalizeDatasetPeriodDate(periodicity, normalized) !== normalized) {
    throw new Error(`Period must use the canonical ${periodicity} start date.`)
  }

  return normalized
}

export function getCurrentDatasetPeriod(periodicity: CanonicalDatasetPeriodicity, date = new Date()) {
  return normalizeDatasetPeriodInput(periodicity, getDefaultPeriodInput(periodicity, date))
}

/** Returns a valid canonical lower bound when present; legacy definitions remain readable without one. */
export function getDatasetStartPeriod(dataConfig: unknown) {
  if (!isJsonObject(dataConfig) || typeof dataConfig.startPeriod !== 'string') {
    return null
  }

  const periodicity = getDatasetPeriodicity(dataConfig)
  const startPeriod = normalizeDateString(dataConfig.startPeriod)

  if (!startPeriod || !periodicity) {
    return null
  }

  return normalizeDatasetPeriodDate(periodicity, startPeriod) === startPeriod
    ? startPeriod
    : null
}

/** Returns a valid canonical fixed upper bound when present; legacy definitions remain readable without one. */
export function getDatasetEndPeriod(dataConfig: unknown) {
  if (!isJsonObject(dataConfig) || typeof dataConfig.endPeriod !== 'string') {
    return null
  }

  const periodicity = getDatasetPeriodicity(dataConfig)
  const endPeriod = normalizeDateString(dataConfig.endPeriod)

  if (!endPeriod || !periodicity) {
    return null
  }

  return normalizeDatasetPeriodDate(periodicity, endPeriod) === endPeriod
    ? endPeriod
    : null
}

/** Resolves the Dataset's optional lower bound and effective upper bound for record validation. */
export function getDatasetRecordPeriodBounds(dataConfig: unknown, date = new Date()) {
  const periodicity = getDatasetPeriodicity(dataConfig)

  if (!periodicity) {
    return null
  }

  return {
    startPeriod: getDatasetStartPeriod(dataConfig),
    effectiveEndPeriod: getDatasetEndPeriod(dataConfig) ?? getCurrentDatasetPeriod(periodicity, date)
  }
}

/** Returns every normalized period within the configured Dataset coverage. */
export function getDatasetPeriodRange(dataConfig: unknown, date = new Date()) {
  const periodicity = getDatasetPeriodicity(dataConfig)
  const bounds = getDatasetRecordPeriodBounds(dataConfig, date)

  if (!periodicity || !bounds?.startPeriod) {
    return []
  }

  const periods: string[] = []
  const cursor = new Date(`${bounds.startPeriod}T00:00:00.000Z`)
  const end = new Date(`${bounds.effectiveEndPeriod}T00:00:00.000Z`)

  while (cursor <= end) {
    periods.push(cursor.toISOString().slice(0, 10))

    switch (periodicity) {
      case 'BULANAN':
        cursor.setUTCMonth(cursor.getUTCMonth() + 1)
        break
      case 'TRIWULANAN':
        cursor.setUTCMonth(cursor.getUTCMonth() + 3)
        break
      case 'TAHUNAN':
        cursor.setUTCFullYear(cursor.getUTCFullYear() + 1)
        break
      case 'HARIAN':
      default:
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  }

  return periods
}

export function getDatasetRecordPeriodRangeError(
  dataConfig: unknown,
  periodDate: string,
  date = new Date()
) {
  const bounds = getDatasetRecordPeriodBounds(dataConfig, date)

  if (!bounds) {
    return 'Periodisitas Dataset tidak didukung.'
  }

  if (bounds.startPeriod && periodDate < bounds.startPeriod) {
    return 'Periode tidak boleh sebelum startPeriod.'
  }

  return periodDate > bounds.effectiveEndPeriod
    ? 'Periode tidak boleh setelah akhir cakupan Dataset.'
    : null
}

export function formatDatasetPeriod(periodicity: DatasetReadablePeriodicity | null, periodDate: string | Date) {
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
    case 'BULANAN':
      return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date)
    case 'TRIWULANAN':
      return `Q${Math.floor((month - 1) / 3) + 1} ${year}`
    case 'TAHUNAN':
      return String(year)

    case 'HARIAN':
    default:
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeZone: 'UTC'
      }).format(date)
  }
}

function hasAtMostDecimalPlaces(value: number, decimalPlaces: number | undefined) {
  if (decimalPlaces === undefined) {
    return true
  }

  const factor = 10 ** decimalPlaces

  if (!Number.isFinite(factor)) {
    return true
  }

  const rounded = Math.round(value * factor) / factor
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(value), Math.abs(rounded)) * 16

  return Math.abs(value - rounded) <= tolerance
}

export function validateDatasetRecordData(
  dataSchema: unknown,
  input: unknown
): {
  readonly data: Record<string, unknown>
  readonly issues: readonly DatasetRecordValidationIssue[]
} {
  const fields = getDatasetSchemaFields(dataSchema)
  const data: Record<string, unknown> = {}
  const issues: DatasetRecordValidationIssue[] = []

  if (!isJsonObject(input)) {
    return {
      data,
      issues: [{
        key: 'data',
        label: 'Data',
        message: 'Data harus berupa objek.'
      }]
    }
  }

  const values = input
  const fieldKeys = new Set(fields.map(field => field.key))

  for (const key of Object.keys(values)) {
    if (!fieldKeys.has(key)) {
      issues.push({
        key,
        label: key,
        message: `Field data "${key}" tidak terdaftar pada schema dataset.`
      })
    }
  }

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

        if (field.validation?.min !== undefined && value < field.validation.min) {
          issues.push({
            key: field.key,
            label: field.label,
            message: `${field.label} tidak boleh kurang dari ${field.validation.min}.`
          })
          continue
        }

        if (field.validation?.max !== undefined && value > field.validation.max) {
          issues.push({
            key: field.key,
            label: field.label,
            message: `${field.label} tidak boleh lebih dari ${field.validation.max}.`
          })
          continue
        }

        if (!hasAtMostDecimalPlaces(value, field.validation?.decimalPlaces)) {
          issues.push({
            key: field.key,
            label: field.label,
            message: `${field.label} maksimal memiliki ${field.validation?.decimalPlaces} angka di belakang koma.`
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

        if (field.validation?.minLength !== undefined && rawValue.length < field.validation.minLength) {
          issues.push({
            key: field.key,
            label: field.label,
            message: `${field.label} minimal ${field.validation.minLength} karakter.`
          })
          continue
        }

        if (field.validation?.maxLength !== undefined && rawValue.length > field.validation.maxLength) {
          issues.push({
            key: field.key,
            label: field.label,
            message: `${field.label} maksimal ${field.validation.maxLength} karakter.`
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
