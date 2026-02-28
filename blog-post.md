# Todo, Four Ways: A Vue Developer's Journey from Pinia to CRDTs

You know how to build a todo app. You've done it with Pinia, maybe with Vuex before that. You `$fetch` from an API, store the result in a ref, and re-fetch after every mutation. It works. Ship it.

But what happens when your user goes into a tunnel? When two people edit the same list? When the spinner between "I clicked add" and "I see my todo" starts to feel slow?

This post walks through **four implementations of the same todo app** in Nuxt, each using a different state management strategy. Same backend, same UI, same features — different philosophies about where data lives and who owns the truth.

We'll go from what you already know (Pinia) to what you probably don't (CRDTs), building intuition for **local-first** and **offline-first** patterns along the way.

The full source is a Nuxt 4 monorepo using [layers](https://nuxt.com/docs/getting-started/layers) — each approach is a self-contained layer sharing one SQLite backend. You can run all four simultaneously.

---

## The Shared Foundation

Before we get to the interesting part, let's establish the constant: every approach talks to the same backend.

**Schema** — a single `todos` table via Drizzle ORM:

```ts
// layers/shared/server/database/schema.ts
export const todos = sqliteTable('todos', {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  completed: integer().notNull().$defaultFn(() => 0),
  createdAt: integer({ mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
```

**API** — four endpoints, nothing surprising:

```ts
// GET /api/todos — return all
export default defineEventHandler(async () => {
  const db = useDrizzle()
  return db.select().from(todos).all()
})

// POST /api/todos — create one
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = useDrizzle()
  return db.insert(todos).values({
    title: body.title,
    completed: 0,
  }).returning().get()
})
```

PATCH and DELETE follow the same pattern. The backend is deliberately boring — it's a CRUD API over SQLite. What changes is *how the client consumes it*.

Each Nuxt layer extends the shared layer, so all four approaches inherit these endpoints without duplicating them:

```ts
// nuxt.config.ts (root)
export default defineNuxtConfig({
  extends: [
    './layers/pinia',
    './layers/colada',
    './layers/rstore',
    './layers/yjs',
  ],
})
```

---

## Approach 1: Pinia — The Baseline

If you've used Vue in the last few years, this is home. A setup store with refs, async functions, and manual fetching.

```ts
// layers/pinia/stores/todos.ts
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
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    }
    finally {
      loading.value = false
    }
  }

  async function addTodo(title: string) {
    try {
      await $fetch('/api/todos', { method: 'POST', body: { title } })
      await fetchTodos() // <-- refetch the whole list
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    }
  }

  async function toggleTodo(id: number, completed: number) {
    try {
      await $fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        body: { completed: completed ? 0 : 1 },
      })
      await fetchTodos() // <-- refetch again
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    }
  }

  // deleteTodo follows the same pattern...

  return { todos, loading, error, fetchTodos, addTodo, toggleTodo, deleteTodo }
})
```

The page is minimal:

```vue
<script setup lang="ts">
const store = useTodoStore()
await callOnce(store.fetchTodos)
</script>

<template>
  <TodoPage
    :todos="store.todos"
    :loading="store.loading"
    :error="store.error"
    @add="store.addTodo"
    @toggle="(id) => store.toggleTodo(id, store.todos.find(t => t.id === id)!.completed)"
    @delete="(id) => store.deleteTodo(id)"
  />
</template>
```

### What's happening here

Every mutation follows the same cycle:

```
User action → POST/PATCH/DELETE → wait → GET /api/todos → update ref → UI updates
```

The server is the **single source of truth**. The client is a dumb terminal — it shows whatever the server last told it. After every mutation, we throw away local state and re-fetch everything.

### The trade-off

This is the simplest mental model. You always know where your data comes from (the server). You never have stale data after a mutation (you just re-fetched). But:

- **Every mutation costs two round trips** — the mutation itself, plus the refetch.
- **The UI blocks** between action and confirmation. Click "add" and wait for the spinner.
- **Offline = broken.** No network, no app.
- **Error handling is manual** and repetitive — the same try/catch in every function.

For a personal todo app, this is fine. For anything with latency sensitivity, multiple users, or spotty connectivity, we need to start thinking differently.

---

## Approach 2: Pinia Colada — Declarative Queries

[Pinia Colada](https://pinia-colada.esm.dev/) brings the query/mutation pattern (popularized by React Query / TanStack Query) to Vue. Instead of imperative fetch-then-store, you declare *what data you want* and *how to invalidate it*.

```vue
<script setup lang="ts">
const queryCache = useQueryCache()

// Declare the data you want
const { data: todos, isPending, error } = useQuery({
  key: ['todos'],
  query: () => $fetch('/api/todos'),
})

// Declare mutations with automatic cache invalidation
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
```

### What changed

No store file. No `ref()` management. No manual `loading`/`error` tracking. The framework handles all of that.

The key insight is **cache invalidation by key**. When a mutation settles (succeeds *or* fails — note `onSettled`, not `onSuccess`), we invalidate the `['todos']` query key. Pinia Colada knows that this key maps to our `useQuery` call, so it automatically re-fetches.

This is the same refetch-after-mutate pattern as Pinia, but:

- **Deduplication** — if two components use `useQuery({ key: ['todos'] })`, only one network request fires.
- **Background refetching** — stale data shows immediately while fresh data loads.
- **Automatic retries** — built into the query lifecycle.
- **Co-located logic** — queries and mutations live next to the component that uses them, not in a separate store file.

### The mental model shift

Pinia says: "Here's a store. You manage the state."

Pinia Colada says: "Tell me what data you need and I'll keep it fresh."

It's a move from **imperative** state management to **declarative** data fetching. You stop thinking about *when* to fetch and start thinking about *what* to cache.

### Still not offline

Despite being more sophisticated, Colada shares the same fundamental limitation as Pinia: **the server is still the source of truth**. Kill the network and the app is useless. The UI still waits for the server to confirm mutations before showing updates.

To fix that, we need to flip the architecture.

---

## Approach 3: rstore — The Data Layer Does the Work

[rstore](https://github.com/Akryum/rstore) with its Nuxt Drizzle integration takes a different approach: instead of writing fetch calls by hand, you point it at your Drizzle schema and it **auto-generates the entire API layer**.

```vue
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
    :todos="todos ?? []"
    :loading="loading"
    @add="(title) => store.todos.create({ title, completed: 0, createdAt: new Date() })"
    @toggle="handleToggle"
    @delete="(id) => store.todos.delete(id)"
  />
</template>
```

That's the entire page. No API endpoints to write. No store file. No `$fetch`. The `store.todos` object is auto-generated from your Drizzle schema.

### How it works

The setup lives in config and a small server plugin:

```ts
// layers/rstore/nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@rstore/nuxt-drizzle'],
  rstoreDrizzle: {
    drizzleImport: {
      name: 'useDrizzle',
      from: '~~/layers/shared/server/utils/drizzle',
    },
  },
})
```

```ts
// layers/rstore/server/plugins/rstore-hooks.ts
export default defineNitroPlugin(() => {
  allowTables([tables.todos])
})
```

That `allowTables` call is critical — it whitelists which database tables the auto-generated API can expose. Skip it and you get silent 404s with no error message. (Ask me how I know.)

### The active record pattern

Notice `todo.$update({ completed: ... })`. Each object returned by rstore is a **live record** with methods attached. You don't need to know the API endpoint — you call methods directly on the data.

```ts
// Instead of:
await $fetch(`/api/todos/${id}`, { method: 'PATCH', body: { completed: 0 } })

// You write:
await todo.$update({ completed: 0 })
```

### Why this matters for local-first

rstore keeps a local copy of your data. Queries hit the local store first, then sync with the server in the background. This means:

- **Reads are instant** — no loading spinners for data you've already seen.
- **Mutations can be optimistic** — update the local store immediately, sync later.
- The data layer handles the synchronization protocol so you don't have to.

### The trade-off

You gain a lot of developer experience (less code, automatic API, active records) but lose visibility. The auto-generated API is opaque — debugging sync issues means understanding rstore's internals, not just reading your own fetch calls.

For applications where the schema *is* the API (CRUD-heavy apps, admin panels, internal tools), this is a huge win. For complex business logic that doesn't map cleanly to table operations, you might fight the abstraction.

---

## Approach 4: Yjs — The Document is the Truth

Here's where things get fundamentally different.

Pinia, Colada, and rstore all share an assumption: **the server owns the data**. The client might cache it, might optimistically update it, but ultimately the server's database is the source of truth. Mutations are requests — "please change this" — and the client waits for permission.

[Yjs](https://yjs.dev/) throws that out. The **document is the truth**. Every client has a full copy. Changes are applied locally and instantly. Sync happens in the background, and when two clients make conflicting changes, the conflict is resolved automatically using CRDTs.

### What's a CRDT?

CRDT stands for **Conflict-free Replicated Data Type**. It's a data structure designed so that:

1. Every client can make changes independently (no coordination needed).
2. When clients sync their changes, they always converge to the same state.
3. No conflicts. Ever. The math guarantees it.

Think of it like Google Docs — you type, your collaborator types, and it just works. No "save conflict" dialogs.

### The implementation

First, a client-only plugin initializes the Yjs document with two sync providers:

```ts
// layers/yjs/plugins/yjs.client.ts
export default defineNuxtPlugin(() => {
  const doc = new Y.Doc()
  const idb = new IndexeddbPersistence('todo-yjs', doc)          // offline storage
  const ws = new WebsocketProvider('ws://localhost:1234', 'todo-yjs', doc) // real-time sync

  return {
    provide: { yDoc: doc, yIdb: idb, yWs: ws },
  }
})
```

Two things to note:
- **IndexedDB persistence** — the document survives page reloads and works completely offline.
- **WebSocket provider** — when online, changes stream to all connected clients in real-time.

Then, a composable bridges Yjs's data types into Vue reactivity:

```ts
// layers/yjs/composables/useY.ts
export function useY<YType extends Y.AbstractType<unknown>>(
  yData: YType,
): Readonly<ShallowRef<YTypeToJson<YType>>> {
  const data = shallowRef(yData.toJSON())

  const observer = () => {
    const next = yData.toJSON()
    if (!equalityDeep(data.value, next)) {
      data.value = next
    }
  }

  yData.observeDeep(observer)

  if (getCurrentScope()) {
    onScopeDispose(() => yData.unobserveDeep(observer))
  }

  return data
}
```

This is the glue. Yjs has its own observation system (`observeDeep`), and this composable translates Yjs updates into Vue's `shallowRef` reactivity. The deep equality check (`equalityDeep` from lib0) prevents unnecessary re-renders when the serialized data hasn't actually changed.

Finally, the todo-specific composable:

```ts
// layers/yjs/composables/useYjsTodos.ts
export function useYjsTodos() {
  const { $yDoc: doc, $yWs: ws, $yIdb: idb } = useNuxtApp()

  const todosMap = doc.getMap<Y.Map<unknown>>('todos')
  const rawTodos = useY(todosMap as Y.AbstractType<unknown>)

  const todos = computed<Todo[]>(() => {
    return Object.entries(rawTodos.value)
      .map(([id, fields]) => ({
        id,
        title: String(fields.title ?? ''),
        completed: Number(fields.completed ?? 0),
        createdAt: Number(fields.createdAt ?? 0),
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
  })

  function addTodo(title: string) {
    const id = crypto.randomUUID()
    const yMap = new Y.Map<unknown>()
    doc.transact(() => {
      yMap.set('title', title)
      yMap.set('completed', 0)
      yMap.set('createdAt', Date.now())
      todosMap.set(id, yMap)
    })
  }

  function toggleTodo(id: string) {
    const yMap = todosMap.get(id)
    if (!yMap) return
    const current = Number(yMap.get('completed') ?? 0)
    yMap.set('completed', current ? 0 : 1)
  }

  function deleteTodo(id: string) {
    todosMap.delete(id)
  }

  // ...status tracking for online/synced indicators

  return { todos, isSynced, isOnline, addTodo, toggleTodo, deleteTodo }
}
```

### What's different here — really different

Look at `addTodo`. There's no `$fetch`. No `await`. No try/catch. You create a Yjs Map, set its values inside a transaction, and... you're done. The todo appears instantly in the UI. The sync happens automatically in the background.

```ts
// Pinia: "Server, please add this todo. I'll wait."
await $fetch('/api/todos', { method: 'POST', body: { title } })
await fetchTodos()

// Yjs: "I'm adding this todo. Sync whenever."
doc.transact(() => {
  yMap.set('title', title)
  todosMap.set(id, yMap)
})
```

This is the core of the **local-first** philosophy: the user's device is the primary computer. The server is a peer, not an authority.

### The data model is different too

In the first three approaches, IDs are auto-increment integers from SQLite. In Yjs, IDs are `crypto.randomUUID()` strings. This isn't a style preference — it's a requirement. When two offline clients both add a todo, they can't both claim `id: 7`. UUIDs make ID collisions statistically impossible without coordination.

The data lives in nested `Y.Map` structures, not rows in a table:

```
Y.Doc
  └── "todos" (Y.Map)
       ├── "a1b2c3..." (Y.Map) → { title: "Buy milk", completed: 0, createdAt: 1709... }
       └── "d4e5f6..." (Y.Map) → { title: "Write blog", completed: 1, createdAt: 1709... }
```

### The server becomes optional

The Yjs layer includes a callback endpoint that syncs CRDT updates into SQLite:

```ts
// layers/yjs/server/api/yjs-callback.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody<{ update: number[] }>(event)

  const doc = new Y.Doc()
  Y.applyUpdate(doc, new Uint8Array(body.update))

  const todosMap = doc.getMap<Y.Map<unknown>>('todos')
  const db = useDrizzle()

  db.transaction((tx) => {
    todosMap.forEach((yMap) => {
      const title = String(yMap.get('title') ?? '')
      const completed = Number(yMap.get('completed') ?? 0)
      const createdAt = Number(yMap.get('createdAt') ?? 0)

      const existing = tx.select().from(todos).where(eq(todos.title, title)).get()
      if (existing) {
        tx.update(todos).set({ completed }).where(eq(todos.id, existing.id)).run()
        return
      }

      tx.insert(todos).values({ title, completed, createdAt: new Date(createdAt) }).run()
    })
  })

  doc.destroy()
  return { ok: true }
})
```

But this is a **secondary persistence layer** — a backup. The Yjs document in IndexedDB is the real source of truth. If the server goes down, the app keeps working. When it comes back, everything syncs.

### The page is the simplest of all four

```vue
<script setup lang="ts">
const { todos, isOnline, isSynced, addTodo, toggleTodo, deleteTodo } = useYjsTodos()
</script>

<template>
  <TodoPage
    :todos="todos"
    @add="addTodo"
    @toggle="(id) => toggleTodo(id as string)"
    @delete="(id) => deleteTodo(id as string)"
  >
    <template #subtitle-extra>
      <span
        class="sync-dot"
        :class="{ online: isOnline, synced: isSynced && !isOnline }"
        :title="isOnline ? 'Connected' : isSynced ? 'Offline (synced)' : 'Loading...'"
      />
    </template>
  </TodoPage>
</template>
```

No `loading` prop. No `error` prop. Because there's nothing to wait for — the data is always local.

### The trade-off

CRDTs give you superpowers, but they aren't free:

- **No SSR.** Yjs needs browser APIs (IndexedDB, WebSocket). The plugin uses `.client.ts` — the page renders empty on the server.
- **Requires a WebSocket server** for real-time sync between clients (in this demo, hardcoded to `ws://localhost:1234`).
- **The data model is different.** You work with `Y.Map` and `Y.Array`, not plain objects. The `useY` composable bridges this, but you're always one layer of abstraction from your data.
- **Conflict resolution is automatic but opaque.** CRDTs guarantee convergence, but "last write wins" on a per-field basis might not always match your business logic.
- **Binary protocol.** Yjs updates are `Uint8Array`, not JSON. Debugging network traffic requires Yjs-specific tooling.

---

## The Spectrum

These four approaches aren't "good vs bad" — they sit on a spectrum:

```
Server-first ◄──────────────────────────────────► Local-first

  Pinia          Colada          rstore            Yjs
  │                │                │                │
  Manual fetch     Query cache      Local store      CRDT document
  Server = truth   Server = truth   Server ≈ truth   Client = truth
  Offline = broken Offline = broken Offline = works   Offline = native
  No sync          Cache keys       Auto sync        P2P sync
  2 round trips    Smart refetch    Optimistic       Instant
```

### When to use what

**Pinia** when your app is simple, always-online, and you want maximum control. Server-rendered pages with occasional interactivity. Admin dashboards. Internal tools where every user has reliable internet.

**Pinia Colada** when you're building a REST-heavy SPA and want better DX around caching, deduplication, and background refetching. It's the sweet spot for most production Vue apps — the query/mutation pattern is battle-tested by the React ecosystem.

**rstore** when your schema *is* your API and you want the framework to handle the plumbing. Great for CRUD-heavy apps where you'd otherwise write dozens of `$fetch` calls that all look the same. The local-first capabilities are a bonus.

**Yjs** when you need real-time collaboration, offline-first behavior, or conflict-free multi-device sync. Think: collaborative editors, shared whiteboards, multiplayer features, field apps used in areas with spotty connectivity.

---

## Key Takeaways for Vue Developers

### 1. "Where does the truth live?" is the most important question

The biggest difference between these approaches isn't syntax — it's philosophy. Server-first apps treat the client as a view layer. Local-first apps treat the client as a peer. This single decision shapes everything: your data model, your sync strategy, your error handling, your offline story.

### 2. You probably don't need to go full CRDT

Most apps are fine with server-first + good caching (Pinia Colada). The local-first and CRDT patterns shine in specific scenarios — don't adopt them because they're interesting (though they are). Adopt them because your users need to work offline, collaborate in real-time, or experience zero-latency interactions.

### 3. The Vue ecosystem is ready

All four approaches work in Nuxt today. Pinia and Colada are production-grade. rstore is maturing fast. Yjs has been battle-tested in apps like [Hocuspocus](https://hocuspocus.dev/) and [Tiptap](https://tiptap.dev/). You don't need to leave the Vue world to build local-first apps.

### 4. Local-first changes your data model

Moving from server-first to local-first isn't just swapping a library. IDs become UUIDs instead of auto-increment integers. Timestamps become client-generated. Your "database" might be IndexedDB, not PostgreSQL. The server becomes a sync node, not the authority. Plan for these architectural shifts early.

### 5. Start with the simplest thing that works

```
Pinia → "I need caching" → Pinia Colada → "I need offline" → rstore → "I need P2P sync" → Yjs
```

Each step adds complexity. Only move right when you have a real reason to.

---

## Try It Yourself

The full source is at **[todo-4-ways on GitHub](https://github.com/alexanderopalic/todo-3-ways)**. Clone it, run `pnpm dev`, and click through all four approaches. Toggle your network off and on. Open two browser tabs. Watch how each approach handles it differently.

```bash
git clone https://github.com/alexanderopalic/todo-3-ways
cd todo-3-ways
pnpm install
pnpm dev
```

The best way to understand these patterns is to feel them break.
