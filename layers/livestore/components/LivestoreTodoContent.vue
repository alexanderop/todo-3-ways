<script setup lang="ts">
import { useOfflineSimulation, useTabSync } from '#imports'
import { useLivestoreTodos } from '../composables/useLivestoreTodos'

const { todos, loading, error, addTodo, toggleTodo, deleteTodo } = useLivestoreTodos()
const { isOffline, toggleOffline } = useOfflineSimulation()
const { tabCount, lastRemoteEvent, broadcastMutation } = useTabSync('livestore')

const capabilities = [
  { label: 'Offline', supported: true },
  { label: 'Multi-tab sync', supported: true },
  { label: 'Conflict-free', supported: true },
  { label: 'Real-time', supported: false },
]

function handleAdd(title: string) {
  addTodo(title)
  broadcastMutation('Todo added in another tab')
}

function handleToggle(id: number | string) {
  toggleTodo(String(id))
  broadcastMutation('Todo toggled in another tab')
}

function handleDelete(id: number | string) {
  deleteTodo(String(id))
  broadcastMutation('Todo deleted in another tab')
}
</script>

<template>
  <TodoPage
    title="LiveStore Todos"
    subtitle="Approach 6 — Event-sourced local-first reactive database"
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
