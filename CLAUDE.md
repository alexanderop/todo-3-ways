# CLAUDE.md

Todo 6 Ways — a Nuxt 4 monorepo demonstrating Pinia, Pinia Colada,
rstore, Yjs, TanStack DB, and LiveStore state management via layers with a shared SQLite backend.

## Commands

```
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint:fix     # Auto-fix lint (oxlint + eslint)
pnpm typecheck    # Type-check with vue-tsc
```

Run `pnpm lint:fix && pnpm typecheck` after code changes.

## Stack

- Nuxt 4 with UnoCSS
- Drizzle ORM + better-sqlite3
- Pinia, Pinia Colada, @rstore/nuxt-drizzle, Yjs, TanStack DB, LiveStore
- ESLint (@antfu/eslint-config) + Oxlint

## Structure

```
app/                  # Main app shell (layout, landing page)
layers/
  shared/             # Shared server: API endpoints, Drizzle schema, DB utils
  pinia/              # Approach 1: manual Pinia store
  colada/             # Approach 2: Pinia Colada queries/mutations
  rstore/             # Approach 3: rstore local-first with Drizzle
  yjs/                # Approach 4: Yjs CRDT offline-first sync
  tanstack-db/        # Approach 5: TanStack DB client-side reactive database
  livestore/          # Approach 6: LiveStore event-sourced local-first
nuxt.config.ts        # Extends all 6 layers
eslint.config.js      # @antfu/eslint-config + oxlint
drizzle.config.ts     # Points to shared layer schema
```

## Conventions

- **No auto-import.** `imports.autoImport` is `false` in `nuxt.config.ts`.
  Always use explicit imports (`from '#imports'` or `'#app'`) for composables and Nuxt utilities.
  Component auto-scanning is still enabled.

## Further Reading

**IMPORTANT:** Before starting any task, identify which docs below
are relevant and read them first.

- `docs/architecture.md` — Layer patterns, API design, DB schema
- `docs/gotchas.md` — Non-obvious pitfalls and workarounds
