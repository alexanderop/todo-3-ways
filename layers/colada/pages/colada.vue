<script setup lang="ts">
const newTodo = ref('')
const queryCache = useQueryCache()

const { data: todos, isPending, error } = useQuery({
  key: ['todos'],
  query: () => $fetch('/api/todos'),
})

const { mutate: addTodo } = useMutation({
  mutation: (title: string) =>
    $fetch('/api/todos', { method: 'POST', body: { title } }),
  onSettled() {
    queryCache.invalidateQueries({ key: ['todos'] })
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
  },
})

const { mutate: deleteTodo } = useMutation({
  mutation: (id: number) =>
    $fetch(`/api/todos/${id}`, { method: 'DELETE' }),
  onSettled() {
    queryCache.invalidateQueries({ key: ['todos'] })
  },
})

async function handleAdd() {
  if (!newTodo.value.trim())
    return
  addTodo(newTodo.value)
  newTodo.value = ''
}
</script>

<template>
  <div class="todo-app">
    <h1>Pinia Colada Todos</h1>
    <p class="subtitle">
      Keyed queries with automatic caching
    </p>

    <div class="todo-card">
      <form class="add-form" @submit.prevent="handleAdd">
        <input v-model="newTodo" placeholder="What needs to be done?">
        <button type="submit">
          Add
        </button>
      </form>

      <p v-if="isPending" class="status">
        Loading...
      </p>
      <p v-else-if="error" class="status error">
        Error: {{ error.message }}
      </p>

      <ul v-else class="todo-list">
        <li v-for="todo in todos" :key="todo.id" class="todo-item">
          <input
            type="checkbox"
            :checked="!!todo.completed"
            @change="toggleTodo({ id: todo.id, completed: todo.completed })"
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
