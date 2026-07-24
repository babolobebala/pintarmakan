process.env.NODE_ENV = process.env.NODE_ENV || 'production'

import('./.output/server/index.mjs').catch((error) => {
  console.error('Failed to start Nuxt server', error)
  process.exit(1)
})
