<script setup lang="ts">
import { ref } from 'vue'

const { title, subtitle, todos, loading = false, error = null } = defineProps<{
  title: string
  subtitle: string
  todos: Array<{ id: number | string, title: string, completed: number }>
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  add: [title: string]
  toggle: [id: number | string]
  delete: [id: number | string]
}>()

const newTodo = ref('')

function handleAdd() {
  if (!newTodo.value.trim())
    return
  emit('add', newTodo.value.trim())
  newTodo.value = ''
}
</script>

<template>
  <div class="todo-app">
    <h1 class="todo-title">
      {{ title }}
    </h1>
    <p class="todo-subtitle">
      {{ subtitle }}
      <slot name="subtitle-extra" />
    </p>

    <div class="todo-card">
      <form class="flex gap-2" @submit.prevent="handleAdd">
        <input v-model="newTodo" class="add-input" placeholder="What needs to be done?">
        <button type="submit" class="add-button">
          Add
        </button>
      </form>

      <p v-if="loading" class="todo-status">
        Loading...
      </p>
      <p v-else-if="error" class="todo-status todo-status-error">
        Error: {{ error }}
      </p>

      <ul v-else class="todo-list m-0 p-0 list-none [&:not(:empty)]:(mt-4 pt-1 border-t border-border/15)">
        <TodoItem
          v-for="todo in todos"
          :key="todo.id"
          v-bind="todo"
          @toggle="emit('toggle', $event)"
          @delete="emit('delete', $event)"
        />
      </ul>
    </div>
  </div>
</template>
