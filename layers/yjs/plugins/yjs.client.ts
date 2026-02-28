import { defineNuxtPlugin } from '#app'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

export default defineNuxtPlugin(() => {
  if (!globalThis.__yDoc) {
    globalThis.__yDoc = new Y.Doc()
  }
  const doc = globalThis.__yDoc

  if (!globalThis.__yIdb) {
    globalThis.__yIdb = new IndexeddbPersistence('todo-yjs', doc)
  }
  const idb = globalThis.__yIdb

  const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${wsProto}//${location.host}/_yjs`

  if (globalThis.__yWs) {
    globalThis.__yWs.destroy()
  }
  globalThis.__yWs = new WebsocketProvider(wsUrl, 'todo-yjs', doc)
  const ws = globalThis.__yWs

  return {
    provide: {
      yDoc: doc,
      yIdb: idb,
      yWs: ws,
    },
  }
})
