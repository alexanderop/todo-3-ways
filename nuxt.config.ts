export default defineNuxtConfig({
  modules: [
    '@unocss/nuxt',
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    '@rstore/nuxt-drizzle',
    '@nuxt/eslint',
  ],

  devtools: {
    enabled: true,
  },

  app: {
    head: {
      viewport: 'width=device-width,initial-scale=1',
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      ],
      meta: [
        { name: 'description', content: 'Todo app built 3 ways with Pinia, Pinia Colada, and rstore' },
      ],
    },
  },

  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    payloadExtraction: false,
    renderJsonPayloads: true,
    typedPages: true,
  },

  compatibilityDate: '2024-08-14',

  nitro: {
    esbuild: {
      options: {
        target: 'esnext',
      },
    },
    prerender: {
      crawlLinks: false,
      routes: ['/'],
    },
  },

  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },

  rstoreDrizzle: {
    // rstore will auto-generate its own API at /api/rstore
    // and create typed collections from our Drizzle schema
  },
})
