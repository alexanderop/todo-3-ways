# Gotchas

## Drizzle + better-sqlite3

- `completed` is stored as `INTEGER` (0/1), not a boolean. All layers compare against `0`/`1`, not `true`/`false`.
- `createdAt` and `updatedAt` use `integer({ mode: 'timestamp' })` with `$defaultFn(() => new Date())` — Drizzle handles the Date-to-integer conversion. The `updatedAt` column is required by `@rstore/offline`'s auto-generated `syncCollection` hook, which uses `gte("updatedAt", lastUpdatedAt)` for incremental sync.
- The DB file (`./db.sqlite`) is gitignored and created on first run. If it's missing, the app creates it automatically.

## Layer Order in nuxt.config.ts

The `extends` array order in the root `nuxt.config.ts` matters for module resolution and route registration. Current order: pinia, colada, rstore, yjs. Changing order can affect which layer's modules load first.

## Yjs is Client-Only

The Yjs plugin uses the `.client.ts` suffix (`plugins/yjs.client.ts`) because `Y.Doc`, `y-websocket`, and `y-indexeddb` are browser-only APIs. Accessing `$yDoc`/`$yWs`/`$yIdb` in SSR context will fail.

The Yjs WebSocket sync uses Nitro's built-in WebSocket support via `y-crossws`. The server route at `/_yjs/todo-yjs` starts automatically with `pnpm dev` — no separate process needed. The plugin derives the WebSocket URL from `window.location`, so it works in both dev and production.

## Yjs Uses String UUIDs

Unlike the other three approaches (which use SQLite auto-increment integer IDs), Yjs generates IDs via `crypto.randomUUID()`. The `yjs-callback.post.ts` endpoint upserts into SQLite by title, not by ID.

## rstore Server Hooks

The rstore `allowTables()` call lives in a Nitro server plugin (`server/plugins/rstore-hooks.ts`), not a Nuxt plugin. It must whitelist tables before the rstore module's auto-generated API can serve them. Missing this file causes silent 404s on rstore queries.

### Integer Timestamps Need Date Coercion

When using `integer({ mode: 'timestamp' })` columns, Drizzle's driver calls `.getTime()` on values during insert. If the client sends raw unix integers (common in offline mode to avoid Date proxy issues), the server hook must coerce them to `Date` objects:

```ts
rstoreDrizzleHooks.hook('index.post.before', ({ body }) => {
  if (typeof body.createdAt === 'number')
    body.createdAt = new Date(body.createdAt * 1000)
  if (typeof body.updatedAt === 'number')
    body.updatedAt = new Date(body.updatedAt * 1000)
})
```

Without this, you'll see `value.getTime is not a function` errors on POST requests.

## UnoCSS Shortcuts

Two shortcuts are defined in `uno.config.ts`:
- `btn` — teal button with hover/disabled states
- `icon-btn` — icon-style interactive element with opacity transition

Colors are managed via CSS custom properties in `app/app.vue` (e.g., `--color-fill`, `--color-accent`), not via UnoCSS theme tokens.

## Shared Layer Has No nuxt.config Modules

The shared layer's `nuxt.config.ts` only sets `$meta.name: 'shared'`. It does not register any Nuxt modules — it relies on Nitro auto-imports for `useDrizzle` and `todos` to be available in server handlers.

## pnpm Catalogs

All dependency versions are managed via `pnpm-workspace.yaml` catalogs, not individual `package.json` version fields. When adding a dependency, add its version to the catalog first.
