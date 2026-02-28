<script setup lang="ts">
const store = useStore()
const newTodo = ref('')

const { data: todos, loading } = await store.todos.query(q => q.many())

async function handleAdd() {
  if (!newTodo.value.trim())
    return
  await store.todos.create({
    title: newTodo.value,
    completed: 0,
    createdAt: new Date(),
  })
  newTodo.value = ''
}

async function toggleTodo(todo: { completed: number, $update: (data: Record<string, unknown>) => Promise<void> }) {
  await todo.$update({
    completed: todo.completed ? 0 : 1,
  })
}

async function deleteTodo(id: number) {
  await store.todos.delete(id)
}
</script>

<template>
  <div class="todo-app">
    <h1>rstore Todos</h1>
    <p class="subtitle">
      Local-first with Drizzle auto-generated API
    </p>

    <div class="todo-card">
      <form class="add-form" @submit.prevent="handleAdd">
        <input v-model="newTodo" placeholder="What needs to be done?">
        <button type="submit">
          Add
        </button>
      </form>

      <p v-if="loading" class="status">
        Loading...
      </p>

      <ul v-else class="todo-list">
        <li v-for="todo in todos" :key="todo.id" class="todo-item">
          <input
            type="checkbox"
            :checked="!!todo.completed"
            @change="toggleTodo(todo)"
          >
          <span :class="{ done: todo.completed }">{{ todo.title }}</span>
          <button class="delete" @click="deleteTodo(todo.id)">
            ✕
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
