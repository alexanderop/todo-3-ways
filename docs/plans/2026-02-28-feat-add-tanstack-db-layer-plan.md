---
title: "feat: Add TanStack DB layer as 5th state management approach"
type: feat
status: active
date: 2026-02-28
---

# feat: Add TanStack DB Layer

## Overview

Add a fifth state management approach to the project using **TanStack DB** (`@tanstack/vue-db`) — a client-side reactive database built on differential dataflow with TanStack Query as the sync backend. This evolves the project from "Todo 4 Ways" to "Todo 5 Ways".

TanStack DB brings a unique pattern to the comparison: normalized client-side collections with SQL-like live queries, zero-boilerplate optimistic mutations with automatic rollback, and sub-millisecond incremental updates via differential dataflow.

## Problem Statement / Motivation

The current project demonstrates four state management patterns ranging from manual (Pinia) to CRDT-based (Yjs). TanStack DB fills a gap in the comparison — it represents the emerging **"client-side reactive database"** category that normalizes data into typed collections and runs incremental live queries. This approach is gaining traction as an alternative to traditional query/cache patterns, and having it alongside the other approaches creates a more complete picture of the state management landscape.

## Proposed Solution

Create a new Nuxt layer at `layers/tanstack-db/` following the established layer pattern. The layer uses TanStack DB's `QueryCollection` backed by TanStack Query to sync with the shared SQLite REST API (`/api/todos/`), and `useLiveQuery` for reactive data binding.

### Architecture

```
layers/tanstack-db/
├── nuxt.config.ts                    # extends ../shared
├── pages/tanstack-db.vue             # page at /tanstack-db, uses <TodoPage>
├── composables/useTanstackDbTodos.ts # collection definition + todo operations
└── plugins/query-client.client.ts    # QueryClient setup (client-only)
```

**Data flow:**

```
Shared API (/api/todos/)
    ↕  $fetch (via queryCollectionOptions queryFn)
QueryCollection (TanStack Query sync)
    ↕  normalized in-memory store
useLiveQuery() → ComputedRef<Todo[]>
    ↕  mapped to { id, title, completed: 0|1 }
<TodoPage> component
```

### Key Design Decisions

1. **Client-only plugin for QueryClient** — TanStack DB collections are client-side only. The QueryClient is created in a `.client.ts` plugin to avoid SSR issues. This follows the same pattern as the Yjs layer's `.client.ts` plugin.

2. **`$fetch` in queryFn** — Use Nuxt's `$fetch` (not raw `fetch`) for consistency with other layers and automatic base URL handling.

3. **Integer completed mapping** — The shared API returns `completed` as `0`/`1` (SQLite INTEGER). TanStack DB collections will store this as-is (number, not boolean) to match the TodoPage contract.

4. **Composable encapsulation** — All collection setup and mutation helpers live in `useTanstackDbTodos.ts`, keeping the page file clean and matching how Pinia uses `stores/todos.ts`.

5. **Eager sync mode** — The todo dataset is small, so `eager` mode (default) loads all todos upfront. No need for on-demand or progressive sync.

## Technical Considerations

### Client-Only Constraints

TanStack DB's `useLiveQuery` returns `ComputedRef` values that only work on the client. The page will show a loading state during SSR/hydration until the collection syncs. This is acceptable — the same pattern exists in the Yjs layer.

If SSR rendering of the initial todo list is desired later, TanStack Query's `prefetch` + hydration pattern could be added, but this is out of scope for the initial implementation.

### Dependency Chain

```
@tanstack/vue-db (v0.0.107)
  └── @tanstack/db (v0.5.30)
       └── @tanstack/db-ivm (differential dataflow engine)

@tanstack/query-db-collection (v1.0.27)
  └── @tanstack/query-core (^5.0.0)

@tanstack/vue-query (v5.x)
  └── @tanstack/query-core
  └── vue (>=3.3.0) ✓ already satisfied
```

Three new packages to install: `@tanstack/vue-db`, `@tanstack/query-db-collection`, `@tanstack/vue-query`.

### Beta Status Caveat

