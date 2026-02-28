<script setup lang="ts">
import type { RemoteEvent } from '../composables/useTabSync'
import { computed, ref, watch } from 'vue'

const { capabilities, isOffline, tabCount, lastRemoteEvent } = defineProps<{
  capabilities: { label: string, supported: boolean }[]
  isOffline: boolean
  tabCount: number
  lastRemoteEvent: RemoteEvent | null
}>()

defineEmits<{
  'toggle-offline': []
}>()

const remoteNotification = ref('')

watch(() => lastRemoteEvent, (event) => {
  if (!event)
    return
  remoteNotification.value = event.action
  setTimeout(() => {
    remoteNotification.value = ''
  }, 3000)
})

const tabLabel = computed(() =>
  tabCount === 1 ? '1 tab' : `${tabCount} tabs`,
)
</script>

<template>
  <div class="demo-toolbar">
    <div class="flex flex-wrap gap-1.5 items-center">
      <span
        v-for="cap in capabilities"
        :key="cap.label"
        class="cap-badge"
        :class="cap.supported ? 'cap-badge-yes' : 'cap-badge-no'"
      >
        {{ cap.label }}
      </span>
    </div>

    <div class="flex gap-4 items-center">
      <button
        class="offline-toggle"
        :class="{ 'offline-toggle-active': isOffline }"
        @click="$emit('toggle-offline')"
      >
        <span
          class="offline-dot"
          :class="isOffline ? 'bg-red-400' : 'bg-green-400'"
        />
        {{ isOffline ? 'Offline' : 'Online' }}
      </button>

      <span class="tab-indicator">
        <span class="i-carbon-screen text-sm mr-1 align-middle inline-block" />
        {{ tabLabel }}
      </span>
    </div>

    <Transition name="notif">
      <div v-if="remoteNotification" class="remote-notif">
        {{ remoteNotification }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.notif-enter-active,
.notif-leave-active {
  transition: all 0.3s ease;
}
.notif-enter-from,
.notif-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
