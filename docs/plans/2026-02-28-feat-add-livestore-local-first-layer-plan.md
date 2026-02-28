---
title: "feat: Add LiveStore layer as 6th state management approach"
type: feat
status: active
date: 2026-02-28
---

# feat: Add LiveStore Layer

## Overview

Add a sixth state management approach to the project using **LiveStore** by Johannes Schickling — a local-first reactive database built on event-sourced SQLite with WASM, Web Workers, and OPFS persistence. This evolves the project from "Todo 5 Ways" to "Todo 6 Ways".

LiveStore fills a unique niche in the comparison: it is the only approach that uses **event sourcing** as its data model, where all mutations are captured as immutable events, and the application state is a materialized projection of those events into a client-side SQLite database. Unlike Yjs (CRDT-based) or TanStack DB (collection-based), LiveStore provides a full SQL query interface with reactive subscriptions, deterministic state reconstruction via event replay, and a git-like push/pull sync protocol.

## Problem Statement / Motivation

The current project demonstrates five state management patterns: manual store (Pinia), query/mutation cache (Colada), auto-generated local-first (rstore), CRDT offline-first (Yjs), and client-side reactive database (TanStack DB). LiveStore represents the emerging **"event-sourced local-first"** category — the idea that the event log is the source of truth and the database is a derived view. This pattern is gaining traction in the local-first community (LocalFirstConf 2025), and adding it completes the spectrum from simple server-fetching to sophisticated local-first architectures.

Key differentiators from existing approaches:

| Dimension | Existing approaches | LiveStore |
|---|---|---|
| Source of truth | Server DB (Pinia/Colada), Drizzle mirror (rstore), CRDT doc (Yjs), in-memory collection (TanStack DB) | Immutable event log |
| Mutation model | CRUD operations | Event commits with typed payloads |
| State derivation | Direct writes | Materializers (event → SQL) |
| Conflict resolution | Last-write-wins or CRDTs | Event rebasing (git-like) |
| Query system | JS filtering / `useLiveQuery` | Full SQL via reactive `queryDb()` |
| Persistence | Server SQLite / IndexedDB | OPFS (Origin Private File System) |

## Proposed Solution

Create a new Nuxt layer at `layers/livestore/` following the established layer pattern. The layer uses LiveStore's event-sourcing architecture with a client-side SQLite database (via WASM), OPFS persistence, and Web Worker execution. No sync backend is included initially — the demo shows local-first + multi-tab coordination via SharedWorker.

### Architecture

```
layers/livestore/
├── nuxt.config.ts                       # extends ../shared, vite worker config
├── pages/livestore.vue                  # page at /livestore, uses <TodoPage>
├── composables/useLivestoreTodos.ts     # store access, queries, mutations
├── plugins/livestore.client.ts          # adapter + store singleton init
├── livestore/
│   ├── schema.ts                        # events, tables, materializers
│   └── livestore.worker.ts              # Web Worker entry point
└── livestore-globals.d.ts               # HMR singleton type declarations
```

**Data flow:**

```
User Action
    ↓  store.commit(events.todoCreated({...}))
Event Log (OPFS-persisted, immutable)
    ↓  materializer: events → SQL mutations
Client-side SQLite (WASM, in Web Worker)
    ↓  queryDb(tables.todos.where({deletedAt: null}))
Reactive Query → ComputedRef<Todo[]>
    ↓  mapped to { id, title, completed: 0|1 }
<TodoPage> component
```

**Multi-tab coordination:**

```
Tab A commits event → SharedWorker → broadcasts to Tab B → Tab B replays → UI updates
```

### Key Design Decisions

1. **Client plugin + `globalThis` singleton** (like Yjs/TanStack DB) — Create the adapter and store in a `.client.ts` plugin. Use `globalThis.__livestoreAdapter` and `globalThis.__livestoreStore` for HMR safety. The `LiveStoreProvider` from `vue-livestore` wraps content in the page component for reactive context injection.

2. **No sync backend initially** — LiveStore supports optional sync via `@livestore/sync-cf` (Cloudflare Workers), but including it adds significant complexity (CF account, Durable Objects, wrangler setup). The demo focuses on local-first + multi-tab. Sync can be added as a follow-up.