TanStack DB is in **beta** (v0.5.x core, v0.0.x Vue adapter). APIs may change. This is fine for a demo project — it actually makes the comparison more interesting by showcasing a cutting-edge approach.

### Optimistic Mutation Rollback

TanStack DB automatically rolls back optimistic mutations if the `onUpdate`/`onInsert`/`onDelete` handler throws. The UI updates instantly, and if the API call fails, the change reverts. No manual `onError` handling needed — this is a key differentiator from Pinia Colada's manual `onSettled` invalidation pattern.

### Edge Cases

- **`completed` type** — Store as `number` (0/1) in the collection, not boolean. The `onUpdate` handler sends the toggled value (0→1 or 1→0) to the PATCH endpoint.
- **ID type** — The shared API uses integer auto-increment IDs. The collection's `getKey` returns `number`. Handler functions accept `number | string` per the TodoPage contract and cast to `number`.
- **HMR** — TanStack DB collections are singletons. Wrapping the collection creation in a conditional or using `globalThis` guard (like the Yjs layer) may be needed if HMR causes duplicate creation.
- **Concurrent mutations** — TanStack DB handles this via its transaction system. Each mutation is independent and has its own optimistic state.

## Acceptance Criteria

### Functional Requirements

- [ ] New layer at `layers/tanstack-db/` with `nuxt.config.ts` extending `../shared`
- [ ] Page at `/tanstack-db` renders todos using `<TodoPage>` + `<DemoToolbar>`
- [ ] Add, toggle, and delete todos work with optimistic updates (instant UI, API in background)
- [ ] Failed mutations automatically roll back (no manual error handling)
- [ ] Loading and error states display correctly
- [ ] All data flows through the shared `/api/todos/` REST endpoints (no new endpoints)

### Integration Requirements

- [ ] Root `nuxt.config.ts` — add `'./layers/tanstack-db'` to `extends` array
- [ ] `app/app.vue` — add "TanStack DB" nav link to `/tanstack-db`
- [ ] `app/pages/index.vue` — add approach `{ num: '05', title: 'TanStack DB', ... }`; update title to "Todo, Five Ways" and description
- [ ] `app/components/FeatureMatrix.vue` — add `tanstackDb` column to features and approach arrays
- [ ] `pnpm-workspace.yaml` — add `@tanstack/vue-db`, `@tanstack/query-db-collection`, `@tanstack/vue-query` to `frontend` catalog
- [ ] `package.json` — add dependencies using `catalog:frontend` references
- [ ] `CLAUDE.md` — update structure section, stack list, and description to say "5 Ways"
- [ ] `docs/architecture.md` — add Approach 5 section

### Quality Requirements

- [ ] `pnpm lint:fix` passes
- [ ] `pnpm typecheck` passes
- [ ] Explicit imports only (no auto-import)
- [ ] `completed` handled as integer (0/1), not boolean

## Success Metrics

- All 5 approaches render and function identically (same UI, same data, same CRUD operations)
- TanStack DB layer demonstrates optimistic updates (visually instant mutations)
- Feature matrix accurately reflects TanStack DB capabilities (optimistic updates: yes, caching: yes, offline: no, multi-tab sync: no, conflict resolution: no, real-time: no, auto-generated API: no)

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Beta API changes | Medium | Low | Pin exact versions in catalog; demo project tolerates churn |
| No Nuxt module exists | Certain | Low | Manual setup via client plugin + composable; pattern proven by Yjs layer |
| HMR issues with singleton collection | Medium | Low | Use `globalThis` guard pattern from Yjs layer |
| Type mismatch (boolean vs integer completed) | Low | Medium | Store as number in collection schema; validate in composable |

## Implementation Files

### New Files

#### `layers/tanstack-db/nuxt.config.ts`

```ts
export default defineNuxtConfig({
  extends: ['../shared'],
})
```

No Nuxt modules needed — TanStack DB has no official Nuxt module. The QueryClient and collections are set up in a client plugin and composable.

#### `layers/tanstack-db/plugins/query-client.client.ts`

```ts
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { defineNuxtPlugin } from '#imports'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
    },
  },
})

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
})
```

