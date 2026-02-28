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
  if (import.meta.server) {
    return {
      todos: computed<Todo[]>(() => []),
      isSynced: ref(false),
      isOnline: ref(false),
      canUndo: ref(false),
      canRedo: ref(false),
      addTodo: (_title: string) => {},
      toggleTodo: (_id: string) => {},
      deleteTodo: (_id: string) => {},
      undo: () => {},
      redo: () => {},
    }
  }

  const { $yDoc: doc, $yWs: ws, $yIdb: idb } = useNuxtApp()

  const todosArray = doc.getArray<Y.Map<unknown>>('todoList')
  // eslint-disable-next-line ts/consistent-type-assertions
  const rawTodos = useY(todosArray as Y.AbstractType<unknown>)
  const todos = computed<Todo[]>(() => {
    const arr = rawTodos.value
    if (!Array.isArray(arr))
      return []
    return arr.map((item: Record<string, unknown>) => ({
      id: String(item.id ?? ''),
      title: String(item.title ?? ''),
      completed: Number(item.completed ?? 0),
      createdAt: Number(item.createdAt ?? 0),
    }))
  })

  // UndoManager — per-user undo/redo that ignores remote changes
  const undoManager = new Y.UndoManager(todosArray)
  const canUndo = ref(undoManager.undoStack.length > 0)
  const canRedo = ref(undoManager.redoStack.length > 0)

  function updateUndoState() {
    canUndo.value = undoManager.undoStack.length > 0
    canRedo.value = undoManager.redoStack.length > 0
  }

  undoManager.on('stack-item-added', updateUndoState)
  undoManager.on('stack-item-popped', updateUndoState)
  undoManager.on('stack-cleared', updateUndoState)

  function undo() {
    undoManager.undo()
  }

  function redo() {
    undoManager.redo()
  }

  const isSynced = ref(false)
  const isOnline = ref(false)

  function addTodo(title: string) {
    const id = crypto.randomUUID()
    const yMap = new Y.Map<unknown>()
    doc.transact(() => {
      yMap.set('id', id)
      yMap.set('title', title)
      yMap.set('completed', 0)
      yMap.set('createdAt', Date.now())
      todosArray.insert(0, [yMap])
    })
  }

  function toggleTodo(id: string) {
    doc.transact(() => {
      for (let i = 0; i < todosArray.length; i++) {
        const yMap = todosArray.get(i)
        if (yMap.get('id') === id) {
          const current = Number(yMap.get('completed') ?? 0)
          yMap.set('completed', current ? 0 : 1)
          break
        }
      }
    })
  }

  function deleteTodo(id: string) {
    doc.transact(() => {
      for (let i = 0; i < todosArray.length; i++) {
        const yMap = todosArray.get(i)
        if (yMap.get('id') === id) {
          todosArray.delete(i, 1)
          break
        }
      }
    })
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
    undoManager.off('stack-item-added', updateUndoState)
    undoManager.off('stack-item-popped', updateUndoState)
    undoManager.off('stack-cleared', updateUndoState)
    undoManager.destroy()
    idb.off('synced', onSync)
    ws.off('status', onStatus)
  })

  return {
    todos,
    isSynced,
    isOnline,
    canUndo,
    canRedo,
    addTodo,
    toggleTodo,
    deleteTodo,
    undo,
    redo,
  }
}
