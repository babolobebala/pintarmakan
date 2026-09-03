import type { Prisma } from '../../server/generated/prisma/client.js'
import {
  validateDatasetConfigDefinition,
  validateDatasetSchemaDefinition
} from '../../shared/datasets'
import { seedSuperAdminEmail } from './auth.js'

type SeedDbClient = InstanceType<
  typeof import('../../server/generated/prisma/client.js').PrismaClient
>

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

const foodSource = 'Dinas Ketahanan Pangan Kabupaten Sumbawa Barat'
const agricultureSource = 'Dinas Pertanian Kabupaten Sumbawa Barat'
const nationalFoodSource = 'Badan Pangan Nasional'
const distributionBidangId = 'DKP_DISTRIBUSI'
const newDatasetStartPeriod = '2026-01-01'

const numberField = (
  key: string,
  label: string,
  required = false,
  validation?: Prisma.InputJsonObject
) => ({
  key,
  label,
  type: 'number',
  required,
  ...(validation ? { validation } : {})
})

const annualProductionFields = [
  numberField('luas_panen', 'Luas Panen (Ha)', false, { decimalPlaces: 2 }),
  numberField('hasil_per_hektar', 'Hasil/Hektar (Ku/Ha)', false, {
    decimalPlaces: 2
  }),
  numberField('produksi', 'Produksi (Ton)', false, { decimalPlaces: 2 })
]

const monthlyTonFields = [
  ['januari', 'Januari'],
  ['februari', 'Februari'],
  ['maret', 'Maret'],
  ['april', 'April'],
  ['mei', 'Mei'],
  ['juni', 'Juni'],
  ['juli', 'Juli'],
  ['agustus', 'Agustus'],
  ['september', 'September'],
  ['oktober', 'Oktober'],
  ['november', 'November'],
  ['desember', 'Desember']
].map(([key, label]) => numberField(key, `${label} (Ton)`, false, { min: 0 }))

const projectionFields = [
  numberField('total_ketersediaan', 'Total Ketersediaan', false, {
    decimalPlaces: 2
  }),
  numberField('total_kebutuhan', 'Total Kebutuhan', false, {
    decimalPlaces: 2
  }),
  numberField('neraca', 'Neraca (Ton)', false, { decimalPlaces: 2 })
]

const projectionDatasets = [
  ['PROYEKSI_NERACA_BERAS_TAHUNAN', 'Proyeksi Neraca Beras'],
  [
    'PROYEKSI_NERACA_JAGUNG_PIPILAN_KERING_TAHUNAN',
    'Proyeksi Neraca Jagung Pipilan Kering'
  ],
  [
    'PROYEKSI_NERACA_KEDELAI_BIJI_KERING_TAHUNAN',
    'Proyeksi Neraca Kedelai Biji Kering'
  ],
  ['PROYEKSI_NERACA_BAWANG_MERAH_TAHUNAN', 'Proyeksi Neraca Bawang Merah'],
  ['PROYEKSI_NERACA_BAWANG_PUTIH_TAHUNAN', 'Proyeksi Neraca Bawang Putih'],
  ['PROYEKSI_NERACA_CABAI_BESAR_TAHUNAN', 'Proyeksi Neraca Cabai Besar'],
  ['PROYEKSI_NERACA_CABAI_RAWIT_TAHUNAN', 'Proyeksi Neraca Cabai Rawit'],
  [
    'PROYEKSI_NERACA_DAGING_SAPI_KERBAU_TAHUNAN',
    'Proyeksi Neraca Daging Sapi/Kerbau'
  ],
  ['PROYEKSI_NERACA_DAGING_AYAM_TAHUNAN', 'Proyeksi Neraca Daging Ayam'],
  ['PROYEKSI_NERACA_TELUR_AYAM_RAS_TAHUNAN', 'Proyeksi Neraca Telur Ayam Ras'],
  [
    'PROYEKSI_NERACA_GULA_PASIR_KONSUMSI_TAHUNAN',
    'Proyeksi Neraca Gula Pasir Konsumsi'
  ],
  ['PROYEKSI_NERACA_MINYAK_GORENG_TAHUNAN', 'Proyeksi Neraca Minyak Goreng']
].map(([id, name]) => ({
  id,
  ownerBidangId: defaultOwnerBidangId,
  name,
  description: `Data tahunan ${name.toLowerCase()}.`,
  dataSchema: { version: 1, fields: projectionFields },
  dataConfig: {
    version: 1,
    mode: 'REGIONAL',
    periodicity: 'TAHUNAN',
    regionLevel: 'KABUPATEN',
    startPeriod: newDatasetStartPeriod,
    source: nationalFoodSource
  }
}))

