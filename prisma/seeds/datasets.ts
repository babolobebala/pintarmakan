import type { Prisma } from '../../server/generated/prisma/client.js'
import { validateDatasetConfigDefinition, validateDatasetSchemaDefinition } from '../../shared/datasets.ts'
import { seedSuperAdminEmail } from './auth.js'

type SeedDbClient = InstanceType<typeof import('../../server/generated/prisma/client.js').PrismaClient>

type SeedDatasetDefinition = {
  readonly id: string
  readonly ownerBidangId: string
  readonly name: string
  readonly description: string
  readonly dataSchema: Prisma.InputJsonObject
  readonly dataConfig: Prisma.InputJsonObject
}

type SeedDatasetRecord = {
  readonly datasetId: string
  readonly regionId: string
  readonly periodDate: string
  readonly data: Prisma.InputJsonObject
  readonly status: string
}

const defaultOwnerBidangId = 'DKP_KETERSEDIAAN'
const defaultKabupatenRegionId = '52.07'
const defaultFoodSecurityStatusYear = '2025'

function parseSeedYear(value: string) {
  const normalized = value.trim()

  if (!/^\d{4}$/.test(normalized)) {
    throw new Error(
      `Invalid SEED_FOOD_SECURITY_STATUS_YEAR "${value}". Expected a 4-digit year such as "2025".`
    )
  }

  return normalized
}

function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

const foodSecurityStatusYear = parseSeedYear(
  process.env.SEED_FOOD_SECURITY_STATUS_YEAR || defaultFoodSecurityStatusYear
)
const foodSecurityStatusPeriodDate = `${foodSecurityStatusYear}-01-01`

