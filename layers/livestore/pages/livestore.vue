<script setup lang="ts">
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { LiveStoreProvider } from 'vue-livestore'
import LiveStoreWorker from '../livestore/livestore.worker?worker'
import { schema } from '../livestore/schema'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

const storeOptions = {
  schema,
  adapter,
  storeId: 'livestore-todos',
}
</script>

<template>
  <LiveStoreProvider :options="storeOptions">
    <template #loading>
      <TodoPage
        title="LiveStore Todos"
        subtitle="Approach 6 — Event-sourced local-first reactive database"
        :todos="[]"
        :loading="true"
        :error="null"
      />
    </template>

    <LivestoreTodoContent />
  </LiveStoreProvider>
</template>
