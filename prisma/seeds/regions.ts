import type { PrismaClient } from '../../server/generated/prisma/client.js'

type SeedRegion = {
  readonly id: string
  readonly name: string
  readonly level: string
  readonly parentId: string | null
}

const seedRegions = [
  { id: '52.07', name: 'Sumbawa Barat', level: 'KABUPATEN', parentId: null },
  { id: '52.07.01', name: 'Jereweh', level: 'KECAMATAN', parentId: '52.07' },
  { id: '52.07.02', name: 'Taliwang', level: 'KECAMATAN', parentId: '52.07' },
  { id: '52.07.03', name: 'Seteluk', level: 'KECAMATAN', parentId: '52.07' },
  { id: '52.07.04', name: 'Sekongkang', level: 'KECAMATAN', parentId: '52.07' },
  { id: '52.07.05', name: 'Brang Rea', level: 'KECAMATAN', parentId: '52.07' },
  { id: '52.07.06', name: 'Poto Tano', level: 'KECAMATAN', parentId: '52.07' },
  { id: '52.07.07', name: 'Brang Ene', level: 'KECAMATAN', parentId: '52.07' },
  { id: '52.07.08', name: 'Maluk', level: 'KECAMATAN', parentId: '52.07' },
  { id: '52.07.01.2001', name: 'Goa', level: 'DESA', parentId: '52.07.01' },
  { id: '52.07.01.2002', name: 'Belo', level: 'DESA', parentId: '52.07.01' },
  { id: '52.07.01.2003', name: 'Beru', level: 'DESA', parentId: '52.07.01' },
  { id: '52.07.01.2009', name: 'Dasan Anyar', level: 'DESA', parentId: '52.07.01' },
  { id: '52.07.02.1004', name: 'Menala', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.1005', name: 'Kuang', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.1006', name: 'Bugis', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.1007', name: 'Dalam', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.1008', name: 'Sampir', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.1012', name: 'Telaga Bertong', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.1019', name: 'Arab Kenangan', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.2001', name: 'Labuhan Lalar', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.2009', name: 'Lalar Liang', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.2010', name: 'Labuhan Kertasari', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.2011', name: 'Seloto', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.2013', name: 'Tamekan', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.2014', name: 'Banjar', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.2015', name: 'Batu Putih', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.2020', name: 'Sermong', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.02.2021', name: 'Lamunga', level: 'DESA', parentId: '52.07.02' },
  { id: '52.07.03.2001', name: 'Meraran', level: 'DESA', parentId: '52.07.03' },
  { id: '52.07.03.2002', name: 'Air Suning', level: 'DESA', parentId: '52.07.03' },
  { id: '52.07.03.2003', name: 'Rempe', level: 'DESA', parentId: '52.07.03' },
  { id: '52.07.03.2004', name: 'Seteluk Atas', level: 'DESA', parentId: '52.07.03' },
  { id: '52.07.03.2005', name: 'Seteluk Tengah', level: 'DESA', parentId: '52.07.03' },
  { id: '52.07.03.2008', name: 'Kelanir', level: 'DESA', parentId: '52.07.03' },
  { id: '52.07.03.2011', name: 'Tapir', level: 'DESA', parentId: '52.07.03' },
  { id: '52.07.03.2013', name: 'Lamusung', level: 'DESA', parentId: '52.07.03' },
  { id: '52.07.03.2014', name: 'Seran', level: 'DESA', parentId: '52.07.03' },
  { id: '52.07.03.2015', name: 'Desaloka', level: 'DESA', parentId: '52.07.03' },
  { id: '52.07.04.2001', name: 'Sekongkang Atas', level: 'DESA', parentId: '52.07.04' },
  { id: '52.07.04.2002', name: 'Sekongkang Bawah', level: 'DESA', parentId: '52.07.04' },
  { id: '52.07.04.2003', name: 'Tongo', level: 'DESA', parentId: '52.07.04' },
  { id: '52.07.04.2004', name: 'Ai Kangkung', level: 'DESA', parentId: '52.07.04' },
  { id: '52.07.04.2005', name: 'Tatar', level: 'DESA', parentId: '52.07.04' },
  { id: '52.07.04.2006', name: 'Talonang Baru', level: 'DESA', parentId: '52.07.04' },
  { id: '52.07.04.2007', name: 'Kemuning', level: 'DESA', parentId: '52.07.04' },
  { id: '52.07.05.2001', name: 'Desa Beru', level: 'DESA', parentId: '52.07.05' },
  { id: '52.07.05.2002', name: 'Tepas', level: 'DESA', parentId: '52.07.05' },
  { id: '52.07.05.2003', name: 'Bangkat Monteh', level: 'DESA', parentId: '52.07.05' },
  { id: '52.07.05.2004', name: 'Sapugara Bree', level: 'DESA', parentId: '52.07.05' },
  { id: '52.07.05.2005', name: 'Tepas Sepakat', level: 'DESA', parentId: '52.07.05' },
  { id: '52.07.05.2006', name: 'Lamuntet', level: 'DESA', parentId: '52.07.05' },
  { id: '52.07.05.2007', name: 'Rarak Ronges', level: 'DESA', parentId: '52.07.05' },
  { id: '52.07.05.2008', name: 'Moteng', level: 'DESA', parentId: '52.07.05' },
  { id: '52.07.05.2009', name: 'Seminar Salit', level: 'DESA', parentId: '52.07.05' },
  { id: '52.07.06.2001', name: 'Senayan', level: 'DESA', parentId: '52.07.06' },
  { id: '52.07.06.2002', name: 'Mantar', level: 'DESA', parentId: '52.07.06' },
  { id: '52.07.06.2003', name: 'Kiantar', level: 'DESA', parentId: '52.07.06' },
  { id: '52.07.06.2004', name: 'Poto Tano', level: 'DESA', parentId: '52.07.06' },
  { id: '52.07.06.2005', name: 'Upt Tambak Sari', level: 'DESA', parentId: '52.07.06' },
  { id: '52.07.06.2006', name: 'Kokarlian', level: 'DESA', parentId: '52.07.06' },
  { id: '52.07.06.2007', name: 'Tebo', level: 'DESA', parentId: '52.07.06' },
  { id: '52.07.06.2008', name: 'Tuananga', level: 'DESA', parentId: '52.07.06' },
  { id: '52.07.07.2001', name: 'Mura', level: 'DESA', parentId: '52.07.07' },
  { id: '52.07.07.2002', name: 'Kalimantong', level: 'DESA', parentId: '52.07.07' },
  { id: '52.07.07.2003', name: 'Lampok', level: 'DESA', parentId: '52.07.07' },
  { id: '52.07.07.2004', name: 'Manemeng', level: 'DESA', parentId: '52.07.07' },
  { id: '52.07.07.2005', name: 'Mujahiddin', level: 'DESA', parentId: '52.07.07' },
  { id: '52.07.07.2006', name: 'Mataiyang', level: 'DESA', parentId: '52.07.07' },
  { id: '52.07.08.2001', name: 'Maluk', level: 'DESA', parentId: '52.07.08' },
  { id: '52.07.08.2002', name: 'Benete', level: 'DESA', parentId: '52.07.08' },
  { id: '52.07.08.2003', name: 'Bukit Damai', level: 'DESA', parentId: '52.07.08' },
  { id: '52.07.08.2004', name: 'Mantun', level: 'DESA', parentId: '52.07.08' },
  { id: '52.07.08.2005', name: 'Pasir Putih', level: 'DESA', parentId: '52.07.08' }
] as const satisfies readonly SeedRegion[]

export async function runRegionSeed(db: PrismaClient) {
  let createdCount = 0
  let updatedCount = 0
  let unchangedCount = 0

  for (const seedRegion of seedRegions) {
    const currentRegion = await db.region.findUnique({
      where: {
        id: seedRegion.id
      },
      select: {
        id: true,
        name: true,
        level: true,
        parentId: true
      }
    })

    if (!currentRegion) {
      await db.region.create({
        data: seedRegion
      })

      createdCount += 1
      continue
    }

    if (
      currentRegion.name === seedRegion.name
      && currentRegion.level === seedRegion.level
      && currentRegion.parentId === seedRegion.parentId
    ) {
      unchangedCount += 1
      continue
    }

    await db.region.update({
      where: {
        id: seedRegion.id
      },
      data: {
        name: seedRegion.name,
        level: seedRegion.level,
        parentId: seedRegion.parentId
      }
    })

    updatedCount += 1
  }

  console.info(
    `[seed] regions complete: ${createdCount} created, ${updatedCount} updated, ${unchangedCount} unchanged`
  )
}
