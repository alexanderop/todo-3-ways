---
title: "Migrate All CSS to UnoCSS Utility Classes"
type: refactor
status: active
date: 2026-02-28
---

# Migrate All CSS to UnoCSS Utility Classes

## Overview

Replace all plain CSS `<style>` blocks with UnoCSS utility classes, shortcuts, and custom rules throughout the Todo 4 Ways project. Move the color system from CSS custom properties to UnoCSS theme tokens. Handle complex patterns (custom checkbox, pseudo-elements, animations) via UnoCSS shortcuts and custom rules.

## Problem Statement / Motivation

The project has UnoCSS fully configured (presetWind4, attributify, icons, typography, web fonts, directives, variant group) but only uses **1 utility class** (`min-h-screen`). All styling lives in ~400 lines of plain CSS across 3 `<style>` blocks. This creates a split mental model: UnoCSS tooling is ready but unused, while CSS classes create tight coupling between `app.vue`'s global styles and 4 layer pages that consume them.

## Current State

### Files with `<style>` blocks (3 total)

| File | Scope | Lines | Purpose |
|------|-------|-------|---------|
| `app/app.vue` | Global (unscoped) | ~300 | Resets, color vars, header, nav, ALL shared todo component styles |
| `app/pages/index.vue` | Scoped | ~110 | Landing page (hero, approach grid, cards) |
| `layers/yjs/pages/yjs.vue` | Scoped | ~20 | Sync status dot indicator |

### Files consuming global CSS classes (4 layer pages)

- `layers/pinia/pages/pinia.vue` -- uses: `todo-app`, `subtitle`, `todo-card`, `add-form`, `todo-list`, `todo-item`, `done`, `delete`, `status`, `status error`
- `layers/colada/pages/colada.vue` -- same classes
- `layers/rstore/pages/rstore.vue` -- same classes (minus `status error`)
- `layers/yjs/pages/yjs.vue` -- same classes + `sync-dot`, `online`, `synced`

### Color System (CSS custom properties as RGB triplets)

| Variable | RGB | Hex | Used with alpha at |
|----------|-----|-----|-------------------|
| `--color-fill` | `33, 39, 55` | `#212737` | 0.6, 0.8 |
| `--color-text-base` | `234, 237, 243` | `#eaedf3` | 0.2, 0.25, 0.35, 0.4, 0.45, 0.6, 0.7, 1.0 |
| `--color-accent` | `255, 107, 237` | `#ff6bed` | 0.1, 0.12, 0.15, 0.3, 0.5, 0.85, 1.0 |
| `--color-card` | `52, 63, 96` | `#343f60` | 1.0 |
| `--color-card-muted` | `138, 51, 123` | `#8a337b` | 0.12 |
| `--color-border` | `171, 75, 153` | `#ab4b99` | 0.15, 0.25, 0.4 |

## Proposed Solution

### Architecture

Migrate in 7 ordered phases. Phases 1-4 must be atomic (single commit). Phases 5-6 are independent.

### Phase 0: Base Styles (body, html, #__nuxt)

**Problem:** `body` and `html` elements are not in Vue templates -- utility classes cannot be applied directly.

**Solution:** Use UnoCSS `preflights` in `uno.config.ts` to inject minimal base styles:

```ts
// uno.config.ts
preflights: [
  {
    getCSS: ({ theme }) => `
      html, body, #__nuxt {
        height: 100%;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: ${theme.font?.sans || "'DM Sans', sans-serif"};
        background: ${theme.colors?.fill || '#212737'};
        color: ${theme.colors?.['text-base'] || '#eaedf3'};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    `,
  },
],
```

This replaces the global resets and body styles from `app.vue`. The `presetWind4` preflight already handles `box-sizing: border-box`.

### Phase 1: Theme Colors in uno.config.ts

Replace CSS custom properties with UnoCSS theme colors. Use hex values -- `presetWind4` supports `/opacity` modifiers natively with hex colors.

```ts
// uno.config.ts
theme: {
  colors: {
    fill: '#212737',
    'text-base': '#eaedf3',
    accent: '#ff6bed',
    card: '#343f60',
    'card-muted': '#8a337b',
    border: '#ab4b99',
  },
},
```

**Usage:** `bg-fill`, `text-text-base`, `bg-accent/85`, `border-border/40`, `bg-card-muted/12`

### Phase 2: Shortcuts in uno.config.ts

Define reusable shortcuts for component patterns used across multiple files:

