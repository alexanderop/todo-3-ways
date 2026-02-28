<script setup lang="ts">
import { useNuxtApp, useOfflineSimulation, useTabSync } from '#imports'
import { watch } from 'vue'
import { useYjsTodos } from '../composables/useYjsTodos'

const { todos, isOnline, isSynced, addTodo, toggleTodo, deleteTodo, undo, redo, canUndo, canRedo } = useYjsTodos()
const { isOffline, toggleOffline } = useOfflineSimulation()
const { tabCount, lastRemoteEvent, broadcastMutation } = useTabSync('yjs')

const capabilities = [
  { label: 'Offline', supported: true },
  { label: 'Multi-tab sync', supported: true },
  { label: 'Conflict-free', supported: true },
  { label: 'Real-time', supported: true },
]

if (import.meta.client) {
  const { $yWs: ws } = useNuxtApp()
  watch(isOffline, (offline) => {
    if (offline) {
      ws.shouldConnect = false
      ws.disconnect()
      return
    }

    ws.shouldConnect = true
    ws.connect()
  })
}

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
    title="Yjs Todos"
    subtitle="Local-first CRDT with offline sync"
    :todos="todos"
    @add="handleAdd"
    @toggle="handleToggle"
    @delete="handleDelete"
  >
    <template #subtitle-extra>
      <span
        class="bg-text-base/20 sync-dot"
        :class="{ online: isOnline, synced: isSynced && !isOnline }"
        :title="isOnline ? 'Connected' : isSynced ? 'Offline (synced)' : 'Loading...'"
      />
    </template>
    <template #toolbar>
      <div class="flex gap-2 items-center">
        <button
          :disabled="!canUndo"
          class="border-base/20 bg-base/5 text-sm px-2 py-1 border rounded-md inline-flex gap-1 transition items-center disabled:opacity-40 disabled:cursor-not-allowed"
          title="Undo (CRDT-aware)"
          @click="undo()"
        >
          <span class="i-carbon-undo h-4 w-4 inline-block" />
          Undo
        </button>
        <button
          :disabled="!canRedo"
          class="border-base/20 bg-base/5 text-sm px-2 py-1 border rounded-md inline-flex gap-1 transition items-center disabled:opacity-40 disabled:cursor-not-allowed"
          title="Redo (CRDT-aware)"
          @click="redo()"
        >
          <span class="i-carbon-redo h-4 w-4 inline-block" />
          Redo
        </button>
      </div>
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
