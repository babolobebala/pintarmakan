// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@vite-pwa/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light',
    fallback: 'light',
    storageKey: 'smartfood-color-mode'
  },

  runtimeConfig: {
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || '',
    public: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || ''
    }
  },

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  pwa: {
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    registerWebManifestInRouteRules: true,
    includeAssets: ['favicon.ico'],
    manifest: {
      id: '/',
      name: 'Smart Food KSB',
      short_name: 'Smart Food KSB',
      description: 'Dashboard Dinas Ketahanan Pangan Kabupaten Sumbawa Barat',
      theme_color: '#18181b',
      background_color: '#ffffff',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      lang: 'en',
      icons: [
        {
          src: 'icons/icon-48x48.png',
          sizes: '48x48',
          type: 'image/png'
        },
        {
          src: 'icons/icon-72x72.png',
          sizes: '72x72',
          type: 'image/png'
        },
        {
          src: 'icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png'
        },
        {
          src: 'icons/icon-144x144.png',
          sizes: '144x144',
          type: 'image/png'
        },
        {
          src: 'icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}']
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: false
    }
  }
})