```ts
shortcuts: [
  // -- App shell --
  {
    'app-header': 'sticky top-0 z-50 backdrop-blur-[12px] bg-fill/60',
    'header-inner': 'max-w-[640px] h-14 mx-auto px-6 flex items-center justify-between',
    'brand': 'font-serif text-[1.125rem] tracking-[-0.01em] text-text-base no-underline transition-colors duration-200 hover:text-accent',
    'app-nav': 'flex gap-1',
    'nav-link': 'font-mono text-xs uppercase tracking-[0.06em] text-text-base/45 no-underline px-3 py-1.5 rounded-[6px] transition-all duration-200 hover:(text-text-base/7 bg-text-base/5)',
    'nav-link-active': 'text-accent/85 bg-accent/10',
  },

  // -- Todo app shared --
  {
    'todo-app': 'max-w-[640px] mx-auto px-6 pt-10 pb-16',
    'todo-title': 'font-serif text-[2rem] font-normal tracking-[-0.02em] text-text-base mb-1',
    'todo-subtitle': 'font-mono text-[0.8rem] tracking-[0.03em] text-text-base/35 mb-8',
  },

  // -- Todo card --
  {
    'todo-card': 'relative bg-card rounded-2xl p-6 before:content-empty before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-accent',
  },

  // -- Add form --
  {
    'add-input': 'flex-1 font-sans text-[0.9375rem] text-text-base px-4 py-[0.6875rem] bg-fill/60 border-[1.5px] border-border/25 rounded-[10px] outline-none transition-all duration-200 placeholder:text-text-base/25 focus:(border-accent bg-fill/80 shadow-[0_0_0_3px_rgba(255,107,237,0.12)])',
    'add-button': 'font-mono text-[0.8125rem] font-medium tracking-[0.04em] uppercase text-fill bg-accent/85 border-none px-5 py-[0.6875rem] rounded-[10px] cursor-pointer transition-all duration-200 hover:(bg-accent shadow-[0_4px_12px_-2px_rgba(255,107,237,0.3)] -translate-y-px) active:translate-y-0',
  },

  // -- Todo items --
  {
    'todo-item': 'group flex items-center gap-3 px-3 py-[0.625rem] mx-[-0.75rem] my-[0.125rem] rounded-lg transition-[background] duration-150 hover:bg-text-base/4',
    'todo-text': 'flex-1 text-[0.9375rem] text-text-base/7 transition-all duration-200',
    'todo-text-done': 'line-through text-text-base/25',
    'todo-delete': 'bg-transparent border-none text-text-base/2 text-[0.8125rem] cursor-pointer transition-all duration-150 opacity-0 group-hover:opacity-100 hover:text-accent',
  },

  // -- Status messages --
  {
    'todo-status': 'font-mono text-[0.8125rem] text-text-base/4 text-center py-2',
    'todo-status-error': 'text-accent',
  },

  // -- Dynamic class shortcuts --
  {
    'online': 'bg-green-400!',
    'synced': 'bg-yellow-400!',
  },
],
```

### Phase 3: Custom Rules in uno.config.ts

Define rules for patterns that cannot be expressed as utilities:

```ts
rules: [
  // Custom checkbox - base
  ['todo-checkbox', {
    'appearance': 'none',
    '-webkit-appearance': 'none',
    'width': '20px',
    'height': '20px',
    'border': '2px solid rgba(171, 75, 153, 0.4)',
    'border-radius': '50%',
    'cursor': 'pointer',
    'transition': 'all 0.2s',
    'flex-shrink': '0',
  }],
  // Custom checkbox - checked state
  ['todo-checkbox-checked', {
    'background': '#ff6bed',
    'border-color': '#ff6bed',
    'background-image': `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='%23212737' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")`,
    'background-size': '12px',
    'background-position': 'center',
    'background-repeat': 'no-repeat',
  }],
  // Sync dot base
  ['sync-dot', {
    'display': 'inline-block',
    'width': '8px',
    'height': '8px',
    'border-radius': '50%',
    'margin-left': '0.5rem',
    'vertical-align': 'middle',
    'transition': 'background 0.3s',
  }],
],
```

**Checkbox usage in templates:**
```html
<input type="checkbox" class="todo-checkbox checked:todo-checkbox-checked hover:border-accent/60" />
```

### Phase 4: Convert app.vue + All Layer Pages (ATOMIC)

This is the highest-effort phase. All 5 files must be updated simultaneously.

#### 4a: Update `app/app.vue` template

Replace class-based selectors with shortcuts/utilities:

**Header section:**
```html
<header class="app-header">
  <div class="header-inner">
    <NuxtLink to="/" class="brand">Todo 4 Ways</NuxtLink>
    <nav class="app-nav">
      <NuxtLink to="/pinia" class="nav-link" active-class="nav-link-active">Pinia</NuxtLink>
      <!-- ... -->
    </nav>
  </div>