3. **Use `title` field name** (not `text`) — LiveStore examples use `text`, but the project convention is `title`. Using `title` in the LiveStore schema avoids mapping in the composable and maintains consistency.

4. **Map `boolean` to `0|1` in the composable** — LiveStore's `State.SQLite.boolean` returns JS `true`/`false`, but the shared `TodoPage`/`TodoItem` components expect `completed: number`. The composable maps `completed` to `0|1` before returning, keeping shared components unchanged.

5. **Soft delete via `deletedAt`** — LiveStore idiomatically uses soft delete. The reactive query filters `WHERE deletedAt IS NULL`. This differs from other approaches (hard delete) but demonstrates event sourcing's natural audit trail.

6. **String UUIDs for IDs** — Like Yjs, LiveStore generates IDs client-side via `crypto.randomUUID()`. The `id` column is `text`, not `integer`. The shared `TodoItem` already accepts `id: number | string`.

7. **SSR guard in composable** — Return inert computed refs when `import.meta.server` is true, matching the Yjs and TanStack DB patterns.

8. **Offline toggle shows "always offline-capable"** — Since LiveStore never calls the shared REST API, the offline simulation toggle has no effect. The `DemoToolbar` will show the toggle as informational (LiveStore works offline by default). The `useOfflineSimulation` composable is still imported for interface consistency.

## Technical Approach

### Phase 1: Foundation — Schema, Worker, Plugin

**Goal:** LiveStore initializes in the browser, WASM SQLite loads, OPFS persistence works.

#### 1.1 Install dependencies

Add to `pnpm-workspace.yaml` catalogs and `package.json`:

```yaml
# pnpm-workspace.yaml — catalog:frontend
'@livestore/livestore': ^0.3.1
'@livestore/adapter-web': ^0.3.1
'@livestore/wa-sqlite': ^1.0.5-dev.2
'@livestore/peer-deps': ^0.3.1
'@livestore/utils': ^0.3.1
'vue-livestore': github:slashv/vue-livestore
```

```yaml
# pnpm-workspace.yaml — catalog:build (devtools)
'@livestore/devtools-vite': ^0.3.1
```

```json
// package.json — dependencies
"@livestore/livestore": "catalog:frontend",
"@livestore/adapter-web": "catalog:frontend",
"@livestore/wa-sqlite": "catalog:frontend",
"@livestore/peer-deps": "catalog:frontend",
"@livestore/utils": "catalog:frontend",
"vue-livestore": "catalog:frontend"
```

```json
// package.json — devDependencies
"@livestore/devtools-vite": "catalog:build"
```

- [ ] Add LiveStore packages to `pnpm-workspace.yaml` catalogs (`pnpm-workspace.yaml`)
- [ ] Add LiveStore dependencies to `package.json` (`package.json`)
- [ ] Run `pnpm install`
- [ ] Verify packages resolve correctly

#### 1.2 Define the schema

`layers/livestore/livestore/schema.ts`:

```typescript
import {
  Events,
  makeSchema,
  Schema,
  State,
} from '@livestore/livestore'

// SQLite tables (derived state)
export const tables = {
  todos: State.SQLite.table({
    name: 'todos',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      title: State.SQLite.text({ default: '' }),
      completed: State.SQLite.boolean({ default: false }),
      deletedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
      createdAt: State.SQLite.integer({ default: 0, schema: Schema.DateFromNumber }),
    },
  }),
}

// Events (source of truth)
export const events = {
  todoCreated: Events.synced({
    name: 'v1.TodoCreated',
    schema: Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      createdAt: Schema.Date,
    }),
  }),
  todoCompleted: Events.synced({
    name: 'v1.TodoCompleted',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoUncompleted: Events.synced({
    name: 'v1.TodoUncompleted',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoDeleted: Events.synced({
    name: 'v1.TodoDeleted',
    schema: Schema.Struct({
      id: Schema.String,
      deletedAt: Schema.Date,
    }),
  }),
}

// Materializers (event → SQL state)
const materializers = State.SQLite.materializers(events, {
  'v1.TodoCreated': ({ id, title, createdAt }) =>
    tables.todos.insert({ id, title, createdAt: createdAt.getTime() }),
  'v1.TodoCompleted': ({ id }) =>
    tables.todos.update({ completed: true }).where({ id }),
  'v1.TodoUncompleted': ({ id }) =>
    tables.todos.update({ completed: false }).where({ id }),
  'v1.TodoDeleted': ({ id, deletedAt }) =>
    tables.todos.update({ deletedAt: deletedAt.getTime() }).where({ id }),
})

const state = State.SQLite.makeState({ tables, materializers })
export const schema = makeSchema({ events, state })
```