#### `layers/tanstack-db/composables/useTanstackDbTodos.ts`

```ts
import { computed } from 'vue'
import { createCollection, useLiveQuery } from '@tanstack/vue-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from '../plugins/query-client.client'

interface TodoRow {
  id: number
  title: string
  completed: number
  createdAt: string
  updatedAt: string
}

// Singleton collection (guarded for HMR)
const todoCollection = globalThis.__tanstackDbTodoCollection ??= createCollection(
  queryCollectionOptions({
    id: 'todos',
    queryKey: ['todos'],
    queryFn: async () => {
      const res = await $fetch<TodoRow[]>('/api/todos')
      return res
    },
    queryClient,
    getKey: (item: TodoRow) => item.id,

    onInsert: async ({ transaction }) => {
      const { modified } = transaction.mutations[0]
      await $fetch('/api/todos', {
        method: 'POST',
        body: { title: modified.title },
      })
    },

    onUpdate: async ({ transaction }) => {
      const { original, modified } = transaction.mutations[0]
      await $fetch(`/api/todos/${original.id}`, {
        method: 'PATCH',
        body: { completed: modified.completed },
      })
    },

    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0]
      await $fetch(`/api/todos/${original.id}`, { method: 'DELETE' })
    },
  })
)

export function useTanstackDbTodos() {
  const { data, isLoading, isError, status } = useLiveQuery((q) =>
    q.from({ todos: todoCollection })
     .select(({ todos }) => ({
       id: todos.id,
       title: todos.title,
       completed: todos.completed,
     }))
  )

  const todos = computed(() => data.value ?? [])
  const loading = computed(() => isLoading.value)
  const error = computed(() => isError.value ? String(status.value) : null)

  function addTodo(title: string) {
    todoCollection.insert({
      id: Date.now(), // temporary optimistic ID, server returns real ID
      title,
      completed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  function toggleTodo(id: number | string) {
    const numId = Number(id)
    const todo = data.value?.find(t => t.id === numId)
    if (!todo) return
    todoCollection.update(numId, (draft) => {
      draft.completed = draft.completed === 1 ? 0 : 1
    })
  }

  function deleteTodo(id: number | string) {
    todoCollection.delete(Number(id))
  }

  return { todos, loading, error, addTodo, toggleTodo, deleteTodo }
}
```

#### `layers/tanstack-db/pages/tanstack-db.vue`

```vue
<script setup lang="ts">
import { useOfflineSimulation, useTabSync } from '#imports'
import { useTanstackDbTodos } from '../composables/useTanstackDbTodos'

const { todos, loading, error, addTodo, toggleTodo, deleteTodo } = useTanstackDbTodos()
const { isOffline, toggleOffline } = useOfflineSimulation()
const { tabCount, lastRemoteEvent, broadcastMutation } = useTabSync('tanstack-db')

const capabilities = [
  { label: 'Offline', supported: false },
  { label: 'Multi-tab sync', supported: false },
  { label: 'Conflict-free', supported: false },
  { label: 'Real-time', supported: false },
]

function handleAdd(title: string) {
  addTodo(title)
  broadcastMutation('Todo added in another tab')
}

function handleToggle(id: number | string) {
  toggleTodo(id)
  broadcastMutation('Todo toggled in another tab')
}

function handleDelete(id: number | string) {
  deleteTodo(id)
  broadcastMutation('Todo deleted in another tab')
}
</script>

<template>
  <TodoPage
    title="TanStack DB Todos"
    subtitle="Client-side reactive database with live queries"
    :todos="todos"
    :loading="loading"
    :error="error"
    @add="handleAdd"
    @toggle="handleToggle"
    @delete="handleDelete"
  >
    <template #toolbar>
      <DemoToolbar
        :capabilities="capabilities"
        :is-offline="isOffline"
        :tab-count="tabCount"
        :last-remote-event="lastRemoteEvent"
        @toggle-offline="toggleOffline"
      />
    </template>
  </TodoPage>
</template>
```

### Modified Files

#### `nuxt.config.ts` (root)

