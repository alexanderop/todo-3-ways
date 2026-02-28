import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTodoStore = defineStore('todos', () => {
  const todos = ref<Array<{ id: number, title: string, completed: number, createdAt: string }>>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTodos() {
    loading.value = true
    error.value = null
    try {
      todos.value = await $fetch('/api/todos')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    }
    finally {
      loading.value = false
    }
  }

  async function addTodo(title: string) {
    try {
      await $fetch('/api/todos', {
        method: 'POST',
        body: { title },
      })
      await fetchTodos()
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    }
  }

  async function toggleTodo(id: number, completed: number) {
    try {
      await $fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        body: { completed: completed ? 0 : 1 },
      })
      await fetchTodos()
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    }
  }

  async function deleteTodo(id: number) {
    try {
      await $fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      })
      await fetchTodos()
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    }
  }

  return { todos, loading, error, fetchTodos, addTodo, toggleTodo, deleteTodo }
})