const unitProductionFields = (
  entries: readonly (readonly [string, string])[],
  unit: string,
  decimalPlaces?: number
) =>
  entries.map(([key, label]) =>
    numberField(key, `${label} (${unit})`, false, {
      min: 0,
      ...(decimalPlaces === undefined ? {} : { decimalPlaces })
    })
  )

const seedDatasets = [
  {
    id: 'IKP_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Indeks Ketahanan Pangan (IKP)',
    description: 'Data tahunan Indeks Ketahanan Pangan.',
    dataSchema: {
      version: 1,
      fields: [numberField('ikp', 'IKP (Indeks)', true, { decimalPlaces: 2 })]
    },
    dataConfig: {
      version: 1,
      mode: 'REGIONAL',
      periodicity: 'TAHUNAN',
      regionLevel: 'KABUPATEN',
      startPeriod: '2025-01-01',
      source: nationalFoodSource
    }
  },
  {
    id: 'PPH_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Pola Pangan Harapan (PPH)',
    description: 'Data tahunan Pola Pangan Harapan.',
    dataSchema: {
      version: 1,
      fields: [
        numberField('pph_konsumsi', 'PPH Konsumsi', true, { decimalPlaces: 2 }),
        numberField('pph_ketersediaan', 'PPH Ketersediaan', true, {
          decimalPlaces: 2
        })
      ]
    },
    dataConfig: {
      version: 1,
      mode: 'REGIONAL',
      periodicity: 'TAHUNAN',
      regionLevel: 'KABUPATEN',
      startPeriod: '2024-01-01',
      source: nationalFoodSource
    }
  },
  {
    id: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Status Ketahanan Pangan Desa',
    description:
      'Data tahunan status ketahanan pangan desa berdasarkan nilai prioritas.',
    dataSchema: {
      version: 1,
      fields: [numberField('priority', 'Prioritas', true, { min: 1, max: 6 })]
    },
    dataConfig: {
      version: 1,
      mode: 'REGIONAL',
      periodicity: 'TAHUNAN',
      regionLevel: 'DESA',
      startPeriod: '2025-01-01',
      source: foodSource
    }
  },
  {
    id: 'CPPD_BULANAN',
    ownerBidangId: distributionBidangId,
    name: 'Cadangan Pangan Pemerintah Daerah (CPPD)',
    description: 'Data bulanan Cadangan Pangan Pemerintah Daerah.',
    dataSchema: {
      version: 1,
      fields: ['Stok Awal', 'Pengadaan', 'Penyaluran', 'Stok Akhir'].map(
        (label, index) =>
          numberField(
            ['stok_awal', 'pengadaan', 'penyaluran', 'stok_akhir'][index],
            `${label} (Ton)`,
            true,
            { decimalPlaces: 2 }
          )
      )
    },
    dataConfig: {
      version: 1,
      mode: 'REGIONAL',
      periodicity: 'BULANAN',
      regionLevel: 'KABUPATEN',
      startPeriod: newDatasetStartPeriod,
      source: foodSource
    }
  },
  ...[
    ['CPM_JAGUNG_TAHUNAN', 'Cadangan Pangan Masyarakat (CPM) - Jagung'],
    ['CPM_GABAH_TAHUNAN', 'Cadangan Pangan Masyarakat (CPM) - Gabah']
  ].map(([id, name]) => ({
    id,
    ownerBidangId: distributionBidangId,
    name,
    description: `Data tahunan ${name.toLowerCase()}.`,
    dataSchema: { version: 1, fields: monthlyTonFields },
    dataConfig: {
      version: 1,
      mode: 'TABULAR',
      periodicity: 'TAHUNAN',
      startPeriod: newDatasetStartPeriod,
      source: foodSource
    }
  })),
  {
    id: 'LUMBUNG_PANGAN_TAHUNAN',
    ownerBidangId: distributionBidangId,
    name: 'Lumbung Pangan',
    description: 'Data tahunan lumbung pangan.',
    dataSchema: {
      version: 1,
      fields: [
        {
          key: 'nama_kelompok_lumbung',
          label: 'Nama Kelompok Lumbung',
          type: 'string',
          required: false
        },
        { key: 'desa', label: 'Desa', type: 'string', required: false },
        {
          key: 'kecamatan',
          label: 'Kecamatan',
          type: 'string',
          required: false
        },
        numberField('keadaan_dalam_tahun', 'Keadaan dalam Tahun', false, {
          min: 2000,
          max: 2100
        }),
        {
          key: 'sumber_dana',
          label: 'Sumber Dana',
          type: 'string',
          required: false
        },
        numberField('jumlah_dana_fisik', 'Jumlah Dana Fisik (Rp)', false, {
          min: 0
        }),
        numberField(
          'dana_penguatan_modal',
          'Dana Penguatan Modal (Rp)',
          false,
          { min: 0 }
        ),
        {
          key: 'klasifikasi_tahapan',
          label: 'Klasifikasi Tahapan',
          type: 'select',
          required: false,
          options: [
            { value: 'Penumbuhan', label: 'Penumbuhan' },
            { value: 'Pengembangan', label: 'Pengembangan' },
            { value: 'Mandiri', label: 'Mandiri' }
          ]
        },
        {
          key: 'keterangan',
          label: 'Keterangan',
          type: 'string',
          required: false
        }
      ]
    },
    dataConfig: {
      version: 1,
      mode: 'TABULAR',
      periodicity: 'TAHUNAN',
      startPeriod: newDatasetStartPeriod,
      source: foodSource
    }
  },
  {
    id: 'HARGA_PANGAN_HARIAN',
    ownerBidangId: distributionBidangId,
    name: 'Laporan Perkembangan Harga Pangan',
    description: 'Data harian perkembangan harga pangan.',
    dataSchema: {
      version: 1,
      fields: [
        ['beras_premium', 'Beras Premium (Rp/kg)'],
        ['beras_medium', 'Beras Medium (Rp/kg)'],
        ['beras_sphp', 'Beras SPHP (Rp/kg)'],
        ['beras_medium_non_sphp', 'Beras Medium Non SPHP (Rp/kg)'],
        ['beras_khusus_lokal', 'Beras Khusus (Lokal) (Rp/kg)'],
        ['kedelai_biji_kering', 'Kedelai Biji Kering (Rp/kg)'],
        ['bawang_merah', 'Bawang Merah (Rp/kg)'],
        ['bawang_putih', 'Bawang Putih (Rp/kg)'],
        ['cabai_merah_keriting', 'Cabai Merah Keriting (Rp/kg)'],
        ['cabai_besar', 'Cabai Besar (Rp/kg)'],
        ['cabai_rawit_merah', 'Cabai Rawit Merah (Rp/kg)'],
        ['daging_sapi', 'Daging Sapi (Rp/kg)'],
        ['daging_ayam_ras', 'Daging Ayam Ras (Rp/kg)'],
        ['telur_ayam_ras', 'Telur Ayam Ras (Rp/kg)'],
        ['gula_pasir', 'Gula Pasir (Rp/kg)'],
        ['minyak_goreng_kemasan', 'Minyak Goreng Kemasan (Rp/L)'],
        ['tepung_terigu_curah', 'Tepung Terigu Curah (Rp/kg)'],
        ['minyak_goreng_curah', 'Minyak Goreng Curah (Rp/L)'],
        ['minyak_goreng_kita', 'Minyak Goreng Kita (Rp/L)'],
        ['tepung_terigu_kemasan', 'Tepung Terigu Kemasan (Rp/kg)'],
        ['jagung_pipilan_kering', 'Jagung Pipilan Kering (Rp/kg)'],
        ['ikan_kembung', 'Ikan Kembung (Rp/kg)'],
        ['ikan_tongkol', 'Ikan Tongkol (Rp/kg)'],
        ['ikan_bandeng', 'Ikan Bandeng (Rp/kg)'],
        ['garam', 'Garam (Rp/kg)']
      ].map(([key, label]) => numberField(key, label, false, { min: 0 }))
    },
    dataConfig: {
      version: 1,
      mode: 'REGIONAL',
      periodicity: 'HARIAN',
      regionLevel: 'KABUPATEN',
      startPeriod: '2025-01-01',
      source: foodSource
    }
  },
  ...projectionDatasets,
  {
    id: 'PRODUKTIFITAS_PADI_KECAMATAN_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Produksi Padi',
    description: 'Data tahunan produksi padi menurut kecamatan.',
    dataSchema: { version: 1, fields: annualProductionFields },
    dataConfig: {
      version: 1,
      mode: 'REGIONAL',
      periodicity: 'TAHUNAN',
      regionLevel: 'KECAMATAN',
      startPeriod: '2025-01-01',
      source: agricultureSource
    }
  },
  {
    id: 'PRODUKSI_JAGUNG_KECAMATAN_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Produksi Jagung',
    description: 'Data tahunan produksi jagung menurut kecamatan.',
    dataSchema: { version: 1, fields: annualProductionFields },
    dataConfig: {
      version: 1,
      mode: 'REGIONAL',
      periodicity: 'TAHUNAN',
      regionLevel: 'KECAMATAN',
      startPeriod: newDatasetStartPeriod,
      source: agricultureSource
    }
  },
  {
    id: 'PRODUKSI_DAGING_HEWAN_TERNAK_KECAMATAN_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Produksi Daging Hewan Ternak',
    description: 'Data tahunan produksi daging hewan ternak menurut kecamatan.',
    dataSchema: {
      version: 1,
      fields: unitProductionFields(
        [
          ['sapi', 'Sapi'],
          ['kerbau', 'Kerbau'],
          ['kambing_domba', 'Kambing/Domba'],
          ['babi', 'Babi'],
          ['kuda', 'Kuda'],
          ['ayam_buras', 'Ayam Buras'],
          ['ayam_pedaging', 'Ayam Pedaging'],
          ['kelinci', 'Kelinci'],
          ['merpati', 'Merpati'],
          ['itik', 'Itik']
        ],
        'Kg'
      )
    },
    dataConfig: {
      version: 1,
      mode: 'REGIONAL',
      periodicity: 'TAHUNAN',
      regionLevel: 'KECAMATAN',
      startPeriod: newDatasetStartPeriod,
      source: agricultureSource
    }
  },
  {
    id: 'PRODUKSI_TELUR_UNGGAS_KECAMATAN_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Produksi Telur Unggas',
    description: 'Data tahunan produksi telur unggas menurut kecamatan.',
    dataSchema: {
      version: 1,
      fields: unitProductionFields(
        [
          ['ayam_buras', 'Ayam Buras'],
          ['ayam_ras', 'Ayam Ras'],
          ['itik_entok_angsa', 'Itik/Entok/Angsa'],
          ['puyuh', 'Puyuh']
        ],
        'Butir'
      )
    },
    dataConfig: {
      version: 1,
      mode: 'REGIONAL',
      periodicity: 'TAHUNAN',
      regionLevel: 'KECAMATAN',
      startPeriod: newDatasetStartPeriod
    }
  },
  {
    id: 'PRODUKSI_BUAH_BUAHAN_KECAMATAN_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Produksi Buah-Buahan',
    description: 'Data tahunan produksi buah-buahan menurut kecamatan.',
    dataSchema: {
      version: 1,
      fields: unitProductionFields(
        [
          ['alpukat', 'Alpukat'],
          ['anggur', 'Anggur'],
          ['apel', 'Apel'],
          ['belimbing', 'Belimbing'],
          ['duku_langsat_kokosan', 'Duku/Langsat/Kokosan'],
          ['durian', 'Durian'],
          ['jambu_air', 'Jambu Air'],
          ['jambu_biji', 'Jambu Biji'],
          ['jengkol', 'Jengkol'],
          ['jeruk_besar', 'Jeruk Besar'],
          ['jeruk_siam_keprok', 'Jeruk Siam/Keprok'],
          ['mangga', 'Mangga'],
          ['manggis', 'Manggis'],
          ['melinjo', 'Melinjo'],
          ['nangka_cempedak', 'Nangka/Cempedak'],
          ['nenas', 'Nenas'],
          ['pepaya', 'Pepaya'],
          ['petai', 'Petai'],
          ['pisang', 'Pisang'],
          ['rambutan', 'Rambutan'],
          ['salak', 'Salak'],
          ['sawo', 'Sawo'],
          ['sirsak', 'Sirsak'],
          ['sukun', 'Sukun'],
          ['buah_naga', 'Buah Naga'],
          ['jeruk_lemon', 'Jeruk Lemon'],
          ['lengkeng', 'Lengkeng']
        ],
        'Kuintal',
        2
      )
    },
    dataConfig: {
      version: 1,
      mode: 'REGIONAL',
      periodicity: 'TAHUNAN',
      regionLevel: 'KECAMATAN',
      startPeriod: newDatasetStartPeriod,
      source: agricultureSource
    }
  },
  {
    id: 'PRODUKSI_SAYUR_SAYURAN_KECAMATAN_TAHUNAN',
    ownerBidangId: defaultOwnerBidangId,
    name: 'Produksi Sayur-Sayuran',
    description: 'Data tahunan produksi sayur-sayuran menurut kecamatan.',
    dataSchema: {
      version: 1,
      fields: unitProductionFields(
        [
          ['bawang_daun', 'Bawang Daun'],
          ['bawang_merah', 'Bawang Merah'],
          ['bawang_putih', 'Bawang Putih'],
          ['bayam', 'Bayam'],
          ['buncis', 'Buncis'],
          ['cabai_rawit', 'Cabai Rawit'],
          ['kacang_panjang', 'Kacang Panjang'],
          ['kangkung', 'Kangkung'],
          ['kembang_kol', 'Kembang Kol'],
          ['kentang', 'Kentang'],
          ['ketimun', 'Ketimun'],
          ['kubis', 'Kubis'],
          ['labu_siam', 'Labu Siam'],
          ['melon', 'Melon'],
          ['paprika', 'Paprika'],
          ['petsai_sawi', 'Petsai/Sawi'],
          ['semangka', 'Semangka'],
          ['stroberi', 'Stroberi'],
          ['terung', 'Terung'],
          ['tomat', 'Tomat'],
          ['wortel', 'Wortel'],
          ['cabai_besar_tw_teropong', 'Cabai Besar/TW/Teropong'],
          ['cabai_keriting', 'Cabai Keriting'],
          ['jamur_tiram', 'Jamur Tiram'],
          ['jamur_merang', 'Jamur Merang'],
          ['jamur_lainnya', 'Jamur Lainnya']
        ],
        'Kuintal',
        2
      )
    },
    dataConfig: {
      version: 1,
      mode: 'REGIONAL',
      periodicity: 'TAHUNAN',
      regionLevel: 'KECAMATAN',
      startPeriod: newDatasetStartPeriod,
      source: agricultureSource
    }
  }
] as const satisfies readonly SeedDatasetDefinition[]