- [ ] Create `layers/livestore/livestore/schema.ts` with events, tables, materializers
- [ ] Use `title` (project convention) not `text` (LiveStore convention)
- [ ] Include `createdAt` for sort order consistency

#### 1.3 Create the Web Worker

`layers/livestore/livestore/livestore.worker.ts`:

```typescript
import { makeWorker } from '@livestore/adapter-web/worker'
import { schema } from './schema'

makeWorker({ schema })
```

- [ ] Create `layers/livestore/livestore/livestore.worker.ts`

#### 1.4 Create the client plugin

`layers/livestore/plugins/livestore.client.ts`:

```typescript
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { defineNuxtPlugin } from '#app'
import LiveStoreWorker from '../livestore/livestore.worker?worker'

export default defineNuxtPlugin(() => {
  if (!globalThis.__livestoreAdapter) {
    globalThis.__livestoreAdapter = makePersistedAdapter({
      storage: { type: 'opfs' },
      worker: LiveStoreWorker,
      sharedWorker: LiveStoreSharedWorker,
    })
  }

  return {
    provide: {
      livestoreAdapter: globalThis.__livestoreAdapter,
    },
  }
})
```

- [ ] Create `layers/livestore/plugins/livestore.client.ts` with HMR-safe singleton
- [ ] Use `globalThis.__livestoreAdapter` guard pattern

#### 1.5 Create HMR type declarations

`layers/livestore/livestore-globals.d.ts`:

```typescript
import type { PersistedAdapter } from '@livestore/adapter-web'

declare global {
  // eslint-disable-next-line no-var
  var __livestoreAdapter: PersistedAdapter | undefined
}

export {}
```

- [ ] Create `layers/livestore/livestore-globals.d.ts`

#### 1.6 Create layer nuxt.config.ts

`layers/livestore/nuxt.config.ts`:

```typescript
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  extends: ['../shared'],
  vite: {
    worker: {
      format: 'es',
    },
  },
})
```

- [ ] Create `layers/livestore/nuxt.config.ts` with shared extension and Vite worker config
- [ ] Verify `?worker` and `?sharedworker` imports resolve within a Nuxt layer

#### 1.7 Validate Phase 1

- [ ] Run `pnpm dev` and verify no build errors
- [ ] Check browser console for WASM load and worker initialization
- [ ] Verify OPFS storage is created (DevTools > Application > Storage)

### Phase 2: Core — Composable and Page

**Goal:** Full CRUD todo list working at `/livestore`.

#### 2.1 Create the main composable

`layers/livestore/composables/useLivestoreTodos.ts`:

```typescript
import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { queryDb } from '@livestore/livestore'
import { useQuery, useStore } from 'vue-livestore'
import { events, tables } from '../livestore/schema'

interface Todo {
  id: string
  title: string
  completed: number
  createdAt: number
}

export function useLivestoreTodos() {
  // SSR guard — LiveStore is client-only
  if (import.meta.server) {
    return {
      todos: computed<Todo[]>(() => []),
      loading: computed(() => true),
      error: computed<string | null>(() => null),
      addTodo: (_title: string) => {},
      toggleTodo: (_id: string) => {},
      deleteTodo: (_id: string) => {},
    }
  }

  const { store } = useStore()

  // Reactive query — auto-updates when materializer changes state
  const visibleTodos$ = queryDb(
    tables.todos.where({ deletedAt: null }).orderBy('createdAt', 'desc'),
    { label: 'visibleTodos' },
  )
  const rawTodos = useQuery(visibleTodos$)

  // Map boolean completed → integer 0|1 for shared component compatibility
  const todos: ComputedRef<Todo[]> = computed(() =>
    (rawTodos.value ?? []).map(todo => ({
      id: todo.id,
      title: todo.title,
      completed: todo.completed ? 1 : 0,
      createdAt: todo.createdAt,
    })),
  )

  const loading = computed(() => false) // LiveStore loads from local OPFS, effectively instant
  const error = computed<string | null>(() => null)

  function addTodo(title: string) {
    store.commit(events.todoCreated({
      id: crypto.randomUUID(),
      title,
      createdAt: new Date(),
    }))
  }

  function toggleTodo(id: string) {
    const todo = rawTodos.value?.find(t => t.id === id)
    if (!todo) return
    if (todo.completed) {
      store.commit(events.todoUncompleted({ id }))
    } else {
      store.commit(events.todoCompleted({ id }))
    }
  }

  function deleteTodo(id: string) {
    store.commit(events.todoDeleted({ id, deletedAt: new Date() }))
  }

  return { todos, loading, error, addTodo, toggleTodo, deleteTodo }
}
```

