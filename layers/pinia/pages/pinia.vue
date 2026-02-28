<script setup lang="ts">
const store = useTodoStore()
const newTodo = ref('')

await callOnce(store.fetchTodos)

async function handleAdd() {
  if (!newTodo.value.trim())
    return
  await store.addTodo(newTodo.value)
  newTodo.value = ''
}
</script>

<template>
  <div class="todo-app">
    <h1>Pinia Todos</h1>
    <p class="subtitle">
      Manual state management
    </p>

    <div class="todo-card">
      <form class="add-form" @submit.prevent="handleAdd">
        <input v-model="newTodo" placeholder="What needs to be done?">
        <button type="submit">
          Add
        </button>
      </form>

      <p v-if="store.loading" class="status">
        Loading...
      </p>
      <p v-else-if="store.error" class="status error">
        Error: {{ store.error }}
      </p>

      <ul v-else class="todo-list">
        <li v-for="todo in store.todos" :key="todo.id" class="todo-item">
          <input
            type="checkbox"
            :checked="!!todo.completed"
            @change="store.toggleTodo(todo.id, todo.completed)"
          >
          <span :class="{ done: todo.completed }">{{ todo.title }}</span>
          <button class="delete" @click="store.deleteTodo(todo.id)">
            ✕
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
