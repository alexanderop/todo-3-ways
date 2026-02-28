import type { IndexeddbPersistence } from 'y-indexeddb'
import type { WebsocketProvider } from 'y-websocket'
import type * as Y from 'yjs'

declare global {
  // eslint-disable-next-line vars-on-top
  var __yDoc: Y.Doc | undefined
  // eslint-disable-next-line vars-on-top
  var __yIdb: IndexeddbPersistence | undefined
  // eslint-disable-next-line vars-on-top
  var __yWs: WebsocketProvider | undefined
}