</header>
```

Key change: Use `active-class="nav-link-active"` on NuxtLink instead of styling `.router-link-active`.

#### 4b: Update all 4 layer page templates

Each layer page needs utility classes on every element. Example for `pinia.vue`:

```html
<div class="todo-app">
  <h1 class="todo-title">Pinia</h1>
  <p class="todo-subtitle">Manual state management</p>

  <div class="todo-card">
    <form class="flex gap-2 mb-0" @submit.prevent="addTodo">
      <input class="add-input" placeholder="Add a todo..." />
      <button class="add-button">Add</button>
    </form>

    <ul class="list-none p-0 m-0 not-empty:(mt-4 border-t border-border/15 pt-1)">
      <li v-for="todo in todos" :key="todo.id" class="todo-item">
        <input
          type="checkbox"
          :checked="todo.completed"
          class="todo-checkbox checked:todo-checkbox-checked hover:border-accent/60"
          @change="toggleTodo(todo)"
        />
        <span class="todo-text" :class="todo.completed && 'todo-text-done'">
          {{ todo.title }}
        </span>
        <button class="todo-delete" @click="deleteTodo(todo.id)">delete</button>
      </li>
    </ul>

    <p v-if="loading" class="todo-status">Loading...</p>
    <p v-if="error" class="todo-status todo-status-error">{{ error }}</p>
  </div>
</div>
```

Same pattern applied to `colada.vue`, `rstore.vue`, `yjs.vue`.

#### 4c: Remove `<style>` block from app.vue

Delete the entire `<style>` block (~300 lines).

#### 4d: Verify all 6 pages render correctly

Manual visual check of: `/`, `/pinia`, `/colada`, `/rstore`, `/yjs`.

### Phase 5: Convert index.vue (Landing Page)

Replace scoped styles with inline utilities:

**Landing header:**
```html
<div class="max-w-[640px] mx-auto px-6 pt-16">
  <header class="mb-12 after:content-empty after:block after:w-12 after:h-[3px] after:bg-accent after:rounded-sm after:mt-6">
    <h1 class="font-serif text-[2.5rem] font-normal tracking-[-0.02em] text-text-base leading-[1.15] mb-4">
      Todo, Four Ways
    </h1>
    <p class="text-[1.0625rem] text-text-base/6 leading-relaxed max-w-md">
      The same todo app, built with four different state management approaches...
    </p>
  </header>
</div>
```

**Approach cards:**
```html
<div class="grid gap-4">
  <NuxtLink
    v-for="approach in approaches"
    :to="approach.path"
    class="group relative flex flex-col overflow-hidden no-underline bg-card-muted/12 border border-border/15 rounded-[14px] p-6 pr-7 transition-all duration-250 ease hover:(-translate-y-0.5 border-accent/50 shadow-[0_8px_24px_-8px_rgba(255,107,237,0.15)]) after:content-empty after:absolute after:top-0 after:left-0 after:w-[3px] after:h-full after:bg-accent after:scale-y-0 after:origin-top after:transition-transform after:duration-300 hover:after:scale-y-100"
  >
    <span class="font-mono text-[0.6875rem] tracking-[0.12em] text-accent/5 uppercase mb-2">
      {{ approach.num }}
    </span>
    <h2 class="font-serif text-[1.375rem] font-normal text-text-base mb-2">
      {{ approach.title }}
    </h2>
    <p class="text-[0.875rem] text-text-base/6 leading-normal mb-4">
      {{ approach.description }}
    </p>
    <span class="text-[1.25rem] text-accent mt-auto opacity-0 -translate-x-1.5 transition-all duration-250 ease group-hover:(opacity-100 translate-x-0)">
      ->
    </span>
  </NuxtLink>
