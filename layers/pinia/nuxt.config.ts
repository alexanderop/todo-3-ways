export default defineNuxtConfig({
  extends: ['../shared'],

  modules: [
    '@pinia/nuxt',
  ],

  pinia: {
    storesDirs: ['stores'],
  },
})
