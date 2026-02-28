export default defineNuxtConfig({
  extends: [
    './layers/pinia',
    './layers/colada',
    './layers/rstore',
    './layers/yjs',
  ],

  modules: [
    '@unocss/nuxt',
    '@nuxt/eslint',
  ],

  imports: {
    autoImport: false,
  },

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
        { name: 'description', content: 'Todo app built 4 ways with Pinia, Pinia Colada, rstore, and Yjs' },
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
})