- [ ] Create `layers/livestore/composables/useLivestoreTodos.ts`
- [ ] SSR guard returning inert computed refs
- [ ] Map `boolean` completed → `0|1` integer
- [ ] Toggle detects current state to emit correct event (`todoCompleted` vs `todoUncompleted`)

#### 2.2 Create the page component

`layers/livestore/pages/livestore.vue`:

```vue
<script setup lang="ts">
import { useOfflineSimulation, useTabSync } from '#imports'
import { LiveStoreProvider } from 'vue-livestore'
import { useNuxtApp } from '#app'
import { schema } from '../livestore/schema'
import { useLivestoreTodos } from '../composables/useLivestoreTodos'

const { $livestoreAdapter } = useNuxtApp()

const storeOptions = {
  schema,
  adapter: $livestoreAdapter,
  storeId: 'livestore-todos',
}

const { isOffline, toggleOffline } = useOfflineSimulation()
const { tabCount, lastRemoteEvent, broadcastMutation } = useTabSync('livestore')
</script>

<template>
  <LiveStoreProvider :options="storeOptions">
    <template #loading>
      <TodoPage
        title="LiveStore Todos"
        subtitle="Approach 6 — Event-sourced local-first reactive database"
        :todos="[]"
        :loading="true"
        :error="null"
      >
        <template #toolbar>
          <DemoToolbar
            :capabilities="[
              { label: 'Offline', supported: true },
              { label: 'Multi-tab sync', supported: true },
              { label: 'Conflict-free', supported: true },
              { label: 'Real-time', supported: false },
            ]"
            :is-offline="isOffline"
            :tab-count="tabCount"
            :last-remote-event="lastRemoteEvent"
            @toggle-offline="toggleOffline"
          />
        </template>
      </TodoPage>
    </template>

    <LivestoreTodoContent
      :is-offline="isOffline"
      :tab-count="tabCount"
      :last-remote-event="lastRemoteEvent"
      @toggle-offline="toggleOffline"
    />
  </LiveStoreProvider>
</template>
```

> **Note:** The inner content is extracted to a child component because `useStore()` must be called inside the `LiveStoreProvider` context. The exact component decomposition may be adjusted during implementation — the composable may be called in a nested component that receives toolbar props.

- [ ] Create `layers/livestore/pages/livestore.vue` with `LiveStoreProvider` wrapper
- [ ] Handle the provider/composable context requirement (composable must be inside provider)
- [ ] Show loading state via `TodoPage` with `loading: true` during WASM init
- [ ] Wire up `DemoToolbar` with capabilities

#### 2.3 Validate Phase 2

- [ ] Navigate to `/livestore` — page renders, store initializes
- [ ] Add a todo — appears immediately in the list
- [ ] Toggle a todo — checkbox updates
- [ ] Delete a todo — disappears from list
- [ ] Refresh the page — todos persist (OPFS)
- [ ] Open in a second tab — todos sync via SharedWorker
- [ ] Run `pnpm lint:fix && pnpm typecheck` — passes

### Phase 3: App Shell Integration

**Goal:** LiveStore is fully integrated into the app navigation, landing page, and feature matrix.

#### 3.1 Register the layer

`nuxt.config.ts` — add to the `extends` array:

