<script setup lang="ts">
const { todos, isOnline, isSynced, addTodo, toggleTodo, deleteTodo } = useYjsTodos()
</script>

<template>
  <TodoPage
    title="Yjs Todos"
    subtitle="Local-first CRDT with offline sync"
    :todos="todos"
    @add="addTodo"
    @toggle="(id) => toggleTodo(id as string)"
    @delete="(id) => deleteTodo(id as string)"
  >
    <template #subtitle-extra>
      <span
        class="bg-text-base/20 sync-dot"
        :class="{ online: isOnline, synced: isSynced && !isOnline }"
        :title="isOnline ? 'Connected' : isSynced ? 'Offline (synced)' : 'Loading...'"
      />
    </template>
  </TodoPage>
</template>
