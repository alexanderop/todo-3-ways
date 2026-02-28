# Build the Same Todo App 3 Ways: Pinia vs Pinia Colada vs rstore

How your data layer shapes everything — a hands-on Nuxt tutorial.

---

We're going to build the same todo app three times in a single Nuxt project. Each time, we'll use a different approach to manage server state:

1. **Pinia** — manual state management (the DIY approach)
2. **Pinia Colada** — keyed queries with automatic caching
3. **rstore + Drizzle** — local-first reactive store with auto-generated API

By the end, you'll have a working Nuxt app with three separate pages — one for each approach — hitting the same database. You'll see exactly how much code each approach needs and what you get for free.

**Prerequisites:** Basic knowledge of Vue 3, Nuxt, and TypeScript.

---

## Project Setup

Let's scaffold a fresh Nuxt project and set up a SQLite database with Drizzle. All three approaches will share the same database and API (except rstore, which generates its own).

```bash
npx nuxi@latest init todo-3-ways
cd todo-3-ways
```

Install our dependencies:

```bash
# Database
npm i drizzle-orm better-sqlite3
npm i -D drizzle-kit @types/better-sqlite3

# State management
npm i @pinia/colada @pinia/colada-nuxt @rstore/nuxt-drizzle
```

> **Note:** We don't install `pinia` or `@pinia/nuxt` separately because our Nuxt starter already includes them. If you're starting from scratch, add `@pinia/nuxt` to your modules.

### Database Schema

Create the Drizzle schema that all three approaches will share:

```ts
// server/database/schema.ts

import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const todos = sqliteTable('todos', {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  completed: integer().notNull().$defaultFn(() => 0),
  createdAt: integer({ mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
```

```ts
// drizzle.config.ts

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: {
    url: './db.sqlite',
  },
})
```

Create and run the migration:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Drizzle Server Utility

Set up the shared Drizzle instance. We export `tables` as an alias for the schema — rstore's server hooks need this to reference table definitions:

```ts
// server/utils/drizzle.ts

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../database/schema'

export const tables = schema
export { todos } from '../database/schema'

const sqlite = new Database('./db.sqlite')

let drizzleInstance: ReturnType<typeof drizzle> | null = null

export function useDrizzle() {
  drizzleInstance ??= drizzle(sqlite, { schema })
  return drizzleInstance
}
```

### Shared API Routes (for Pinia and Pinia Colada)

The first two approaches need API routes. rstore will generate its own, but Pinia and Pinia Colada need something to talk to:

```ts
// server/api/todos/index.get.ts

export default defineEventHandler(async () => {
  const db = useDrizzle()
  return db.select().from(todos).all()
})
```

```ts
// server/api/todos/index.post.ts

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = useDrizzle()
  return db.insert(todos).values({
    title: body.title,
    completed: 0,
  }).returning().get()
})
```

```ts
// server/api/todos/[id].patch.ts

import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const db = useDrizzle()
  return db.update(todos)
    .set({ completed: body.completed })
    .where(eq(todos.id, id))
    .returning()
    .get()
})
```

```ts
// server/api/todos/[id].delete.ts

import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDrizzle()
  await db.delete(todos).where(eq(todos.id, id))
  return { success: true }
})
```

### Nuxt Config

```ts
// nuxt.config.ts

export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@pinia/colada-nuxt', // Must come after @pinia/nuxt
    '@rstore/nuxt-drizzle',
  ],

  rstoreDrizzle: {
    // rstore will auto-generate its own API at /api/rstore
    // and create typed collections from our Drizzle schema
  },
})
```

> **No manual plugin needed for Pinia Colada.** The `@pinia/colada-nuxt` module handles everything: plugin registration, SSR serialization/hydration, and auto-imports for `useQuery`, `useMutation`, `useQueryCache`, and `defineQueryOptions`. You can configure global options (like `staleTime` or `gcTime`) by creating a `colada.options.ts` file at the project root.

