// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxt/image',
    '@nuxt/icon',
    '@vite-pwa/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

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
    registerType: 'autoUpdate',
    registerWebManifestInRouteRules: true,
    includeAssets: ['favicon.ico'],
    manifest: {
      id: '/',
      name: 'Nuxt Dashboard Template',
      short_name: 'Dashboard',
      description: 'A professional dashboard template built with Nuxt UI for admin and analytics workflows.',
      theme_color: '#18181b',
      background_color: '#ffffff',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      lang: 'en',
      icons: [
        {
          src: 'icons/icon-192-v2.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'icons/icon-512-v2.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'icons/icon-512-maskable-v2.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: undefined,
      globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      navigateFallbackDenylist: [/^\/api\//]
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: false
    }
  }
})
