import type {
  DashboardIndicatorKey,
  DashboardIndicatorPayload,
  DashboardOverviewPayload,
  DashboardProductionPayload,
  ProductionCommodityKey
} from '~~/shared/dashboard'

const overviewPayload = (): DashboardOverviewPayload => ({
  key: 'ringkasan-ketahanan-pangan',
  kind: 'overview',
  meta: {
    eyebrow: 'Monitoring utama',
    title: 'Ringkasan ketahanan pangan daerah',
    description: 'Memantau indikator utama, prioritas wilayah, dan tindak lanjut operasional dalam satu kanvas.',
    sourceLabel: 'Server payload terikat · indikator mockup',
    databaseBacked: false,
    updatedAt: new Date().toISOString()
  },
  metrics: [{
    label: 'Indeks Ketahanan Pangan',
    value: '79,24',
    period: 'Tahunan 2026',
    delta: '+2,1 poin',
    tone: 'emerald',
    note: 'Naik dibanding 2025, ditopang wilayah sentra padi dan distribusi antar-kecamatan.'
  }, {
    label: 'Pola Pangan Harapan',
    value: '91,08',
    period: 'Tahunan 2026',
    delta: '+1,4 poin',
    tone: 'amber',
    note: 'Komposisi konsumsi makin seimbang, terutama pada pangan hewani dan hortikultura.'
  }, {
    label: 'Ketersediaan Pangan Daerah',
    value: '162,4 ribu ton',
    period: 'Tahunan 2026',
    delta: '+8,7%',
    tone: 'sky',
    note: 'Surplus produksi didorong pemulihan luas panen dan stabilitas produksi per kecamatan.'
  }, {
    label: 'Cadangan Pangan Pemerintah Daerah',
    value: '284 ton',
    period: 'Bulanan Juli 2026',
    delta: '84% dari target',
    tone: 'rose',
    note: 'Perlu pengisian ulang bertahap menjelang akhir triwulan dan periode rawan paceklik.'
  }],
  yearlyTrend: [{
    year: '2022',
    ikp: 72.8,
    pph: 86.4,
    availability: 141.2
  }, {
    year: '2023',
    ikp: 74.1,
    pph: 87.6,
    availability: 145.8
  }, {
    year: '2024',
    ikp: 76.2,
    pph: 88.9,
    availability: 151.3
  }, {
    year: '2025',
    ikp: 77.4,
    pph: 89.7,
    availability: 156.8
  }, {
    year: '2026',
    ikp: 79.24,
    pph: 91.08,
    availability: 162.4
  }],
  villagePriority: [{
    label: 'Prioritas 1',
    count: 4,
    description: 'Perlu intervensi sangat tinggi',
    tone: '#c2410c'
  }, {
    label: 'Prioritas 2',
    count: 7,
    description: 'Risiko tinggi',
    tone: '#ea580c'
  }, {
    label: 'Prioritas 3',
    count: 11,
    description: 'Waspada',
    tone: '#f59e0b'
  }, {
    label: 'Prioritas 4',
    count: 16,
    description: 'Menengah',
    tone: '#84cc16'
  }, {
    label: 'Prioritas 5',
    count: 18,
    description: 'Relatif aman',
    tone: '#22c55e'
  }, {
    label: 'Prioritas 6',
    count: 8,
    description: 'Sangat tahan pangan',
    tone: '#0f766e'
  }],
  regionalSnapshots: [{
    region: 'Taliwang',
    ikp: 81.4,
    pph: 92.1,
    cppd: 46,
    status: 'Dominan Prioritas 5-6'
  }, {
    region: 'Seteluk',
    ikp: 78.6,
    pph: 90.8,
    cppd: 38,
    status: 'Campuran Prioritas 4-5'
  }, {
    region: 'Brang Rea',
    ikp: 76.3,
    pph: 89.1,
    cppd: 35,
    status: 'Campuran Prioritas 3-4'
  }, {
    region: 'Jereweh',
    ikp: 74.8,
    pph: 88.6,
    cppd: 29,
    status: 'Perlu akselerasi distribusi'
  }],
  spotlightPrograms: [{
    title: 'Stabilisasi CPPD',
    description: 'Fokus pada penguatan stok beras cadangan di gudang kabupaten dan buffer kecamatan.',
    badge: 'Bulanan'
  }, {
    title: 'Pemetaan Prioritas Desa',
    description: 'Sinkronkan intervensi pangan dengan desa Prioritas 1-3 pada semester kedua.',
    badge: 'Tahunan'
  }, {
    title: 'Produksi Pangan Strategis',
    description: 'Koneksikan dashboard ini dengan peta produksi padi, jagung, dan hortikultura.',
    badge: 'Lintas modul'
  }]
})

