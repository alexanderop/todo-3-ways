<script setup lang="ts">
import { useOfflineSimulation, useTabSync } from '#imports'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'

const queryCache = useQueryCache()
const { isOffline, toggleOffline } = useOfflineSimulation()
const { tabCount, lastRemoteEvent, broadcastMutation } = useTabSync('colada')

const capabilities = [
  { label: 'Offline', supported: false },
  { label: 'Multi-tab sync', supported: false },
  { label: 'Conflict-free', supported: false },
  { label: 'Real-time', supported: false },
]

const { data: todos, isPending, error } = useQuery({
  key: ['todos'],
  query: () => $fetch('/api/todos'),
})

const { mutate: addTodo } = useMutation({
  mutation: (title: string) =>
    $fetch('/api/todos', { method: 'POST', body: { title } }),
  onSettled() {
    queryCache.invalidateQueries({ key: ['todos'] })
    broadcastMutation('Todo added in another tab')
  },
})

const { mutate: toggleTodo } = useMutation({
  mutation: ({ id, completed }: { id: number, completed: number }) =>
    $fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      body: { completed: completed ? 0 : 1 },
    }),
  onSettled() {
    queryCache.invalidateQueries({ key: ['todos'] })
    broadcastMutation('Todo toggled in another tab')
  },
})

const { mutate: deleteTodo } = useMutation({
  mutation: (id: number) =>
    $fetch(`/api/todos/${id}`, { method: 'DELETE' }),
  onSettled() {
    queryCache.invalidateQueries({ key: ['todos'] })
    broadcastMutation('Todo deleted in another tab')
  },
})
</script>

<template>
  <TodoPage
    title="Pinia Colada Todos"
    subtitle="Keyed queries with automatic caching"
    :todos="todos ?? []"
    :loading="isPending"
    :error="error?.message"
    @add="addTodo"
    @toggle="(id) => toggleTodo({ id: id as number, completed: todos?.find(t => t.id === id)?.completed ?? 0 })"
    @delete="(id) => deleteTodo(id as number)"
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