const seedDatasetRecords = [
  {
    datasetId: 'PPH_TAHUNAN',
    regionId: defaultKabupatenRegionId,
    periodDate: '2024-01-01',
    data: { pph_konsumsi: 90, pph_ketersediaan: 79.01 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'PPH_TAHUNAN',
    regionId: defaultKabupatenRegionId,
    periodDate: '2025-01-01',
    data: { pph_konsumsi: 91.4, pph_ketersediaan: 81.86 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.04.2002',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.04.2001',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.04.2003',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.04.2004',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.04.2005',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.04.2006',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.04.2007',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.01.2002',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.01.2001',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.01.2003',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.01.2009',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.08.2001',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.08.2002',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.08.2003',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.08.2004',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.08.2005',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.2009',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.2001',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.1005',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.2010',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.1006',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.1007',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.1004',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.1008',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.2011',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.2013',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.2014',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.2015',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.1012',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.2020',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.1019',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.02.2021',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.07.2002',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.07.2001',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.07.2003',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.07.2004',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.07.2005',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.07.2006',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.05.2004',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.05.2001',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.05.2002',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.05.2003',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.05.2009',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.05.2005',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.05.2008',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.05.2006',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.05.2007',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.03.2008',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.03.2001',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.03.2002',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.03.2003',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.03.2011',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.03.2004',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.03.2005',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.03.2013',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.03.2015',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.03.2014',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.06.2001',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.06.2002',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.06.2003',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.06.2004',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 6 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.06.2005',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.06.2008',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.06.2007',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 5 },
    status: 'PUBLISHED'
  },
  {
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    regionId: '52.07.06.2006',
    periodDate: foodSecurityStatusPeriodDate,
    data: { priority: 4 },
    status: 'PUBLISHED'
  }
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
      && JSON.stringify(currentDataset.dataSchema)
      === JSON.stringify(seedDataset.dataSchema)
      && JSON.stringify(currentDataset.dataConfig)
      === JSON.stringify(seedDataset.dataConfig)
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
