# Gotchas

## Drizzle + better-sqlite3

- `completed` is stored as `INTEGER` (0/1), not a boolean. All layers compare against `0`/`1`, not `true`/`false`.
- `createdAt` uses `integer({ mode: 'timestamp' })` with `$defaultFn(() => new Date())` — Drizzle handles the Date-to-integer conversion.
- The DB file (`./db.sqlite`) is gitignored and created on first run. If it's missing, the app creates it automatically.

## Layer Order in nuxt.config.ts

The `extends` array order in the root `nuxt.config.ts` matters for module resolution and route registration. Current order: pinia, colada, rstore, yjs. Changing order can affect which layer's modules load first.

## Yjs is Client-Only

The Yjs plugin uses the `.client.ts` suffix (`plugins/yjs.client.ts`) because `Y.Doc`, `y-websocket`, and `y-indexeddb` are browser-only APIs. Accessing `$yDoc`/`$yWs`/`$yIdb` in SSR context will fail.

The Yjs layer requires a separate WebSocket server running at `ws://localhost:1234` (hardcoded in the plugin). Without it, the Yjs approach works offline-only via IndexedDB.

## Yjs Uses String UUIDs

Unlike the other three approaches (which use SQLite auto-increment integer IDs), Yjs generates IDs via `crypto.randomUUID()`. The `yjs-callback.post.ts` endpoint upserts into SQLite by title, not by ID.

## rstore Server Hooks

The rstore `allowTables()` call lives in a Nitro server plugin (`server/plugins/rstore-hooks.ts`), not a Nuxt plugin. It must whitelist tables before the rstore module's auto-generated API can serve them. Missing this file causes silent 404s on rstore queries.

## UnoCSS Shortcuts

Two shortcuts are defined in `uno.config.ts`:
- `btn` — teal button with hover/disabled states
- `icon-btn` — icon-style interactive element with opacity transition

Colors are managed via CSS custom properties in `app/app.vue` (e.g., `--color-fill`, `--color-accent`), not via UnoCSS theme tokens.

## Shared Layer Has No nuxt.config Modules

The shared layer's `nuxt.config.ts` only sets `$meta.name: 'shared'`. It does not register any Nuxt modules — it relies on Nitro auto-imports for `useDrizzle` and `todos` to be available in server handlers.

## pnpm Catalogs

All dependency versions are managed via `pnpm-workspace.yaml` catalogs, not individual `package.json` version fields. When adding a dependency, add its version to the catalog first.
