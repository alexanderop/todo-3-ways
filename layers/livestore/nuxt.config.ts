import { fileURLToPath } from 'node:url'
import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite'

const schemaPath = fileURLToPath(new URL('./livestore/schema.ts', import.meta.url))

export default defineNuxtConfig({
  extends: ['../shared'],
  vite: {
    optimizeDeps: {
      exclude: ['@livestore/wa-sqlite'],
    },
    worker: {
      format: 'es',
    },
    plugins: [
      // @ts-expect-error livestore devtools uses a different vite version internally
      livestoreDevtoolsPlugin({ schemaPath }),
    ],
  },
})