Add to `extends` array:
```ts
extends: [
  './layers/pinia',
  './layers/colada',
  './layers/rstore',
  './layers/yjs',
  './layers/tanstack-db',  // ← add
],
```

Update `app.head.meta` description to mention "5 ways".

#### `app/app.vue`

Add nav link:
```html
<NuxtLink to="/tanstack-db" class="nav-link" active-class="nav-link-active">
  TanStack DB
</NuxtLink>
```

Update brand text from "Todo 4 Ways" to "Todo 5 Ways".

#### `app/pages/index.vue`

Add to `approaches` array:
```ts
{ num: '05', title: 'TanStack DB', description: 'Client-side reactive database with live queries', path: '/tanstack-db' },
```

Update heading from "Todo, Four Ways" to "Todo, Five Ways" and description text.

#### `app/components/FeatureMatrix.vue`

Add `tanstackDb` key to each feature object:
```ts
const features = [
  { label: 'Works offline', pinia: false, colada: false, rstore: true, yjs: true, tanstackDb: false },
  { label: 'Multi-tab sync', pinia: false, colada: false, rstore: false, yjs: true, tanstackDb: false },
  { label: 'Conflict resolution', pinia: false, colada: false, rstore: false, yjs: true, yjsNote: 'CRDT', tanstackDb: false },
  { label: 'Real-time updates', pinia: false, colada: false, rstore: false, yjs: true, tanstackDb: false },
  { label: 'Auto-generated API', pinia: false, colada: false, rstore: true, yjs: false, tanstackDb: false },
  { label: 'Caching', pinia: false, colada: true, rstore: true, yjs: true, yjsNote: 'local', tanstackDb: true },
  { label: 'Optimistic updates', pinia: false, colada: false, rstore: true, yjs: true, tanstackDb: true },
]

const approaches = ['Pinia', 'Colada', 'rstore', 'Yjs', 'TanStack DB'] as const
const keys = ['pinia', 'colada', 'rstore', 'yjs', 'tanstackDb'] as const
```

#### `pnpm-workspace.yaml`

Add to `frontend` catalog:
```yaml
  frontend:
    '@tanstack/vue-db': ^0.0.107
    '@tanstack/vue-query': ^5.71.1
    '@tanstack/query-db-collection': ^1.0.27
```

#### `package.json`

Add to `dependencies`:
```json
"@tanstack/vue-db": "catalog:frontend",
"@tanstack/vue-query": "catalog:frontend",
"@tanstack/query-db-collection": "catalog:frontend"
```

#### `CLAUDE.md`

- Update project description to say "5 Ways"
- Add `tanstack-db/` to the structure tree
- Add TanStack DB to the stack list

#### `docs/architecture.md`

Add "Approach 5: TanStack DB" section describing the collection + live query pattern.

## References & Research

### Internal References

- Layer pattern: `layers/pinia/` (simplest composable-based layer)
- Client-only plugin pattern: `layers/yjs/plugins/yjs.client.ts`
- HMR guard pattern: `layers/yjs/composables/useYjsTodos.ts` (globalThis guard)
- Shared component contract: `layers/shared/components/TodoPage.vue`
- API endpoints: `layers/shared/server/api/todos/`

### External References

- [TanStack DB Official Docs](https://tanstack.com/db/latest/docs)
- [TanStack DB Vue Adapter](https://tanstack.com/db/latest/docs/framework/vue/overview)
- [useLiveQuery Vue Reference](https://tanstack.com/db/latest/docs/framework/vue/reference/functions/useLiveQuery)
- [Query Collection Docs](https://tanstack.com/db/latest/docs/collections/query-collection)
- [Mutations Guide](https://tanstack.com/db/latest/docs/guides/mutations)
- [TanStack DB 0.5 Blog Post](https://tanstack.com/blog/tanstack-db-0.5-query-driven-sync)
- [@tanstack/vue-db on npm](https://www.npmjs.com/package/@tanstack/vue-db) (v0.0.107)
- [@tanstack/db on npm](https://www.npmjs.com/package/@tanstack/db) (v0.5.30)
- [GitHub: TanStack/db](https://github.com/TanStack/db)
