import { defineNuxtPlugin } from '#app'
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import LiveStoreWorker from '../livestore/livestore.worker?worker'

export default defineNuxtPlugin(() => {
  if (!globalThis.__livestoreAdapter) {
    globalThis.__livestoreAdapter = makePersistedAdapter({
      storage: { type: 'opfs' },
      worker: LiveStoreWorker,
      sharedWorker: LiveStoreSharedWorker,
    })
  }

  return {
    provide: {
      livestoreAdapter: globalThis.__livestoreAdapter,
    },
  }
})
