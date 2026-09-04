import { db } from '#server/utils/db'
import { getSumbawaBaratRegionScopeWhere } from '#server/utils/region-scope'

export type DatasetSpreadsheetRegionContext = {
  readonly kabupaten: string
  readonly kecamatan: string
  readonly desa: string
}

export type DatasetSpreadsheetRegionResolution = {
  readonly regionId: string | null
  readonly regionName: string
  readonly error: string | null
}

export function getDatasetPeriodSpreadsheetIdentityHeaders(regionLevel: string | null) {
  switch (regionLevel) {
    case 'DESA':
      return ['Kecamatan', 'Desa/Kelurahan'] as const
    case 'KECAMATAN':
      return ['Kecamatan'] as const
    case 'KABUPATEN':
    default:
      return ['Kabupaten'] as const
  }
}

function getResolutionError(subject: string, matches: number) {
  return matches === 0
    ? `${subject} tidak ditemukan dalam wilayah Kabupaten Sumbawa Barat.`
    : `${subject} ambigu dalam wilayah Kabupaten Sumbawa Barat.`
}

export async function resolveDatasetPeriodSpreadsheetRegions(
  regionLevel: string | null,
  contexts: readonly DatasetSpreadsheetRegionContext[]
): Promise<DatasetSpreadsheetRegionResolution[]> {
  const regions = await db.region.findMany({
    where: getSumbawaBaratRegionScopeWhere(regionLevel),
    select: {
      id: true,
      name: true,
      parent: {
        select: {
          name: true
        }
      }
    }
  })

  return contexts.map((context) => {
    if (regionLevel === 'DESA') {
      if (!context.kecamatan) {
        return { regionId: null, regionName: '', error: 'Kecamatan wajib diisi.' }
      }

      if (!context.desa) {
        return { regionId: null, regionName: '', error: 'Desa/Kelurahan wajib diisi.' }
      }

      const matches = regions.filter((region) => {
        return region.name === context.desa && region.parent?.name === context.kecamatan
      })

      return matches.length === 1
        ? { regionId: matches[0]!.id, regionName: matches[0]!.name, error: null }
        : {
            regionId: null,
            regionName: context.desa,
            error: getResolutionError(
              `Desa/Kelurahan "${context.desa}" pada Kecamatan "${context.kecamatan}"`,
              matches.length
            )
          }
    }

    const value = regionLevel === 'KECAMATAN' ? context.kecamatan : context.kabupaten
    const label = regionLevel === 'KECAMATAN' ? 'Kecamatan' : 'Kabupaten'

    if (!value) {
      return { regionId: null, regionName: '', error: `${label} wajib diisi.` }
    }

    const matches = regions.filter(region => region.name === value)

    return matches.length === 1
      ? { regionId: matches[0]!.id, regionName: matches[0]!.name, error: null }
      : {
          regionId: null,
          regionName: value,
          error: getResolutionError(`${label} "${value}"`, matches.length)
        }
  })
}
