import type { ComputedRef } from 'vue'
import { queryDb } from '@livestore/livestore'
import { computed } from 'vue'
import { useQuery, useStore } from 'vue-livestore'
import { events, tables } from '../livestore/schema'

interface Todo {
  id: string
  title: string
  completed: number
  createdAt: number
}

export function useLivestoreTodos() {
  // SSR guard — LiveStore is client-only
  if (import.meta.server) {
    return {
      todos: computed<Todo[]>(() => []),
      loading: computed(() => true),
      error: computed<string | null>(() => null),
      addTodo: (_title: string) => {},
      toggleTodo: (_id: string) => {},
      deleteTodo: (_id: string) => {},
    }
  }

  const { store } = useStore()

  // Reactive query — auto-updates when materializer changes state
  const visibleTodos$ = queryDb(
    () => tables.todos.where({ deletedAt: null }),
    { label: 'visibleTodos' },
  )
  const rawTodos = useQuery(visibleTodos$)

  // Map boolean completed → integer 0|1 for shared component compatibility
  const todos: ComputedRef<Todo[]> = computed(() =>
    (rawTodos.value ?? []).map(todo => ({
      id: todo.id,
      title: todo.title,
      completed: todo.completed ? 1 : 0,
      createdAt: todo.createdAt,
    })),
  )

  const loading = computed(() => false) // LiveStore loads from local OPFS, effectively instant
  const error = computed<string | null>(() => null)

  function addTodo(title: string) {
    store.commit(events.todoCreated({
      id: crypto.randomUUID(),
      title,
      createdAt: Date.now(),
    }))
  }

  function toggleTodo(id: string) {
    const todo = rawTodos.value?.find(t => t.id === id)
    if (!todo)
      return
    if (todo.completed)
      store.commit(events.todoUncompleted({ id }))

    if (!todo.completed)
      store.commit(events.todoCompleted({ id }))
  }

  function deleteTodo(id: string) {
    store.commit(events.todoDeleted({ id, deletedAt: Date.now() }))
  }

  return { todos, loading, error, addTodo, toggleTodo, deleteTodo }
}
