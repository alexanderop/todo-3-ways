export default defineNuxtConfig({
  extends: ['../shared'],

  modules: [
    '@rstore/nuxt-drizzle',
  ],

  rstoreDrizzle: {
    drizzleImport: {
      name: 'useDrizzle',
      from: '~~/layers/shared/server/utils/drizzle',
    },
    offline: true,
  },
})