```typescript
extends: [
  './layers/pinia',
  './layers/colada',
  './layers/rstore',
  './layers/yjs',
  './layers/tanstack-db',
  './layers/livestore',  // ← NEW
],
```

- [ ] Add `'./layers/livestore'` to `extends` array in root `nuxt.config.ts`

#### 3.2 Update navigation

`app/app.vue` — add nav link and update brand:

```vue
<!-- Update brand text -->
Todo 6 Ways

<!-- Add nav link after TanStack DB -->
<NuxtLink to="/livestore" class="nav-link" active-class="nav-link-active">
  LiveStore
</NuxtLink>
```

- [ ] Add LiveStore nav link to `app/app.vue`
- [ ] Update brand text from "Todo 5 Ways" to "Todo 6 Ways"

#### 3.3 Update landing page

`app/pages/index.vue` — add approach card:

```typescript
{
  num: '06',
  title: 'LiveStore',
  description: 'Event-sourced local-first reactive database with SQLite WASM, OPFS persistence, and Web Worker execution',
  path: '/livestore',
}
```

- [ ] Add LiveStore card to `approaches` array in `app/pages/index.vue`
- [ ] Update page title to "Todo, Six Ways"

#### 3.4 Update feature matrix

`app/components/FeatureMatrix.vue` — add `livestore` column:

| Feature | LiveStore |
|---|---|
| Offline support | `true` |
| Multi-tab sync | `true` |
| Conflict resolution | `true` (event rebasing) |
| Real-time sync | `false` (no sync backend) |
| Auto-generated API | `false` |
| Caching | `true` (client SQLite) |
| Optimistic updates | `true` (local-first) |

- [ ] Add `'LiveStore'` to approaches and `'livestore'` to keys in `FeatureMatrix.vue`
- [ ] Set correct feature values for each row

#### 3.5 Validate Phase 3

- [ ] Landing page shows 6 approach cards with correct numbering
- [ ] Feature matrix renders correctly with 6 columns
- [ ] Navigation links work on all screen sizes (check for wrapping)
- [ ] All existing approach routes still work (`/pinia`, `/colada`, `/rstore`, `/yjs`, `/tanstack-db`)

### Phase 4: Documentation and Polish

**Goal:** Project documentation reflects the new approach, gotchas are documented.

#### 4.1 Update CLAUDE.md

- [ ] Change description from "Todo 5 Ways" to "Todo 6 Ways" (`CLAUDE.md`)
- [ ] Add `livestore/` to the structure diagram (`CLAUDE.md`)
- [ ] Add LiveStore to the Stack section (`CLAUDE.md`)

#### 4.2 Update architecture docs

- [ ] Add "Approach 6: LiveStore" section to `docs/architecture.md`
- [ ] Document the event-sourcing data flow, schema design, and worker architecture

#### 4.3 Update gotchas

Add LiveStore-specific gotchas to `docs/gotchas.md`:

- [ ] **OPFS requires secure context** — LiveStore's OPFS persistence requires HTTPS in production. Works on `localhost` during development.
- [ ] **`?worker` imports in layers** — Worker imports with Vite suffixes must resolve correctly within the `layers/livestore/` directory. If build fails, may need explicit Vite `resolve.alias` config.
- [ ] **LiveStore data is isolated** — LiveStore does not use the shared REST API. Todos created in LiveStore are not visible in other approaches (and vice versa). This is the same as Yjs.
- [ ] **`completed` is boolean internally** — LiveStore's SQLite stores `completed` as boolean (`true`/`false`). The composable maps to `0|1` for shared component compatibility.
- [ ] **Event names are versioned** — LiveStore events use `v1.` prefix (e.g., `v1.TodoCreated`). This enables future schema evolution without breaking existing event logs.

#### 4.4 Final validation

- [ ] Run `pnpm lint:fix` — no errors
- [ ] Run `pnpm typecheck` — no errors
- [ ] Run `pnpm build` — production build succeeds
- [ ] Manual test all 6 approaches end-to-end
- [ ] Verify LiveStore persistence survives page refresh
- [ ] Verify LiveStore multi-tab sync works

## Alternative Approaches Considered

### 1. Replace TanStack DB with LiveStore