Now we have a shared foundation. Let's build the same UI three ways.

---

## Approach 1: Pinia (Manual State Management)

This is the "do everything yourself" approach. You manage loading states, error states, fetching, and cache invalidation manually.

### The Store

In Nuxt 4, stores live inside `app/stores/` and are auto-imported by `@pinia/nuxt` — no manual imports needed.

```ts
// app/stores/todos.ts

export const useTodoStore = defineStore('todos', () => {
  const todos = ref<Array<{ id: number, title: string, completed: number, createdAt: string }>>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTodos() {
    loading.value = true
    error.value = null
    try {
      todos.value = await $fetch('/api/todos')
    }
    catch (e: any) {
      error.value = e.message
    }
    finally {
      loading.value = false
    }
  }

  async function addTodo(title: string) {
    try {
      await $fetch('/api/todos', {
        method: 'POST',
        body: { title },
      })
      // Must manually refetch to update the list
      await fetchTodos()
    }
    catch (e: any) {
      error.value = e.message
    }
  }

  async function toggleTodo(id: number, completed: number) {
    try {
      await $fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        body: { completed: completed ? 0 : 1 },
      })
      // Must manually refetch again
      await fetchTodos()
    }
    catch (e: any) {
      error.value = e.message
    }
  }

  async function deleteTodo(id: number) {
    try {
      await $fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      })
      // ...and again
      await fetchTodos()
    }
    catch (e: any) {
      error.value = e.message
    }
  }

  return { todos, loading, error, fetchTodos, addTodo, toggleTodo, deleteTodo }
})
```

### The Component

```vue
<!-- app/pages/pinia.vue -->

<script setup lang="ts">
const store = useTodoStore()
const newTodo = ref('')

// callOnce ensures the fetch runs once during SSR
// and doesn't re-run on client hydration (no double-fetch)
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
          :checked="todo.completed"
          @change="store.toggleTodo(todo.id, todo.completed)"
        >
        <span :class="{ done: todo.completed }">{{ todo.title }}</span>
        <button class="delete" @click="store.deleteTodo(todo.id)">
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>
```

### What You're Managing Yourself

Let's count the things you had to handle manually:

- ✍️ Three separate refs: `todos`, `loading`, `error`
- ✍️ Try/catch in every single action
- ✍️ Manual `callOnce(store.fetchTodos)` to trigger the initial fetch
- ✍️ Manual refetch after every mutation (add, toggle, delete)
- ✍️ No caching — navigating away and back triggers a new fetch
- ✍️ No deduplication — two components using this store could trigger two fetches
- ✍️ No optimistic updates — the UI waits for the server on every action

This works fine for small apps. But as your app grows, this pattern creates a lot of repetitive, error-prone code across every store.

---

## Approach 2: Pinia Colada (Keyed Queries)

Now let's rip out all that boilerplate and let Pinia Colada handle it. Same API, same UI — but dramatically less code.

### The Component (no store file needed!)

```vue
<!-- app/pages/colada.vue -->

<script setup lang="ts">
// No imports needed — @pinia/colada-nuxt auto-imports everything:
// useQuery, useMutation, useQueryCache, defineQueryOptions

const newTodo = ref('')
const queryCache = useQueryCache()

// Querying: just declare what you need
// isPending = true until the FIRST successful fetch (initial load only)
// isLoading = true whenever a fetch is in-flight (including refetches)
const { data: todos, isPending, error } = useQuery({
  key: ['todos'],
  query: () => $fetch('/api/todos'),
})

// Mutations: declare once, invalidate by key
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
          :checked="todo.completed"
          @change="toggleTodo({ id: todo.id, completed: todo.completed })"
        >
        <span :class="{ done: todo.completed }">{{ todo.title }}</span>
        <button class="delete" @click="deleteTodo(todo.id)">
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>
```

### What Changed

