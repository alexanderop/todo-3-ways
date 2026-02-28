---
title: "feat: Add Yjs/CRDT local-first todo layer"
type: feat
status: active
date: 2026-02-28
---

# feat: Add Yjs/CRDT Local-First Todo Layer

## Overview

Add a 4th todo implementation to the "Todo 3 Ways" app using **Yjs CRDTs** with IndexedDB persistence and WebSocket/WebRTC sync. This approach is fundamentally different from the existing three: data lives in the browser first (IndexedDB), syncs peer-to-peer or via WebSocket, and optionally writes back to the shared SQLite database. The app becomes "Todo, Four Ways."

This layer demonstrates **local-first architecture** (Kleppmann's philosophy): the app works offline by default, syncs when connectivity is available, and survives server shutdowns without data loss.

## Problem Statement / Motivation

The existing three approaches (Pinia, Pinia Colada, rstore) all follow a client-server model where the server is the source of truth. A local-first approach inverts this — the client owns its data, and sync is an optional enhancement. This is an increasingly important pattern for modern apps and deserves representation in the demo.

## Proposed Solution

Create a new Nuxt layer at `layers/yjs/` that:
1. Initializes a **Yjs Y.Doc** via a `.client.ts` plugin (browser-only singleton)
2. Persists to **IndexedDB** via `y-indexeddb` (offline-first, survives page reloads)
3. Syncs in real-time via **y-websocket** (multi-device, multi-tab)
4. Optionally syncs via **y-webrtc** (peer-to-peer, no server needed)
5. Bridges Yjs data into Vue reactivity via a composable using `shallowRef`
6. Follows the exact same UI template as the existing 3 approaches

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│                                                  │
│  Vue Component ←── useYjsTodos() ←── Y.Doc      │
│       │                                  │       │
│       │ (user actions)                   │       │
│       └──────────────────────────► Y.Doc │       │
│                                     │    │       │
│                           ┌─────────┤    │       │
│                           ▼         ▼    │       │
│                    y-indexeddb   y-websocket      │
│                    (IndexedDB)   (WebSocket)     │
│                                     │            │
└─────────────────────────────────────┤────────────┘
                                      │
                              ┌───────▼───────┐
                              │  y-websocket  │
                              │    server     │
                              │  (separate    │
                              │   process)    │
                              └───────┬───────┘
                                      │ CALLBACK_URL
                              ┌───────▼───────┐
                              │  Nitro API    │
                              │  /api/yjs/    │
                              │  sync.post.ts │
                              └───────┬───────┘
                                      │
                              ┌───────▼───────┐
                              │   SQLite      │
                              │  (shared db)  │
                              └───────────────┘
```

**Data flow is unidirectional:**
- User Action → write to Y.Doc → Yjs observer fires → Vue `shallowRef` updated → UI re-renders
- Never use `watch()` on Vue refs to write back to Yjs (causes infinite loops)

### Global SSR Change

Set `ssr: false` in the root `nuxt.config.ts`. This disables server-side rendering for the entire app (all 4 approaches). Since the Yjs layer requires client-only execution and the user requested this globally, all pages will render as a client-side SPA.

**Impact on existing approaches:**
- `await callOnce(store.fetchTodos)` in Pinia page will run client-side only (still works, just no SSR)
- `useQuery` in Colada page will fetch client-side only (still works)
- `store.todos.query()` in rstore page will run client-side only (still works, rstore is client-first)
- No server-rendered HTML for any page (acceptable for a demo app)

### Y.Doc Data Structure

Use a `Y.Map<string, Y.Map>` keyed by UUID instead of `Y.Array`, to avoid concurrent-delete-by-index problems:

```
doc.getMap('todos')
  ├── "a1b2c3-..." → Y.Map { id, title, completed, createdAt }
  ├── "d4e5f6-..." → Y.Map { id, title, completed, createdAt }
  └── "g7h8i9-..." → Y.Map { id, title, completed, createdAt }
```

**Why Y.Map over Y.Array:**
- O(1) lookup by UUID (vs O(n) scan for Y.Array)
- No index-shift problems with concurrent deletes
- Each field in the nested Y.Map is independently mergeable by the CRDT
- Display order uses `createdAt` timestamp sorting

### Todo Item Fields

```typescript
interface YjsTodo {
  id: string          // crypto.randomUUID()
  title: string
  completed: number   // 0 or 1 (matches existing SQLite schema convention)
  createdAt: number   // Unix timestamp (Date.now())
}
```

### ID Schema: UUID vs Integer

The Yjs layer uses UUID strings internally. The existing shared SQLite schema uses auto-increment integers. These are kept separate:

- The Yjs layer does **not** read from or write to `/api/todos` directly
- The optional CALLBACK_URL sync writes to a separate Nitro endpoint that maps UUIDs to integer IDs server-side (auto-increment on insert, upsert on update)
- The other 3 approaches continue using integer IDs unchanged

### WebSocket Server

Run `y-websocket` as a separate process alongside the Nuxt dev server. Add npm scripts for convenience:

```json
{
  "dev:yjs": "HOST=localhost PORT=1234 npx y-websocket",
  "dev:all": "concurrently \"pnpm dev\" \"pnpm dev:yjs\""
}
```

Room name: `todo-4-ways` (single shared room for all connected clients).

### Connection Status

The `/yjs` page shows a subtle connection indicator (distinct from loading/error used by other approaches):
- Green dot: WebSocket connected and synced
- Yellow dot: connecting/syncing
- Gray dot: offline (still fully functional)

This visually communicates the local-first philosophy: "the app always works, sync is a bonus."

## File Changes

### New Files

#### `layers/yjs/nuxt.config.ts`

Layer configuration. Extends `../shared` for layer inheritance. No additional modules needed (Yjs is initialized via a client plugin, not a Nuxt module).

```typescript
export default defineNuxtConfig({
  extends: ['../shared'],
  $meta: {
    name: 'yjs',
  },
})
```

#### `layers/yjs/plugins/yjs.client.ts`

Singleton Y.Doc with IndexedDB + WebSocket providers. The `.client.ts` suffix ensures this never runs during SSR. Provides `$yDoc`, `$yWsProvider`, and `$yIndexeddbProvider` to the Nuxt app.

```typescript
// Creates Y.Doc singleton, IndexedDB persistence, WebSocket sync
// IndexedDB provider initialized BEFORE WebSocket (local data loads first)
// Room name: 'todo-4-ways'
// WebSocket URL: configurable via runtime config, defaults to ws://localhost:1234
```

#### `layers/yjs/composables/useYjsTodos.ts`

Reactive bridge between Yjs and Vue. Uses `shallowRef` for the todo list (avoids deep proxy overhead). Exposes `addTodo`, `toggleTodo`, `deleteTodo` action functions that write to Y.Doc. Yjs `observeDeep` pushes changes into Vue refs.

```typescript
// Returns: { todos, isOnline, isSynced, addTodo, toggleTodo, deleteTodo }
// Uses shallowRef for performance
// Snapshot function converts Y.Map entries to plain objects
// Cleanup: unobserveDeep + provider event listeners in onUnmounted
```

Key patterns:
- `shallowRef<YjsTodo[]>([])` — only triggers on `.value` reassignment
- `doc.getMap('todos').observeDeep(handler)` — fires on any nested change
- Actions write to Y.Doc, never to Vue refs directly
- UUID lookup in Y.Map is O(1) via `yTodos.get(id)`
- TypeScript typing without assertions: use `String()`, `Number()`, `Boolean()` coercion

#### `layers/yjs/pages/yjs.vue`

The page component. Follows the exact same UI template as existing approaches (`.todo-app`, `.todo-card`, `.add-form`, `.todo-list`, `.todo-item`). Adds a connection status indicator.

```vue
<!-- Template structure matches pinia.vue / colada.vue / rstore.vue exactly -->
<!-- Additional: connection status dot in the subtitle area -->
<!-- No loading state needed (data is always available from IndexedDB) -->
```

#### `layers/yjs/server/api/yjs-callback.post.ts` (optional)

Receives CALLBACK_URL POST from `y-websocket` server. Decodes the Y.Doc update, extracts current todo items, and upserts into the shared SQLite `todos` table. Uses server-generated integer IDs.

```typescript
// Receives: { room: string, data: { todos: { type: 'Map', content: [...] } } }
// For each todo: upsert into SQLite, generating integer IDs as needed
// Debounced by y-websocket (CALLBACK_DEBOUNCE_WAIT=2000)
```

### Modified Files

#### `nuxt.config.ts` (root)

```diff
 export default defineNuxtConfig({
   extends: [
     './layers/pinia',
     './layers/colada',
     './layers/rstore',
+    './layers/yjs',
   ],
+  ssr: false,
   // ... rest unchanged
 })
```

Also update meta description from "3 ways" to "4 ways".

#### `app/app.vue`

```diff
-        Todo 3 Ways
+        Todo 4 Ways

         <!-- Add nav link -->
+        <NuxtLink to="/yjs" class="nav-link">
+          Yjs
+        </NuxtLink>
```

#### `app/pages/index.vue`

```diff
-      <h1>Todo, Three Ways</h1>
-      <p>The same todo app built with three different state management approaches in Nuxt.</p>
+      <h1>Todo, Four Ways</h1>
+      <p>The same todo app built with four different state management approaches in Nuxt.</p>

+      <NuxtLink to="/yjs" class="approach-card">
+        <span class="approach-num">04</span>
+        <h2>Yjs</h2>
+        <p>Local-first CRDT with offline sync</p>
+        <span class="approach-go">&rarr;</span>
+      </NuxtLink>
```

#### `package.json`

Add dependencies (with pnpm catalog entries in `pnpm-workspace.yaml`):

```diff
 "dependencies": {
+    "yjs": "catalog:frontend",
+    "y-indexeddb": "catalog:frontend",
+    "y-websocket": "catalog:frontend",
 }
 "devDependencies": {
+    "concurrently": "catalog:dev",
 }
 "scripts": {
+    "dev:yjs": "HOST=localhost PORT=1234 npx y-websocket",
+    "dev:all": "concurrently \"pnpm dev\" \"pnpm dev:yjs\"",
 }
```

#### `pnpm-workspace.yaml`

Add catalog entries:

```diff
 frontend:
+    yjs: ^13.6.0
+    y-indexeddb: ^9.0.0
+    y-websocket: ^2.1.0
 dev:
+    concurrently: ^9.1.0
```

## Acceptance Criteria

### Functional Requirements

- [ ] `/yjs` page renders the same todo UI as the other 3 approaches
- [ ] Adding a todo writes to Y.Doc and appears in the list immediately
- [ ] Toggling a todo's completed state persists via CRDT
- [ ] Deleting a todo removes it from the CRDT document
- [ ] Data persists across page reloads (IndexedDB)
- [ ] Data syncs between tabs in the same browser (BroadcastChannel)
- [ ] Data syncs between browsers/devices when y-websocket server is running
- [ ] App works fully offline (no WebSocket server needed)
- [ ] Connection status indicator shows online/offline/syncing state
- [ ] Navigation header includes "Yjs" link
- [ ] Landing page includes 04 approach card for Yjs
- [ ] Title updated to "Todo, Four Ways"

### Non-Functional Requirements

- [ ] No type assertions (`as`) in any TypeScript code
- [ ] No `any` types
- [ ] No `else` / `else if` blocks
- [ ] Max complexity 10 per function
- [ ] Max template depth 8
- [ ] Uses `<script setup lang="ts">`
- [ ] All Yjs imports only in `.client.ts` files or behind `import.meta.client` guards
- [ ] Cleanup: `unobserveDeep`, `provider.destroy()` in `onUnmounted`

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| y-websocket server must run separately | Adds dev setup complexity | `dev:all` script with `concurrently` |
| Yjs types return `any` from `Y.Map.get()` | Conflicts with no-assertion rule | Use `String()`, `Number()` coercion instead of `as` |
| `ssr: false` changes behavior of existing 3 approaches | Existing pages no longer server-render | Acceptable for demo app; all approaches still work client-side |
| IndexedDB storage quota | Could fill up with large CRDT documents | Negligible for demo; Yjs GC handles tombstone cleanup |
| HMR re-creates Y.Doc during development | Duplicate providers, split-brain | Guard with `globalThis.__yDoc` check in plugin |

## Implementation Order

1. Add dependencies to `package.json` and `pnpm-workspace.yaml`, run `pnpm install`
2. Create `layers/yjs/nuxt.config.ts`
3. Create `layers/yjs/plugins/yjs.client.ts` (Y.Doc + providers)
4. Create `layers/yjs/composables/useYjsTodos.ts` (reactive bridge)
5. Create `layers/yjs/pages/yjs.vue` (UI page)
6. Update `nuxt.config.ts` (add layer, set `ssr: false`, update meta)
7. Update `app/app.vue` (add nav link, rename to "4 Ways")
8. Update `app/pages/index.vue` (add 04 card, update heading)
9. (Optional) Create `layers/yjs/server/api/yjs-callback.post.ts` (CRDT -> SQLite sync)
10. Test: dev server + y-websocket server, verify all flows

## Edge Cases Identified (SpecFlow)

- **Concurrent deletes**: Using Y.Map keyed by UUID avoids index-shift problems that Y.Array would have
- **First visit with empty IndexedDB**: Shows empty list (expected — CRDT starts empty, data is user-created)
- **Schema version change**: If Y.Map fields change later, old IndexedDB data retains old structure; consider a version check + `indexedDB.deleteDatabase()` strategy
- **Cross-tab sync without WebSocket**: `y-websocket` uses `BroadcastChannel` automatically for same-browser tabs
- **WebSocket server down**: App degrades gracefully — fully functional offline, retries connection with exponential backoff (max 2500ms default)
- **`crypto.randomUUID()` availability**: Requires secure context (HTTPS or localhost) — always available in development

## References

### Internal References

- Existing layer pattern: `layers/pinia/nuxt.config.ts`, `layers/colada/nuxt.config.ts`, `layers/rstore/nuxt.config.ts`
- Shared database schema: `layers/shared/server/database/schema.ts`
- Drizzle utilities: `layers/shared/server/utils/drizzle.ts`
- UI template pattern: `layers/pinia/pages/pinia.vue` (CSS classes, template structure)
- Landing page: `app/pages/index.vue` (approach cards)
- Navigation: `app/app.vue` (header nav)
- ESLint rules: `eslint.config.js`, `.oxlintrc.json`

### External References

- [Yjs Documentation](https://docs.yjs.dev/)
- [y-indexeddb](https://github.com/yjs/y-indexeddb)
- [y-websocket](https://github.com/yjs/y-websocket)
- [y-webrtc](https://github.com/yjs/y-webrtc)
- [y-websocket-server](https://github.com/yjs/y-websocket-server)
- [Nuxt 4 Client-Only Plugins](https://nuxt.com/docs/4.x/directory-structure/app/plugins)
- [Vue shallowRef](https://vuejs.org/api/reactivity-advanced.html#shallowref)
- [Martin Kleppmann: Local-First Software](https://www.inkandswitch.com/local-first/)
