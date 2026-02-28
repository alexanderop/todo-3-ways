<script setup lang="ts">
const store = useTodoStore()

await callOnce(store.fetchTodos)
</script>

<template>
  <TodoPage
    title="Pinia Todos"
    subtitle="Manual state management"
    :todos="store.todos"
    :loading="store.loading"
    :error="store.error"
    @add="store.addTodo"
    @toggle="(id) => store.toggleTodo(id as number, store.todos.find(t => t.id === id)!.completed)"
    @delete="(id) => store.deleteTodo(id as number)"
  />
</template>
