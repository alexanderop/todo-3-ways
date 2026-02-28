import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { createCollection, useLiveQuery } from '@tanstack/vue-db'
import { computed } from 'vue'
import { queryClient } from '../plugins/query-client.client'

interface TodoRow {
  id: number
  title: string
  completed: number
  createdAt: string
  updatedAt: string
}

function makeTodoCollection() {
  return createCollection<TodoRow, number>(
    queryCollectionOptions({
      id: 'todos',
      queryKey: ['todos'],
      queryFn: () => $fetch<TodoRow[]>('/api/todos'),
      queryClient,
      getKey: (item: TodoRow) => item.id,

      onInsert: async ({ transaction }) => {
        for (const { modified } of transaction.mutations) {
          await $fetch('/api/todos', {
            method: 'POST',
            body: { title: modified.title },
          })
        }
      },

      onUpdate: async ({ transaction }) => {
        for (const { original, modified } of transaction.mutations) {
          await $fetch(`/api/todos/${original.id}`, {
            method: 'PATCH',
            body: { completed: modified.completed },
          })
        }
      },

      onDelete: async ({ transaction }) => {
        for (const { original } of transaction.mutations) {
          await $fetch(`/api/todos/${original.id}`, { method: 'DELETE' })
        }
      },
    }),
  )
}

type TodoCollection = ReturnType<typeof makeTodoCollection>

declare global {
  // eslint-disable-next-line vars-on-top
  var __tanstackDbTodoCollection: TodoCollection | undefined
}

/** Lazy singleton — only created on first client-side call (after the SSR guard). */
function getTodoCollection() {
  return (globalThis.__tanstackDbTodoCollection ??= makeTodoCollection())
}

export function useTanstackDbTodos() {
  if (import.meta.server) {
    return {
      todos: computed<TodoRow[]>(() => []),
      loading: computed(() => true),
      error: computed<string | null>(() => null),
      addTodo: (_title: string) => {},
      toggleTodo: (_id: number | string) => {},
      deleteTodo: (_id: number | string) => {},
    }
  }

  const todoCollection = getTodoCollection()

  const { data, isLoading, isError, status } = useLiveQuery(q =>
    q.from({ todos: todoCollection })
      .select(({ todos }) => ({
        id: todos.id,
        title: todos.title,
        completed: todos.completed,
        createdAt: todos.createdAt,
        updatedAt: todos.updatedAt,
      })),
  )

  const todos = computed(() => data.value ?? [])
  const error = computed(() => isError.value ? String(status.value) : null)

  function addTodo(title: string) {
    const now = new Date().toISOString()
    todoCollection.insert({
      id: Date.now() + Math.floor(Math.random() * 1000),
      title,
      completed: 0,
      createdAt: now,
      updatedAt: now,
    })
  }

  function toggleTodo(id: number | string) {
    todoCollection.update(Number(id), (draft) => {
      draft.completed = draft.completed === 1 ? 0 : 1
    })
  }

  function deleteTodo(id: number | string) {
    todoCollection.delete(Number(id))
  }

  return { todos, loading: isLoading, error, addTodo, toggleTodo, deleteTodo }
}
