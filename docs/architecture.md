# Architecture

## Layer-Based Structure

The app uses Nuxt layers to implement the same todo app six different ways,
all sharing one backend. Each layer extends `../shared` in its own `nuxt.config.ts`.

The root `nuxt.config.ts` extends all six layers:

```ts
extends: ['./layers/pinia', './layers/colada', './layers/rstore', './layers/yjs', './layers/tanstack-db', './layers/livestore']
```

Each layer registers a route at its name (`/pinia`, `/colada`, `/rstore`, `/yjs`, `/tanstack-db`, `/livestore`).

## Shared Layer (`layers/shared/`)

Provides the server-side foundation consumed by all approaches:

- **Schema:** `server/database/schema.ts` — single `todos` table (id, title, completed, createdAt)
- **DB Utility:** `server/utils/drizzle.ts` — exports `useDrizzle()` (singleton Drizzle instance) and `todos` table reference. Auto-imported in server context.
- **API Endpoints:** `server/api/todos/`
  - `GET /api/todos` — returns all todos
  - `POST /api/todos` — creates a todo (`{ title }`)
  - `PATCH /api/todos/:id` — updates a todo (`{ completed }`)
  - `DELETE /api/todos/:id` — deletes a todo

All endpoints use `useDrizzle()` and the `todos` export directly (auto-imported).
Mutations return the affected row via `.returning().get()`.

## Database Schema

```
todos
├── id         INTEGER  PRIMARY KEY AUTOINCREMENT
├── title      TEXT     NOT NULL
├── completed  INTEGER  NOT NULL  DEFAULT 0   (0 = false, 1 = true)
└── createdAt  INTEGER  NOT NULL  (unix timestamp, mapped to Date via Drizzle)
```

DB file: `./db.sqlite` at project root, created on first run, gitignored.
Drizzle config (`drizzle.config.ts`) points to `layers/shared/server/database/schema.ts`.

## Approach 1: Pinia (`layers/pinia/`)

**Pattern:** Classic setup store with manual `$fetch` calls and refetch-after-mutate.

- **Store:** `stores/todos.ts` — `useTodoStore()` with `fetchTodos`, `addTodo`, `toggleTodo`, `deleteTodo`
- **Page:** `pages/pinia.vue` — uses `callOnce(store.fetchTodos)` for SSR-safe initial load
- **Module:** `@pinia/nuxt` with `storesDirs: ['stores']`

Every mutation calls `fetchTodos()` after completion to refresh the list.

## Approach 2: Pinia Colada (`layers/colada/`)

**Pattern:** Query/mutation with cache invalidation. No separate store file.

- **Page:** `pages/colada.vue` — all logic co-located in `<script setup>`
- **Modules:** `@pinia/nuxt` + `@pinia/colada-nuxt`

```ts
useQuery({ key: ['todos'], query: () => $fetch('/api/todos') })
useMutation({ mutation: ..., onSettled() { queryCache.invalidateQueries({ key: ['todos'] }) } })
```

All mutations invalidate the `['todos']` query key via `onSettled` (not `onSuccess`).

## Approach 3: rstore (`layers/rstore/`)

**Pattern:** Local-first reactive store backed by Drizzle via `@rstore/nuxt-drizzle`.

- **Config:** `nuxt.config.ts` points `rstoreDrizzle.drizzleImport` to the shared `useDrizzle`
- **Server Plugin:** `server/plugins/rstore-hooks.ts` — calls `allowTables([tables.todos])` to whitelist the table
- **Page:** `pages/rstore.vue` — uses `useStore()` with active-record pattern

```ts
const { data: todos, loading } = await store.todos.query(q => q.many())
await store.todos.create({ title, completed: 0, createdAt: new Date() })
await todo.$update({ completed: todo.completed ? 0 : 1 })  // active record
await store.todos.delete(id)
```

## Approach 4: Yjs (`layers/yjs/`)

**Pattern:** CRDT-based offline-first sync with Y.Doc, WebSocket provider, and IndexedDB persistence.

