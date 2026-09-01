import type { Prisma } from '#server/utils/db'

export const sumbawaBaratRegionId = '52.07'

export function getSumbawaBaratRegionScopeWhere(regionLevel: string | null): Prisma.RegionWhereInput {
  switch (regionLevel) {
    case 'KABUPATEN':
      return {
        id: sumbawaBaratRegionId,
        level: 'KABUPATEN'
      }
    case 'KECAMATAN':
      return {
        level: 'KECAMATAN',
        parentId: sumbawaBaratRegionId
      }
    case 'DESA':
      return {
        level: 'DESA',
        parent: {
          is: {
            level: 'KECAMATAN',
            parentId: sumbawaBaratRegionId
          }
        }
      }
    default:
      return {
        id: {
          in: []
        }
      }
  }
}