Compared to the Pinia approach:

- ~~Store file~~ → Gone. Everything lives in the component.
- ~~Manual loading/error refs~~ → `isPending` and `error` come free from `useQuery`.
- ~~callOnce fetch~~ → `useQuery` fetches automatically (and handles SSR serialization via the Nuxt module).
- ~~Manual refetch after mutations~~ → `invalidateQueries` handles it.
- ~~Try/catch everywhere~~ → Pinia Colada handles errors internally.

And you get extras for free:

- **Caching** — Navigate away and back? Data loads instantly from cache.
- **Deduplication** — Multiple components using `key: ['todos']`? Only one fetch.
- **Stale-while-revalidate** — Shows cached data while refreshing in the background.

The mental model shifts from "manage state imperatively" to "declare what data you need, invalidate when it changes." It's the same shift React developers experienced going from Redux to TanStack Query.

> **`isPending` vs `isLoading`:** Pinia Colada exposes both. `isPending` is `true` only until the first successful fetch — once data arrives, it stays `false` even during refetches. `isLoading` is `true` whenever any fetch is in-flight, including background refetches. Use `isPending` for initial loading skeletons, `isLoading` for subtle refetch indicators.

### Organizing with defineQueryOptions

As your app grows, you'll want to reuse query definitions. Pinia Colada offers two patterns:

**`defineQueryOptions`** — extract a reusable config object:

```ts
// app/composables/queries/todos.ts

export const todosQueryOptions = defineQueryOptions({
  key: ['todos'],
  query: () => $fetch('/api/todos'),
})

// In any component:
// const { data: todos } = useQuery(todosQueryOptions)
```

**`defineQuery`** — create a reusable composable with encapsulated state (singleton, shared across consumers):

```ts
// app/composables/queries/todos.ts

export const useFilteredTodos = defineQuery(() => {
  const search = ref('')
  const { data, isPending, ...rest } = useQuery({
    key: () => ['todos', { search: search.value }],
    query: () => $fetch(`/api/todos?search=${search.value}`),
  })
  return { data, isPending, search, ...rest }
})

// In any component — search state is shared:
// const { data, search } = useFilteredTodos()
```

---

## Approach 3: rstore + Drizzle (Local-First)