- **Client Plugin:** `plugins/yjs.client.ts` — initializes `Y.Doc`, `IndexeddbPersistence`, `WebsocketProvider`. Provides `$yDoc`, `$yIdb`, `$yWs`. Includes HMR guard via `globalThis` to prevent duplicate instances during dev hot reload.
- **Server Route:** `server/routes/_yjs/[room].ts` — Nitro WebSocket handler using `y-crossws`. The `[room]` dynamic segment isolates Y.Doc instances by room name. Starts automatically with the dev server.
- **Composable:** `composables/useY.ts` — generic bridge from Yjs types to Vue `shallowRef` reactivity via `observeDeep` with deep equality check
- **Composable:** `composables/useYjsTodos.ts` — todo-specific API. Data stored as `Y.Map<Y.Map<unknown>>`. IDs are `crypto.randomUUID()` strings. Mutations wrapped in `doc.transact()`.
- **Page:** `pages/yjs.vue` — shows online/synced status indicators

Yjs is the source of truth — IndexedDB provides offline persistence, and WebSocket sync (via `y-crossws`) enables real-time collaboration across tabs/clients.
IDs are string UUIDs (not auto-increment integers like the other approaches).

## Approach 5: TanStack DB (`layers/tanstack-db/`)

**Pattern:** Client-side reactive database with normalized collections, SQL-like live queries, and optimistic mutations via TanStack Query sync.

- **Client Plugin:** `plugins/query-client.client.ts` — creates a `QueryClient` instance and registers `VueQueryPlugin`. Client-only (`.client.ts` suffix) because TanStack DB collections are browser-only.
- **Composable:** `composables/useTanstackDbTodos.ts` — defines a `QueryCollection` backed by TanStack Query (`queryCollectionOptions`). Uses `useLiveQuery` for reactive data binding. Mutations (`insert`, `update`, `delete`) are optimistic with automatic rollback on failure. Collection is a singleton guarded by `globalThis` for HMR safety.
- **Page:** `pages/tanstack-db.vue` — uses `<TodoPage>` + `<DemoToolbar>`

```ts
const todoCollection = createCollection(queryCollectionOptions({
  queryKey: ['todos'],
  queryFn: () => $fetch('/api/todos'),
  queryClient,
  getKey: (item) => item.id,
  onInsert/onUpdate/onDelete: async ({ transaction }) => { /* $fetch to API */ },
}))

const { data: todos } = useLiveQuery((q) =>
  q.from({ todos: todoCollection }).select(...)
)
```

Data flows through the shared `/api/todos/` REST endpoints. No new server routes.

## Approach 6: LiveStore (`layers/livestore/`)

**Pattern:** Event-sourced local-first reactive database with SQLite WASM, OPFS persistence, and Web Worker execution.

- **Schema:** `livestore/schema.ts` — defines events (source of truth), SQLite tables (derived state), and materializers (event → SQL mutations)
- **Worker:** `livestore/livestore.worker.ts` — Web Worker entry point running WASM SQLite
- **Client Plugin:** `plugins/livestore.client.ts` — creates the `makePersistedAdapter` singleton with OPFS storage, dedicated Worker, and SharedWorker for multi-tab sync. Uses `globalThis.__livestoreAdapter` for HMR safety.
- **Composable:** `composables/useLivestoreTodos.ts` — uses `queryDb` for reactive queries and `store.commit(events.*)` for mutations. Maps `boolean` completed → `0|1` integer for shared component compatibility.
- **Page:** `pages/livestore.vue` — wraps content with `LiveStoreProvider` from `vue-livestore`, which manages store initialization and provides Vue context injection
- **Inner Component:** `components/LivestoreTodoContent.vue` — renders inside the provider (required because `useStore()` must be called within `LiveStoreProvider` context)

```
User Action → store.commit(event) → Event Log (OPFS) → Materializer → Client SQLite → queryDb → Reactive Ref → UI
```

LiveStore does not use the shared REST API. All data is local-first with OPFS persistence. Multi-tab sync via SharedWorker. IDs are string UUIDs (`crypto.randomUUID()`).

## Conventions

- Each layer is self-contained: own `nuxt.config.ts`, pages, composables/stores
- Layers extend `../shared` for the backend — they do not duplicate API endpoints
- Server utils (`useDrizzle`, `todos`) are auto-imported in all server handlers
- `$fetch` is used for client-to-server API calls (Nuxt's built-in, not axios)
- `pnpm` with catalogs — dependency versions are defined in `pnpm-workspace.yaml`
