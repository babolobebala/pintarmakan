// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    '@stylistic/no-multiple-empty-lines': 'off',
    'vue/no-multiple-template-root': 'off',
    'vue/max-attributes-per-line': ['error', { singleline: 3 }]
  }
})
