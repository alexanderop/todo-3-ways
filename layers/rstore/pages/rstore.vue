<script setup lang="ts">
import { useOfflineSimulation, useStore, useTabSync } from '#imports'

const store = useStore()
const { isOffline, toggleOffline } = useOfflineSimulation()
const { tabCount, lastRemoteEvent, broadcastMutation } = useTabSync('rstore')

const capabilities = [
  { label: 'Offline', supported: true },
  { label: 'Multi-tab sync', supported: false },
  { label: 'Conflict-free', supported: false },
  { label: 'Real-time', supported: false },
]

const { data: todos, loading } = await store.todos.query(q => q.many())

async function handleAdd(title: string) {
  // Negative temp id won't conflict with auto-increment; integer timestamp avoids Date proxy issues offline
  const tempId = -Math.floor(Math.random() * 1_000_000)
  const now = Math.floor(Date.now() / 1000)
  await store.todos.create({ id: tempId, title, completed: 0, createdAt: now, updatedAt: now })
  broadcastMutation('Todo added in another tab')
}

async function handleToggle(id: number | string) {
  const todo = todos.value?.find(t => t.id === id)
  if (todo) {
    await todo.$update({ completed: todo.completed ? 0 : 1 })
    broadcastMutation('Todo toggled in another tab')
  }
}

async function handleDelete(id: number | string) {
  await store.todos.delete(id)
  broadcastMutation('Todo deleted in another tab')
}
</script>

<template>
  <TodoPage
    title="rstore Todos"
    subtitle="Local-first with Drizzle auto-generated API"
    :todos="todos ?? []"
    :loading="loading"
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