const seedDatasets = [
  {
    id: 'IKP_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Indeks Ketahanan Pangan (IKP)',
    description: 'Data tahunan Indeks Ketahanan Pangan Kabupaten Sumbawa Barat.',
    dataSchema: {
      version: 1,
      fields: [
        {
          key: 'value',
          label: 'Indeks Ketahanan Pangan (IKP)',
          type: 'number',
          required: false
        }
      ]
    },
    dataConfig: {
      version: 1,
      periodicity: 'TAHUNAN',
      regionLevel: 'KABUPATEN',
      startPeriod: '2025-01-01'
    }
  },
  {
    id: 'PPH_KONSUMSI_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Pola Pangan Harapan (PPH) Konsumsi',
    description: 'Data tahunan skor Pola Pangan Harapan Konsumsi Kabupaten Sumbawa Barat.',
    dataSchema: {
      version: 1,
      fields: [
        {
          key: 'value',
          label: 'PPH Konsumsi',
          type: 'number',
          required: false
        }
      ]
    },
    dataConfig: {
      version: 1,
      periodicity: 'TAHUNAN',
      regionLevel: 'KABUPATEN',
      startPeriod: '2025-01-01'
    }
  },
  {
    id: 'PPH_KETERSEDIAAN_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Pola Pangan Harapan (PPH) Ketersediaan',
    description: 'Data tahunan skor Pola Pangan Harapan Ketersediaan Kabupaten Sumbawa Barat.',
    dataSchema: {
      version: 1,
      fields: [
        {
          key: 'value',
          label: 'PPH Ketersediaan',
          type: 'number',
          required: false
        }
      ]
    },
    dataConfig: {
      version: 1,
      periodicity: 'TAHUNAN',
      regionLevel: 'KABUPATEN',
      startPeriod: '2025-01-01'
    }
  },
  {
    id: 'HARGA_PANGAN_HARIAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Perkembangan Harga Pangan Kabupaten Sumbawa Barat',
    description: 'Data harian perkembangan harga pangan Kabupaten Sumbawa Barat.',
    dataSchema: {
      version: 1,
      fields: [
        { key: 'beras_premium', label: 'Beras Premium (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'beras_medium', label: 'Beras Medium (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'beras_sphp', label: 'Beras SPHP (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'beras_medium_non_sphp', label: 'Beras Medium Non SPHP (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'beras_khusus_lokal', label: 'Beras Khusus (Lokal) (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'kedelai_biji_kering', label: 'Kedelai Biji Kering (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'bawang_merah', label: 'Bawang Merah (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'bawang_putih', label: 'Bawang Putih (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'cabai_merah_keriting', label: 'Cabai Merah Keriting (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'cabai_besar', label: 'Cabai Besar (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'cabai_rawit_merah', label: 'Cabai Rawit Merah (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'daging_sapi', label: 'Daging Sapi (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'daging_ayam_ras', label: 'Daging Ayam Ras (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'telur_ayam_ras', label: 'Telur Ayam Ras (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'gula_pasir', label: 'Gula Pasir (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'minyak_goreng_kemasan', label: 'Minyak Goreng Kemasan (Rp/L)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'tepung_terigu_curah', label: 'Tepung Terigu (Curah) (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'minyak_goreng_curah', label: 'Minyak Goreng Curah (Rp/L)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'minyak_goreng_kita', label: 'Minyak Goreng Kita (Rp/L)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'tepung_terigu_kemasan', label: 'Tepung Terigu Kemasan (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'jagung_pipilan_kering', label: 'Jagung Pipilan Kering (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'ikan_kembung', label: 'Ikan Kembung (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'ikan_tongkol', label: 'Ikan Tongkol (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'ikan_bandeng', label: 'Ikan Bandeng (Rp/kg)', type: 'number', required: false, validation: { min: 0 } },
        { key: 'garam', label: 'Garam (Rp/kg)', type: 'number', required: false, validation: { min: 0 } }
      ]
    },
    dataConfig: {
      version: 1,
      periodicity: 'HARIAN',
      regionLevel: 'KABUPATEN',
      startPeriod: '2025-01-01'
    }
  },
  {
    id: 'PROYEKSI_NERACA_PANGAN_BULANAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Proyeksi Neraca Pangan Kabupaten Sumbawa Barat',
    description: 'Data proyeksi neraca pangan bulanan Kabupaten Sumbawa Barat untuk tahun 2026.',
    dataSchema: {
      version: 1,
      fields: [
        { key: 'beras', label: 'Beras', type: 'number', required: false, validation: { min: 0 } },
        { key: 'jagung', label: 'Jagung', type: 'number', required: false, validation: { min: 0 } },
        { key: 'kedelai', label: 'Kedelai', type: 'number', required: false, validation: { min: 0 } },
        { key: 'bawang_merah', label: 'Bawang Merah', type: 'number', required: false, validation: { min: 0 } },
        { key: 'bawang_putih', label: 'Bawang Putih', type: 'number', required: false, validation: { min: 0 } },
        { key: 'cabai_merah', label: 'Cabai Merah', type: 'number', required: false, validation: { min: 0 } },
        { key: 'cabai_rawit', label: 'Cabai Rawit', type: 'number', required: false, validation: { min: 0 } },
        { key: 'daging_sapi_kerbau', label: 'Daging Sapi/Kerbau', type: 'number', required: false, validation: { min: 0 } },
        { key: 'daging_ayam_ras', label: 'Daging Ayam Ras', type: 'number', required: false, validation: { min: 0 } },
        { key: 'telur_ayam_ras', label: 'Telur Ayam Ras', type: 'number', required: false, validation: { min: 0 } },
        { key: 'gula_konsumsi', label: 'Gula Konsumsi', type: 'number', required: false, validation: { min: 0 } },
        { key: 'minyak_goreng', label: 'Minyak Goreng', type: 'number', required: false, validation: { min: 0 } }
      ]
    },
    dataConfig: {
      version: 1,
      periodicity: 'BULANAN',
      regionLevel: 'KABUPATEN',
      startPeriod: '2026-01-01',
      endPeriod: '2026-12-01'
    }
  },
  {
    id: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Status Ketahanan Pangan',
    description: 'Data tahunan status ketahanan pangan desa/kelurahan berdasarkan nilai prioritas.',
    dataSchema: {
      version: 1,
      fields: [
        {
          key: 'priority',
          label: 'Prioritas',
          type: 'number',
          required: true
        }
      ]
    },
    dataConfig: {
      version: 1,
      periodicity: 'TAHUNAN',
      regionLevel: 'DESA',
      startPeriod: '2025-01-01'
    }
  }
] as const satisfies readonly SeedDatasetDefinition[]

const seedDatasetRecords = [
  { datasetId: 'IKP_TAHUNAN', regionId: defaultKabupatenRegionId, periodDate: '2024-01-01', data: { value: 86.47 }, status: 'PUBLISHED' },
  { datasetId: 'IKP_TAHUNAN', regionId: defaultKabupatenRegionId, periodDate: '2025-01-01', data: { value: 80.4 }, status: 'PUBLISHED' },
  { datasetId: 'PPH_KONSUMSI_TAHUNAN', regionId: defaultKabupatenRegionId, periodDate: '2024-01-01', data: { value: 90 }, status: 'PUBLISHED' },
  { datasetId: 'PPH_KONSUMSI_TAHUNAN', regionId: defaultKabupatenRegionId, periodDate: '2025-01-01', data: { value: 91.4 }, status: 'PUBLISHED' },
  { datasetId: 'PPH_KETERSEDIAAN_TAHUNAN', regionId: defaultKabupatenRegionId, periodDate: '2024-01-01', data: { value: 79.01 }, status: 'PUBLISHED' },
  { datasetId: 'PPH_KETERSEDIAAN_TAHUNAN', regionId: defaultKabupatenRegionId, periodDate: '2025-01-01', data: { value: 81.86 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.04.2002', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.04.2001', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.04.2003', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.04.2004', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.04.2005', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.04.2006', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.04.2007', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.01.2002', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.01.2001', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.01.2003', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.01.2009', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.08.2001', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.08.2002', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.08.2003', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.08.2004', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.08.2005', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.2009', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.2001', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.1005', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.2010', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.1006', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.1007', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.1004', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.1008', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.2011', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.2013', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.2014', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.2015', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.1012', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.2020', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.1019', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.02.2021', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.07.2002', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.07.2001', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.07.2003', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.07.2004', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.07.2005', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.07.2006', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.05.2004', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.05.2001', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.05.2002', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.05.2003', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.05.2009', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.05.2005', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.05.2008', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.05.2006', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.05.2007', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.03.2008', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.03.2001', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.03.2002', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.03.2003', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.03.2011', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.03.2004', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.03.2005', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.03.2013', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.03.2015', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.03.2014', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.06.2001', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.06.2002', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.06.2003', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.06.2004', periodDate: foodSecurityStatusPeriodDate, data: { priority: 6 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.06.2005', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.06.2008', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.06.2007', periodDate: foodSecurityStatusPeriodDate, data: { priority: 5 }, status: 'PUBLISHED' },
  { datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN', regionId: '52.07.06.2006', periodDate: foodSecurityStatusPeriodDate, data: { priority: 4 }, status: 'PUBLISHED' }
] as const satisfies readonly SeedDatasetRecord[]

function validateSeedDatasetDefinitions() {
  for (const seedDataset of seedDatasets) {
    validateDatasetSchemaDefinition(seedDataset.dataSchema)
    validateDatasetConfigDefinition(seedDataset.dataConfig)
  }
}

async function resolveSeedSuperAdminUserId(db: SeedDbClient) {
  const user = await db.user.findUnique({
    where: {
      email: seedSuperAdminEmail
    },
    select: {
      id: true
    }
  })

  if (!user) {
    throw new Error(
      `Missing seeded Super Admin user "${seedSuperAdminEmail}". Run the auth seed before the dataset seed.`
    )
  }

  return user.id
}

export async function runDatasetSeed(db: SeedDbClient) {
  validateSeedDatasetDefinitions()

  const superAdminUserId = await resolveSeedSuperAdminUserId(db)
  let createdDatasetCount = 0
  let updatedDatasetCount = 0
  let unchangedDatasetCount = 0
  let createdRecordCount = 0
  let updatedRecordCount = 0
  let unchangedRecordCount = 0

  for (const seedDataset of seedDatasets) {
    const currentDataset = await db.dataset.findUnique({
      where: {
        id: seedDataset.id
      },
      select: {
        id: true,
        ownerBidangId: true,
        name: true,
        description: true,
        dataSchema: true,
        dataConfig: true
      }
    })

    if (!currentDataset) {
      await db.dataset.create({
        data: seedDataset
      })
      createdDatasetCount += 1
    } else if (
      currentDataset.ownerBidangId === seedDataset.ownerBidangId
      && currentDataset.name === seedDataset.name
      && currentDataset.description === seedDataset.description
      && JSON.stringify(currentDataset.dataSchema) === JSON.stringify(seedDataset.dataSchema)
      && JSON.stringify(currentDataset.dataConfig) === JSON.stringify(seedDataset.dataConfig)
    ) {
      unchangedDatasetCount += 1
    } else {
      await db.dataset.update({
        where: {
          id: seedDataset.id
        },
        data: {
          ownerBidangId: seedDataset.ownerBidangId,
          name: seedDataset.name,
          description: seedDataset.description,
          dataSchema: seedDataset.dataSchema,
          dataConfig: seedDataset.dataConfig
        }
      })
      updatedDatasetCount += 1
    }
  }

  for (const seedRecord of seedDatasetRecords) {
    const periodDate = toDateOnly(seedRecord.periodDate)
    const currentRecord = await db.datasetRecord.findUnique({
      where: {
        datasetId_regionId_periodDate: {
          datasetId: seedRecord.datasetId,
          regionId: seedRecord.regionId,
          periodDate
        }
      },
      select: {
        id: true,
        data: true,
        status: true,
        createdBy: true
      }
    })

    if (!currentRecord) {
      await db.datasetRecord.create({
        data: {
          datasetId: seedRecord.datasetId,
          regionId: seedRecord.regionId,
          periodDate,
          data: seedRecord.data,
          status: seedRecord.status,
          createdBy: superAdminUserId
        }
      })
      createdRecordCount += 1
      continue
    }

    if (
      JSON.stringify(currentRecord.data) === JSON.stringify(seedRecord.data)
      && currentRecord.status === seedRecord.status
      && currentRecord.createdBy === superAdminUserId
    ) {
      unchangedRecordCount += 1
      continue
    }

    await db.datasetRecord.update({
      where: {
        id: currentRecord.id
      },
      data: {
        data: seedRecord.data,
        status: seedRecord.status,
        createdBy: superAdminUserId
      }
    })
    updatedRecordCount += 1
  }

  console.info(
    `[seed] datasets complete: ${createdDatasetCount} created, ${updatedDatasetCount} updated, ${unchangedDatasetCount} unchanged`
  )
  console.info(
    `[seed] dataset records complete: ${createdRecordCount} created, ${updatedRecordCount} updated, ${unchangedRecordCount} unchanged`
  )
  console.info(
    `[seed] dataset record year for STATUS_KETAHANAN_PANGAN_TAHUNAN: ${foodSecurityStatusPeriodDate} `
    + `(override with SEED_FOOD_SECURITY_STATUS_YEAR)`
  )
}