**Rejected.** TanStack DB and LiveStore solve the problem differently — TanStack DB is a collection-based reactive database backed by TanStack Query, while LiveStore is event-sourced. Both are valuable comparisons. The project's purpose is to show the breadth of approaches.

### 2. Include sync backend (Cloudflare Workers)

**Deferred.** Including `@livestore/sync-cf` would demonstrate cross-device sync but requires a Cloudflare account, Durable Objects configuration, and a `wrangler.toml`. This adds operational complexity that detracts from the state management comparison. Can be added as a future enhancement with a toggle (like Yjs's WebSocket).

### 3. Use `LiveStoreProvider` as the sole initialization mechanism

**Rejected.** The `LiveStoreProvider` pattern (wrapping page content) means the Web Worker re-initializes every time the user navigates to/from `/livestore`. Using a client plugin with `globalThis` singleton keeps the worker alive across navigations, reducing latency on subsequent visits. The `LiveStoreProvider` is still used for Vue context injection but receives the pre-initialized adapter.

### 4. Map LiveStore's `text` field to shared `title`

**Rejected the mapping approach.** Instead, the LiveStore schema directly uses `title` as the column name. This is a minor deviation from LiveStore examples but avoids a mapping layer and keeps the composable simple.

## Acceptance Criteria

### Functional Requirements

- [ ] `/livestore` page renders and shows a todo list
- [ ] User can add a new todo (persists to OPFS)
- [ ] User can toggle a todo's completion state
- [ ] User can delete a todo (soft delete, disappears from list)
- [ ] Todos persist across page refreshes (OPFS)
- [ ] Todos sync across browser tabs (SharedWorker)
- [ ] Page works fully offline (no server dependency for CRUD)
- [ ] Loading state shows during initial WASM/OPFS initialization

### Non-Functional Requirements

- [ ] `pnpm lint:fix` passes with no errors
- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm build` succeeds (production build)
- [ ] No console errors or warnings related to LiveStore
- [ ] All existing approaches continue to function correctly
- [ ] Page interaction feels instant (< 16ms mutation-to-render)

### Quality Gates

- [ ] SSR does not crash (guard returns inert refs)
- [ ] HMR does not create duplicate workers
- [ ] Navigation away from `/livestore` does not leak workers or memory
- [ ] Feature matrix accurately reflects LiveStore capabilities

## Success Metrics

- LiveStore layer follows the exact same structural patterns as Yjs and TanStack DB layers
- No modifications to shared components required (type mapping handled in composable)
- Users can compare all 6 approaches side-by-side on the landing page
- LiveStore demonstrates a genuinely different paradigm (event sourcing) from the other 5 approaches

## Dependencies & Prerequisites

### Required

- `@livestore/livestore` v0.3.1+ — Core library
- `@livestore/adapter-web` v0.3.1+ — Web platform adapter (Worker, SharedWorker, OPFS)
- `@livestore/wa-sqlite` v1.0.5-dev.2 — WASM SQLite build
- `@livestore/peer-deps` v0.3.1+ — Peer dependency resolver
- `@livestore/utils` v0.3.1+ — Shared utilities
- `vue-livestore` (from `github:slashv/vue-livestore`) — Vue composables and provider

### Development

- `@livestore/devtools-vite` v0.3.1+ — Optional Vite devtools plugin

### Browser Requirements

- Chrome 102+ / Firefox 111+ / Safari 15.2+ (OPFS support)
- Web Worker and SharedWorker support
- WebAssembly support

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| `?worker` imports don't resolve in Nuxt layers | Blocks implementation | Medium | Test early in Phase 1. Fallback: use explicit worker URL construction or move worker to `public/` |
| OPFS requires COOP/COEP headers | Breaks other approaches | Low | Modern browsers support OPFS without COOP/COEP for non-SharedArrayBuffer use. Test without headers first |
| `vue-livestore` is beta with breaking changes | API instability | Medium | Pin to specific commit hash in `package.json`. Monitor the repo for updates |
| LiveStore WASM bundle increases overall build size | Performance | Low | LiveStore only loads on `/livestore` page (code-split by Nuxt routing). WASM loads async in worker |
| SharedWorker not supported in all contexts | Multi-tab sync fails | Low | SharedWorker has broad support. LiveStore degrades gracefully to dedicated worker |
| HMR creates orphaned workers during development | DX issues | Medium | `globalThis` singleton guard prevents duplicate creation. Worker cleanup on plugin unmount |

## Resource Requirements

### Dependencies to install

~6 npm packages (see Phase 1.1)

### Files to create (new)

| File | Purpose |
|---|---|
| `layers/livestore/nuxt.config.ts` | Layer config |
| `layers/livestore/pages/livestore.vue` | Page component |
| `layers/livestore/composables/useLivestoreTodos.ts` | Main composable |
| `layers/livestore/plugins/livestore.client.ts` | Client-only adapter init |
| `layers/livestore/livestore/schema.ts` | Events, tables, materializers |
| `layers/livestore/livestore/livestore.worker.ts` | Web Worker entry |
| `layers/livestore/livestore-globals.d.ts` | HMR singleton types |

### Files to modify (existing)

| File | Change |
|---|---|
| `nuxt.config.ts` | Add `'./layers/livestore'` to `extends` |
| `app/app.vue` | Add nav link, update brand to "6 Ways" |
| `app/pages/index.vue` | Add approach card, update title |
| `app/components/FeatureMatrix.vue` | Add LiveStore column |
| `package.json` | Add LiveStore dependencies |
| `pnpm-workspace.yaml` | Add LiveStore versions to catalogs |
| `CLAUDE.md` | Update description and structure |
| `docs/architecture.md` | Add Approach 6 section |
| `docs/gotchas.md` | Add LiveStore-specific gotchas |

## Future Considerations

1. **Sync backend** — Add `@livestore/sync-cf` with a Cloudflare Workers backend for cross-device sync. Could follow the Yjs pattern of adding a server route, or use an external CF worker.
2. **Event log viewer** — Add a UI panel showing the event log for educational purposes (LiveStore's main differentiator).
3. **Undo/redo** — LiveStore's event-sourcing model naturally supports undo by reversing events. Could add undo/redo buttons like the Yjs approach.
4. **Event log compaction** — For long-running usage, implement event log pruning/snapshotting to prevent unbounded growth.
5. **DevTools integration** — Enable `@livestore/devtools-vite` plugin for development, showing reactive query performance and event flow.

## References & Research

### Internal References

- TanStack DB layer (similar pattern): `layers/tanstack-db/` — composable + client plugin + page
- Yjs layer (closest analog): `layers/yjs/` — client plugin, HMR singletons, SSR guard, WebSocket server
- Shared component contract: `layers/shared/components/TodoPage.vue`, `layers/shared/components/TodoItem.vue`
- Layer registration: `nuxt.config.ts:5-11` (extends array)
- HMR singleton pattern: `layers/yjs/plugins/yjs.client.ts`, `layers/tanstack-db/composables/useTanstackDbTodos.ts`
- Dependency catalogs: `pnpm-workspace.yaml`

### External References

- [LiveStore Documentation](https://docs.livestore.dev/)
- [LiveStore GitHub](https://github.com/livestorejs/livestore) (3,482 stars, Apache-2.0)
- [Vue Getting Started](https://docs.livestore.dev/getting-started/vue/)
- [vue-livestore GitHub](https://github.com/slashv/vue-livestore) (32 stars, beta)
- [LiveStore Schema Reference](https://docs.livestore.dev/reference/state/sqlite-schema/)
- [LiveStore Events Reference](https://docs.livestore.dev/reference/events/)
- [LiveStore Materializers Reference](https://docs.livestore.dev/reference/state/materializers/)
- [LiveStore Web Adapter Reference](https://docs.livestore.dev/reference/platform-adapters/web-adapter/)
- [LiveStore Sync (Cloudflare)](https://docs.livestore.dev/reference/syncing/sync-provider/cloudflare/)
- [LiveStore LLM Docs (full)](https://docs.livestore.dev/llms-full.txt)

### Related Work

- Previous plan: `docs/plans/2026-02-28-feat-add-tanstack-db-layer-plan.md`
- Previous plan: `docs/plans/2026-02-28-feat-add-yjs-crdt-local-first-todo-layer-plan.md`