const productionCommodities = (): DashboardProductionPayload['commodities'] => {
  const commodities: Record<ProductionCommodityKey, DashboardProductionPayload['commodities'][ProductionCommodityKey]> = {
    padi: {
      key: 'padi',
      label: 'Padi',
      unit: 'ton',
      note: 'Komoditas utama untuk ketahanan pangan daerah.',
      category: 'Tanaman pangan',
      districts: [
        { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 3620, production: 22740 },
        { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 2810, production: 17430 },
        { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 3240, production: 21080 },
        { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 1960, production: 11870 },
        { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 1430, production: 8450 },
        { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 1290, production: 7690 },
        { name: 'Maluk', lat: -8.9, lng: 116.725, harvestArea: 1120, production: 6480 },
        { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 980, production: 5590 }
      ]
    },
    jagung: {
      key: 'jagung',
      label: 'Jagung',
      unit: 'ton',
      note: 'Sentra produksi tersebar di kawasan lahan kering dan tadah hujan.',
      category: 'Tanaman pangan',
      districts: [
        { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 1890, production: 10840 },
        { name: 'Seteluk', lat: -8.64, lng: 116.903, harvestArea: 1740, production: 9530 },
        { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 2120, production: 12020 },
        { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 1450, production: 7940 },
        { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 980, production: 5330 },
        { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 1130, production: 6410 },
        { name: 'Maluk', lat: -8.9, lng: 116.725, harvestArea: 860, production: 4710 },
        { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 790, production: 4310 }
      ]
    },
    kedelai: {
      key: 'kedelai',
      label: 'Kedelai',
      unit: 'ton',
      note: 'Masih berpotensi tumbuh melalui intensifikasi lahan tanaman pangan.',
      category: 'Tanaman pangan',
      districts: [
        { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 460, production: 812 },
        { name: 'Seteluk', lat: -8.64, lng: 116.903, harvestArea: 390, production: 670 },
        { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 510, production: 921 },
        { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 320, production: 558 },
        { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 270, production: 446 },
        { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 250, production: 420 },
        { name: 'Maluk', lat: -8.9, lng: 116.725, harvestArea: 210, production: 366 },
        { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 180, production: 298 }
      ]
    },
    cabai: {
      key: 'cabai',
      label: 'Cabai',
      unit: 'ton',
      note: 'Komoditas strategis untuk pengendalian inflasi pangan daerah.',
      category: 'Hortikultura',
      districts: [
        { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 320, production: 2540 },
        { name: 'Seteluk', lat: -8.64, lng: 116.903, harvestArea: 280, production: 2180 },
        { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 350, production: 2790 },
        { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 220, production: 1670 },
        { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 140, production: 1010 },
        { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 180, production: 1280 },
        { name: 'Maluk', lat: -8.9, lng: 116.725, harvestArea: 160, production: 1130 },
        { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 130, production: 940 }
      ]
    },
    bawangMerah: {
      key: 'bawangMerah',
      label: 'Bawang merah',
      unit: 'ton',
      note: 'Cocok ditampilkan sebagai klaster sentra produksi hortikultura.',
      category: 'Hortikultura',
      districts: [
        { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 210, production: 1410 },
        { name: 'Seteluk', lat: -8.64, lng: 116.903, harvestArea: 180, production: 1205 },
        { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 240, production: 1680 },
        { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 150, production: 1015 },
        { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 120, production: 790 },
        { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 110, production: 720 },
        { name: 'Maluk', lat: -8.9, lng: 116.725, harvestArea: 105, production: 701 },
        { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 88, production: 566 }
      ]
    },
    sayuran: {
      key: 'sayuran',
      label: 'Sayuran',
      unit: 'ton',
      note: 'Agregasi komoditas sayuran untuk pemantauan ketersediaan pangan segar.',
      category: 'Hortikultura',
      districts: [
        { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 540, production: 4380 },
        { name: 'Seteluk', lat: -8.64, lng: 116.903, harvestArea: 470, production: 3810 },
        { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 610, production: 4960 },
        { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 340, production: 2710 },
        { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 230, production: 1760 },
        { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 265, production: 2090 },
        { name: 'Maluk', lat: -8.9, lng: 116.725, harvestArea: 240, production: 1915 },
        { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 210, production: 1640 }
      ]
    },
    buahBuahan: {
      key: 'buahBuahan',
      label: 'Buah-buahan',
      unit: 'ton',
      note: 'Ringkasan hortikultura tahunan berbasis kecamatan.',
      category: 'Hortikultura',
      districts: [
        { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 760, production: 5810 },
        { name: 'Seteluk', lat: -8.64, lng: 116.903, harvestArea: 650, production: 4970 },
        { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 810, production: 6230 },
        { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 480, production: 3610 },
        { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 350, production: 2540 },
        { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 390, production: 2860 },
        { name: 'Maluk', lat: -8.9, lng: 116.725, harvestArea: 360, production: 2615 },
        { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 320, production: 2290 }
      ]
    },
    dagingSapi: {
      key: 'dagingSapi',
      label: 'Daging sapi',
      unit: 'ton',
      note: 'Mockup agregasi produksi peternakan per kecamatan.',
      category: 'Peternakan',
      districts: [
        { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 420, production: 920 },
        { name: 'Seteluk', lat: -8.64, lng: 116.903, harvestArea: 390, production: 810 },
        { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 450, production: 1010 },
        { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 310, production: 690 },
        { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 205, production: 460 },
        { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 255, production: 580 },
        { name: 'Maluk', lat: -8.9, lng: 116.725, harvestArea: 238, production: 521 },
        { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 220, production: 488 }
      ]
    },
    ayam: {
      key: 'ayam',
      label: 'Ayam',
      unit: 'ton',
      note: 'Mockup produksi unggas sebagai data tahunan lintas kecamatan.',
      category: 'Peternakan',
      districts: [
        { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 520, production: 1640 },
        { name: 'Seteluk', lat: -8.64, lng: 116.903, harvestArea: 470, production: 1475 },
        { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 610, production: 1930 },
        { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 345, production: 1050 },
        { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 250, production: 755 },
        { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 280, production: 880 },
        { name: 'Maluk', lat: -8.9, lng: 116.725, harvestArea: 268, production: 822 },
        { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 235, production: 724 }
      ]
    },
    telur: {
      key: 'telur',
      label: 'Telur',
      unit: 'ton',
      note: 'Produksi telur untuk dukungan protein hewani dan konsumsi rumah tangga.',
      category: 'Peternakan',
      districts: [
        { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 260, production: 540 },
        { name: 'Seteluk', lat: -8.64, lng: 116.903, harvestArea: 230, production: 485 },
        { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 290, production: 608 },
        { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 190, production: 395 },
        { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 120, production: 248 },
        { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 150, production: 320 },
        { name: 'Maluk', lat: -8.9, lng: 116.725, harvestArea: 145, production: 302 },
        { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 136, production: 281 }
      ]
    },
    ikan: {
      key: 'ikan',
      label: 'Ikan',
      unit: 'ton',
      note: 'Produksi perikanan tangkap dan budidaya untuk pelengkap dashboard pangan.',
      category: 'Perikanan',
      districts: [
        { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 680, production: 4380 },
        { name: 'Seteluk', lat: -8.64, lng: 116.903, harvestArea: 520, production: 3415 },
        { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 410, production: 2640 },
        { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 360, production: 2280 },
        { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 890, production: 5980 },
        { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 930, production: 6320 },
        { name: 'Maluk', lat: -8.9, lng: 116.725, harvestArea: 980, production: 6710 },
        { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 1040, production: 7150 }
      ]
    }
  }

  return commodities
}

const productionPayload = (): DashboardProductionPayload => ({
  key: 'produksi-pangan',
  kind: 'production',
  meta: {
    eyebrow: 'Monitoring sektoral',
    title: 'Produksi pangan per kecamatan',
    description: 'Satu muatan indikator berisi seluruh komoditas strategis agar filter widget tetap berjalan di sisi klien.',
    sourceLabel: 'Server payload terikat · indikator mockup',
    databaseBacked: false,
    updatedAt: new Date().toISOString()
  },
  commodities: productionCommodities()
})

export function getDashboardIndicatorPayload(indicator: DashboardIndicatorKey): DashboardIndicatorPayload {
  switch (indicator) {
    case 'ringkasan-ketahanan-pangan':
      return overviewPayload()
    case 'produksi-pangan':
      return productionPayload()
  }
}
