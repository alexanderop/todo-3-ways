<script setup lang="ts">
const { id, title, completed } = defineProps<{
  id: number | string
  title: string
  completed: number
}>()

const emit = defineEmits<{
  toggle: [id: number | string]
  delete: [id: number | string]
}>()
</script>

<template>
  <li class="group todo-item">
    <input
      type="checkbox"
      :checked="!!completed"
      class="todo-checkbox hover:border-accent/60 checked:todo-checkbox-checked"
      @change="emit('toggle', id)"
    >
    <span class="todo-text" :class="{ 'todo-text-done': completed }">
      {{ title }}
    </span>
    <button class="todo-delete" @click="emit('delete', id)">
      ✕
    </button>
  </li>
</template>
