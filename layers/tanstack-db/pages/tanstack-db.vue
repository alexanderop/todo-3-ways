<script setup lang="ts">
import { useOfflineSimulation, useTabSync } from '#imports'
import { useTanstackDbTodos } from '../composables/useTanstackDbTodos'

const { todos, loading, error, addTodo, toggleTodo, deleteTodo } = useTanstackDbTodos()
const { isOffline, toggleOffline } = useOfflineSimulation()
const { tabCount, lastRemoteEvent, broadcastMutation } = useTabSync('tanstack-db')

const capabilities = [
  { label: 'Offline', supported: false },
  { label: 'Multi-tab sync', supported: false },
  { label: 'Conflict-free', supported: false },
  { label: 'Real-time', supported: false },
]

function handleAdd(title: string) {
  addTodo(title)
  broadcastMutation('Todo added in another tab')
}

function handleToggle(id: number | string) {
  toggleTodo(id)
  broadcastMutation('Todo toggled in another tab')
}

function handleDelete(id: number | string) {
  deleteTodo(id)
  broadcastMutation('Todo deleted in another tab')
}
</script>

<template>
  <TodoPage
    title="TanStack DB Todos"
    subtitle="Client-side reactive database with live queries"
    :todos="todos"
    :loading="loading"
    :error="error"
    @add="handleAdd"
    @toggle="handleToggle"
    @delete="handleDelete"
  >
    <template #toolbar>
      <DemoToolbar
        :capabilities="capabilities"
        :is-offline="isOffline"
        :tab-count="tabCount"
        :last-remote-event="lastRemoteEvent"
        @toggle-offline="toggleOffline"
      />
    </template>
  </TodoPage>
</template>
