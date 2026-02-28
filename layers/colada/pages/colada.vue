<script setup lang="ts">
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
</script>

<template>
  <TodoPage
    title="Pinia Colada Todos"
    subtitle="Keyed queries with automatic caching"
    :todos="todos ?? []"
    :loading="isPending"
    :error="error?.message"
    @add="addTodo"
    @toggle="(id) => toggleTodo({ id: id as number, completed: todos?.find(t => t.id === id)?.completed ?? 0 })"
    @delete="(id) => deleteTodo(id as number)"
  />
</template>
