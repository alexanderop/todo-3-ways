import type { PersistedAdapter } from '@livestore/adapter-web'

declare global {
  // eslint-disable-next-line vars-on-top
  var __livestoreAdapter: PersistedAdapter | undefined
}

export {}
