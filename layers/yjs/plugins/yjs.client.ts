import { defineNuxtPlugin } from '#app'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

export default defineNuxtPlugin(() => {
  const doc = new Y.Doc()
  const idb = new IndexeddbPersistence('todo-yjs', doc)
  const ws = new WebsocketProvider('ws://localhost:1234', 'todo-yjs', doc)

  return {
    provide: {
      yDoc: doc,
      yIdb: idb,
      yWs: ws,
    },
  }
})
