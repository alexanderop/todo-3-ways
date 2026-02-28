<script setup lang="ts">
import { callOnce, useOfflineSimulation, useTabSync } from '#imports'
import { useTodoStore } from '../stores/todos'

const store = useTodoStore()
const { isOffline, toggleOffline } = useOfflineSimulation()
const { tabCount, lastRemoteEvent, broadcastMutation } = useTabSync('pinia')

const capabilities = [
  { label: 'Offline', supported: false },
  { label: 'Multi-tab sync', supported: false },
  { label: 'Conflict-free', supported: false },
  { label: 'Real-time', supported: false },
]

async function handleAdd(title: string) {
  await store.addTodo(title)
  broadcastMutation('Todo added in another tab')
}

async function handleToggle(id: number | string) {
  const numId = Number(id)
  const todo = store.todos.find(t => t.id === numId)
  if (todo) {
    await store.toggleTodo(numId, todo.completed)
    broadcastMutation('Todo toggled in another tab')
  }
}

async function handleDelete(id: number | string) {
  await store.deleteTodo(Number(id))
  broadcastMutation('Todo deleted in another tab')
}

await callOnce(store.fetchTodos)
</script>

<template>
  <TodoPage
    title="Pinia Todos"
    subtitle="Manual state management"
    :todos="store.todos"
    :loading="store.loading"
    :error="store.error"
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
