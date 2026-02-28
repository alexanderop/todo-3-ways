# Architecture

## Layer-Based Structure

The app uses Nuxt layers to implement the same todo app four different ways,
all sharing one backend. Each layer extends `../shared` in its own `nuxt.config.ts`.

The root `nuxt.config.ts` extends all four layers:

```ts
extends: ['./layers/pinia', './layers/colada', './layers/rstore', './layers/yjs']
```

Each layer registers a route at its name (`/pinia`, `/colada`, `/rstore`, `/yjs`).

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

- **Client Plugin:** `plugins/yjs.client.ts` — initializes `Y.Doc`, `IndexeddbPersistence`, `WebsocketProvider`. Provides `$yDoc`, `$yIdb`, `$yWs`.
- **Composable:** `composables/useY.ts` — generic bridge from Yjs types to Vue `shallowRef` reactivity via `observeDeep` with deep equality check
- **Composable:** `composables/useYjsTodos.ts` — todo-specific API. Data stored as `Y.Map<Y.Map<unknown>>`. IDs are `crypto.randomUUID()` strings. Mutations wrapped in `doc.transact()`.
- **Server Callback:** `server/api/yjs-callback.post.ts` — receives Yjs binary updates and syncs into SQLite via Drizzle (upsert by title)
- **Page:** `pages/yjs.vue` — shows online/synced status indicators

Yjs is the source of truth — SQLite is a secondary persistence layer here.
IDs are string UUIDs (not auto-increment integers like the other approaches).

## Conventions

- Each layer is self-contained: own `nuxt.config.ts`, pages, composables/stores
- Layers extend `../shared` for the backend — they do not duplicate API endpoints
- Server utils (`useDrizzle`, `todos`) are auto-imported in all server handlers
- `$fetch` is used for client-to-server API calls (Nuxt's built-in, not axios)
- `pnpm` with catalogs — dependency versions are defined in `pnpm-workspace.yaml`