</div>
```

Remove `<style scoped>` block from index.vue.

### Phase 6: Convert yjs.vue Sync Dot

Replace the scoped sync dot styles. The sync dot base is handled by the `sync-dot` custom rule and dynamic classes `online`/`synced` are handled by shortcuts:

```html
<span class="sync-dot bg-text-base/20" :class="{ online: isOnline, synced: isSynced && !isOnline }" />
```

Remove `<style scoped>` block from yjs.vue.

### Phase 7: Cleanup uno.config.ts

- Remove unused `btn` and `icon-btn` shortcuts (not used anywhere)
- Remove `:root` CSS variable definitions (no longer needed)
- Verify no dead code remains

## Updated uno.config.ts Summary

```ts
// uno.config.ts
import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  preflights: [
    {
      getCSS: ({ theme }) => `
        html, body, #__nuxt { height: 100%; margin: 0; padding: 0; }
        body {
          background: #212737;
          color: #eaedf3;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `,
    },
  ],

  theme: {
    colors: {
      fill: '#212737',
      'text-base': '#eaedf3',
      accent: '#ff6bed',
      card: '#343f60',
      'card-muted': '#8a337b',
      border: '#ab4b99',
    },
  },

  shortcuts: [/* as defined in Phase 2 */],
  rules: [/* as defined in Phase 3 */],

  presets: [
    presetWind4(),
    presetAttributify(),
    presetIcons({ scale: 1.2 }),
    presetTypography(),
    presetWebFonts({
      fonts: { sans: 'DM Sans', serif: 'DM Serif Display', mono: 'DM Mono' },
      processors: createLocalFontProcessor(),
    }),
  ],

  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
```

## Files Changed

| File | Action | Effort |
|------|--------|--------|
| `uno.config.ts` | Rewrite: theme, preflights, shortcuts, rules | High |
| `app/app.vue` | Replace template classes + remove `<style>` block | High |
| `app/pages/index.vue` | Replace template classes + remove `<style scoped>` | Medium |
| `app/layouts/default.vue` | No change (already uses `min-h-screen`) | None |
| `layers/pinia/pages/pinia.vue` | Add utility classes to all elements | Medium |
| `layers/colada/pages/colada.vue` | Add utility classes to all elements | Medium |
| `layers/rstore/pages/rstore.vue` | Add utility classes to all elements | Medium |
| `layers/yjs/pages/yjs.vue` | Add utility classes + remove `<style scoped>` | Low |

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Body/html styles | UnoCSS `preflights` | Only way to style elements outside Vue templates |
| Router active state | `active-class` prop on NuxtLink | Clean, no CSS needed, works with utility classes |
| Dynamic classes (done, online, synced) | Named shortcuts | UnoCSS generates CSS for shortcut names; clean template bindings |
| Checkbox SVG | Custom UnoCSS rule | SVG data URI too complex for inline utilities |
| Pseudo-elements | Inline `before:`/`after:` variants | Keeps everything in templates; variant group makes it readable |
| Non-standard values (0.6875rem, 1.5px) | Arbitrary value syntax `[...]` | One-off values; not worth theme extensions |
| Attributify vs class | Standard `class=""` syntax | Consistency; simpler for a demo/tutorial project |

## Verification Checklist

After each phase, verify on all pages:

- [ ] Header: sticky, backdrop blur, correct background
- [ ] Navigation: links visible, active state highlighted with accent color
- [ ] Brand: serif font, hover color change
- [ ] Landing page: hero text, decorative accent bar (`::after`)
- [ ] Approach cards: hover animation (translate, shadow, left accent bar)
- [ ] Approach arrow: slide-in on card hover
- [ ] Todo card: accent stripe at top (`::before`)
- [ ] Add form: input focus ring with accent glow, button hover effects
- [ ] Checkbox: custom circular appearance, checked state with SVG checkmark
- [ ] Completed todo: strikethrough text, reduced opacity
- [ ] Delete button: hidden by default, appears on todo item hover
- [ ] Status messages: centered, monospace font
- [ ] Todo list: conditional border-top when not empty
- [ ] Yjs sync dot: green when online, yellow when synced
- [ ] Transitions: all hover/focus transitions smooth (0.15s-0.3s)
- [ ] Typography: correct font families (DM Sans, DM Serif Display, DM Mono)
- [ ] Colors: dark background, light text, pink accent throughout

## References

### Internal
- UnoCSS config: `uno.config.ts`
- Global styles: `app/app.vue:28-330`
- Landing styles: `app/pages/index.vue:40-152`
- Yjs styles: `layers/yjs/pages/yjs.vue:50-69`

### External
- [UnoCSS Theme Configuration](https://unocss.dev/config/theme)
- [UnoCSS Shortcuts](https://unocss.dev/config/shortcuts)
- [UnoCSS Custom Rules](https://unocss.dev/config/rules)
- [UnoCSS presetWind4](https://unocss.dev/presets/wind4) -- Wind4 theme key renames: `fontFamily` -> `font`, `borderRadius` -> `radius`
- [UnoCSS Preflights](https://unocss.dev/config/preflights)
- [UnoCSS Pseudo-elements](https://github.com/unocss/unocss/issues/2924) -- must use `content-empty` explicitly
- [NuxtLink activeClass](https://nuxt.com/docs/api/components/nuxt-link#activeclass)