Now for the big shift. With [rstore](https://rstore.dev/) + Drizzle, we don't write API routes, we don't write a store, and we don't write query invalidation logic. We define a Drizzle schema (which we already did), and rstore generates everything.

rstore is "The Reactive Data Store for Vue and Nuxt developers" by [Guillaume Chau](https://github.com/Akryum) (Vue Core Team). It's maintained under the [Directus organization](https://github.com/directus/rstore) and currently at v0.8.x (pre-1.0, actively developed).

Remember our `nuxt.config.ts`? The `@rstore/nuxt-drizzle` module we added does the following automatically:

1. Reads your `drizzle.config.ts` to find your schema
2. Generates typed collections for each table (with relations)
3. Creates a REST API at `/api/rstore` for CRUD operations (`GET`, `POST`, `PATCH`, `DELETE`)
4. Creates a plugin that handles all queries and mutations
5. Generates full TypeScript types for `useStore()` autocomplete

But we need one more file — a server hook to explicitly allow which tables are exposed via the API:

```ts
// server/plugins/rstore-hooks.ts

export default defineNitroPlugin(() => {
  allowTables([
    tables.todos,
  ])
})
```

That means our server-side setup is done. Let's build the component.

### The Component

rstore offers three patterns for mutations: collection-level methods (`store.todos.create()`), item-level methods (`todo.$update()`), and form objects (`store.todos.createForm()`). We'll use a mix:

```vue
<!-- app/pages/rstore.vue -->

<script setup lang="ts">
const store = useStore()
const newTodo = ref('')

// Query: reads from the local normalized cache
// Automatically fetches from server and keeps in sync
const { data: todos, loading } = await store.todos.query(q => q.many())

async function handleAdd() {
  if (!newTodo.value.trim())
    return
  // Collection-level create: writes to local cache AND syncs with server
  await store.todos.create({
    title: newTodo.value,
    completed: 0,
    createdAt: new Date(),
  })
  newTodo.value = ''
}

async function toggleTodo(todo: any) {
  // Item-level $update: called directly on a fetched item
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
          :checked="todo.completed"
          @change="toggleTodo(todo)"
        >
        <span :class="{ done: todo.completed }">{{ todo.title }}</span>
        <button class="delete" @click="deleteTodo(todo.id)">
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>
```

### What's Different Here

Read that component again. Notice what's _missing_:

- **No API route files** — rstore generated them from your Drizzle schema
- **No query keys** — you query collections directly with `store.todos.query()`
- **No invalidation logic** — the normalized cache updates automatically
- **No separate mutation/query pattern** — just `create`, `$update`, `delete`
- **No manual refetch** — mutations update the local cache instantly, then sync with the server

The mutations are **optimistic by default**. When you call `store.todos.create()`, the todo appears in the UI immediately. The server request happens in the background. If it fails, the cache rolls back.

> **Item methods vs collection methods:** When you query an item with `store.todos.query(q => q.first(id))`, the returned item has `$update()` and `$delete()` methods attached. You can also use collection-level `store.todos.update(data, { key })` and `store.todos.delete(key)` — the choice is stylistic.

### Enabling Real-Time Updates

Want changes from other users/tabs to appear automatically? Add one line to your Nuxt config:

```ts
// nuxt.config.ts

export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    '@rstore/nuxt-drizzle',
  ],
  rstoreDrizzle: {
    ws: true, // Enable WebSocket-based realtime
  },
})
```

Then swap `query` for `liveQuery` in your component:

```vue
<script setup lang="ts">
const store = useStore()

// Now this automatically updates when ANY client changes the data
const { data: todos, loading } = await store.todos.liveQuery(q => q.many())
</script>
```

That's it. Real-time across all connected clients. No WebSocket setup, no pub/sub configuration, no event handlers.

### Form Objects (Bonus)

rstore also provides `createForm()` and `updateForm()` for reactive form state with built-in validation (compatible with Standard Schema / Zod):

```vue
<script setup lang="ts">
const store = useStore()

const createTodo = store.todos.createForm({
  defaultValues: () => ({
    id: crypto.randomUUID(), // rstore benefits from client-generated keys
  }),
})

// Form fields are reactive — just v-model them
// createTodo.title, createTodo.completed, etc.
// createTodo.$submit(), createTodo.$reset(), createTodo.$loading, createTodo.$error
</script>

<template>
  <form @submit.prevent="createTodo.$submit()">
    <input v-model="createTodo.title" placeholder="What needs to be done?">
    <button type="submit" :disabled="createTodo.$loading">
      Add
    </button>
  </form>
</template>
```

### Server Hooks

rstore exposes lifecycle hooks for all CRUD operations via Nitro plugins. You can use them for auth, validation, or logging:

```ts
// server/plugins/rstore-hooks.ts

export default defineNitroPlugin(() => {
  // Hook into all collections
  rstoreDrizzleHooks.hook('index.post.before', async (payload) => {
    // payload.event — H3 event (for auth checks)
    // payload.collection, payload.body
    // Throw an error to abort the operation
  })

  // Hook into a specific table
  hooksForTable(tables.todos, {
    'item.patch.before': async (payload) => {
      console.log('Updating todo:', payload.params)
    },
  })

  // Required: explicitly allow which tables are exposed
  allowTables([tables.todos])
})
```

### Enabling Offline Support

One more line:

```ts
// nuxt.config.ts

rstoreDrizzle: {
  ws: true,
  offline: true, // Enable offline-first mode
},
```

Now your app works without an internet connection. Mutations are queued locally and synced when connectivity returns.

---

## The Full Picture

Let's look at what each approach required for the same todo app:

### Files Written

|                         | **Pinia**    | **Pinia Colada** | **rstore + Drizzle** |
| ----------------------- | ------------ | ---------------- | -------------------- |
| API routes              | 4 files      | 4 files          | 0 (auto-generated)   |
| Store/query definitions | 1 store file | 0 (inline)       | 0 (auto-generated)   |
| Server hooks            | 0            | 0                | 1 (`allowTables`)    |
| Component               | 1 file       | 1 file           | 1 file               |
| **Total**               | **6 files**  | **5 files**      | **2 files**          |

### Lines of Code (approx)

|                        | **Pinia** | **Pinia Colada** | **rstore** |
| ---------------------- | --------- | ---------------- | ---------- |
| State management logic | ~55 lines | ~30 lines        | ~8 lines   |
| Component template     | ~25 lines | ~25 lines        | ~25 lines  |

### Features Comparison

| Feature                   | **Pinia**         | **Pinia Colada**         | **rstore**         |
| ------------------------- | ----------------- | ------------------------ | ------------------ |
| Auto loading/error states | ❌ Manual         | ✅                       | ✅                 |
| Caching                   | ❌ Manual         | ✅ Key-based             | ✅ Normalized      |
| Request deduplication     | ❌                | ✅                       | ✅                 |
| Optimistic updates        | ❌ Manual (hard)  | ⚠️ Possible (some work)  | ✅ Built-in        |
| Cache invalidation        | ❌ Manual refetch | ✅ `invalidateQueries()` | ✅ Automatic       |
| Real-time                 | ❌ DIY WebSockets | ❌ DIY                   | ✅ One config flag |
| Offline support           | ❌                | ❌                       | ✅ One config flag |
| Auto-generated API        | ❌                | ❌                       | ✅                 |
| Works without server      | ❌                | ❌                       | ✅ (offline mode)  |

---

## Adding Navigation

To see all three approaches side by side, create a simple layout:

```vue
<!-- app/app.vue -->

<template>
  <nav>
    <NuxtLink to="/pinia">
      Pinia
    </NuxtLink>
    <NuxtLink to="/colada">
      Pinia Colada
    </NuxtLink>
    <NuxtLink to="/rstore">
      rstore
    </NuxtLink>
  </nav>
  <NuxtPage />
</template>

<style>
nav {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

nav a {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  color: #333;
}

nav a.router-link-active {
  background: #10b981;
  color: white;
}
</style>
```

Navigate between the three pages. Add a todo in one, switch to another — you'll start to _feel_ the differences. The Pinia page refetches every time you navigate back. The Pinia Colada page shows cached data instantly. The rstore page just... works.

---

## When to Use What

**Use Pinia alone** when your app is mostly client-side state — form data, UI toggles, user preferences. If you have a handful of API calls and don't mind a bit of boilerplate, Pinia is simple and proven.

**Add Pinia Colada** when you're fetching data from APIs across many components and you're tired of writing loading/error/refetch logic. It's incremental — you can adopt it one query at a time alongside existing Pinia stores. If you're coming from React and loved TanStack Query, this is your tool.

**Go with rstore + Drizzle** when you want the full package: auto-generated API, normalized caching, real-time, offline support. It's especially powerful with Nuxt and Drizzle because it eliminates the entire API layer. The tradeoff is that it's more opinionated — you're buying into its architecture, and it's pre-1.0 (currently v0.8.x) so expect some API churn. But for data-heavy apps, the reduction in code and complexity is massive.

You don't have to choose just one. Pinia handles client state. Pinia Colada or rstore handles server state. They coexist perfectly in the same Nuxt app.

---

**The full source code for this tutorial is available on [GitHub](#).**

Got questions or spotted an issue? Find me on [Twitter](#) or open an issue on the repo.
