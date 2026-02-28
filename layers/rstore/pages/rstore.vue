<script setup lang="ts">
const store = useStore()

const { data: todos, loading } = await store.todos.query(q => q.many())

async function handleToggle(id: number | string) {
  const todo = todos.value?.find(t => t.id === id)
  if (todo)
    await todo.$update({ completed: todo.completed ? 0 : 1 })
}
</script>

<template>
  <TodoPage
    title="rstore Todos"
    subtitle="Local-first with Drizzle auto-generated API"
    :todos="todos ?? []"
    :loading="loading"
    @add="(title) => store.todos.create({ title, completed: 0, createdAt: new Date() })"
    @toggle="handleToggle"
    @delete="(id) => store.todos.delete(id as number)"
  />
</template>
