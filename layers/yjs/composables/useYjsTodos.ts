import type { IndexeddbPersistence } from 'y-indexeddb'
import type { WebsocketProvider } from 'y-websocket'
import { useNuxtApp } from '#app'
import { computed, onScopeDispose, ref } from 'vue'
import * as Y from 'yjs'
import { useY } from './useY'

declare module '#app' {
  interface NuxtApp {
    $yDoc: Y.Doc
    $yWs: WebsocketProvider
    $yIdb: IndexeddbPersistence
  }
}

interface Todo {
  id: string
  title: string
  completed: number
  createdAt: number
}

export function useYjsTodos() {
  const { $yDoc: doc, $yWs: ws, $yIdb: idb } = useNuxtApp()

  const todosMap = doc.getMap<Y.Map<unknown>>('todos')
  // eslint-disable-next-line ts/consistent-type-assertions
  const rawTodos = useY(todosMap as Y.AbstractType<unknown>)
  const todos = computed<Todo[]>(() => {
    return Object.entries(rawTodos.value)
      .map(([id, fields]) => ({
        id,
        title: String(fields.title ?? ''),
        completed: Number(fields.completed ?? 0),
        createdAt: Number(fields.createdAt ?? 0),
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
  })

  const isSynced = ref(false)
  const isOnline = ref(false)

  function addTodo(title: string) {
    const id = crypto.randomUUID()
    const yMap = new Y.Map<unknown>()
    doc.transact(() => {
      yMap.set('title', title)
      yMap.set('completed', 0)
      yMap.set('createdAt', Date.now())
      todosMap.set(id, yMap)
    })
  }

  function toggleTodo(id: string) {
    const yMap = todosMap.get(id)
    if (!yMap)
      return
    const current = Number(yMap.get('completed') ?? 0)
    yMap.set('completed', current ? 0 : 1)
  }

  function deleteTodo(id: string) {
    todosMap.delete(id)
  }

  const onSync = () => {
    isSynced.value = true
  }
  idb.on('synced', onSync)

  const onStatus = ({ status }: { status: string }) => {
    isOnline.value = status === 'connected'
  }
  ws.on('status', onStatus)

  onScopeDispose(() => {
    idb.off('synced', onSync)
    ws.off('status', onStatus)
  })

  return {
    todos,
    isSynced,
    isOnline,
    addTodo,
    toggleTodo,
    deleteTodo,
  }
}
