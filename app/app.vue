<template>
  <NuxtLayout>
    <header class="app-header">
      <div class="header-inner">
        <NuxtLink to="/" class="brand">
          Todo 3 Ways
        </NuxtLink>
        <nav class="app-nav">
          <NuxtLink to="/pinia" class="nav-link">
            Pinia
          </NuxtLink>
          <NuxtLink to="/colada" class="nav-link">
            Colada
          </NuxtLink>
          <NuxtLink to="/rstore" class="nav-link">
            rstore
          </NuxtLink>
        </nav>
      </div>
    </header>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
:root {
  --color-fill: 33, 39, 55;
  --color-text-base: 234, 237, 243;
  --color-accent: 255, 107, 237;
  --color-card: 52, 63, 96;
  --color-card-muted: 138, 51, 123;
  --color-border: 171, 75, 153;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#__nuxt {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'DM Sans', sans-serif;
  background: rgb(var(--color-fill));
  color: rgb(var(--color-text-base));
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html.dark {
  color-scheme: dark;
}

/* ── Header ── */

.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(var(--color-fill), 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(var(--color-border), 0.25);
}

.header-inner {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  font-family: 'DM Serif Display', serif;
  font-size: 1.125rem;
  color: rgb(var(--color-text-base));
  text-decoration: none;
  letter-spacing: -0.01em;
  transition: color 0.2s;
}

.brand:hover {
  color: rgba(var(--color-text-base), 0.6);
}

.app-nav {
  display: flex;
  gap: 0.25rem;
}

.nav-link {
  font-family: 'DM Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  text-decoration: none;
  color: rgba(var(--color-text-base), 0.35);
  transition: all 0.2s;
}

.nav-link:hover {
  color: rgba(var(--color-text-base), 0.7);
}

.nav-link.router-link-active {
  color: rgb(var(--color-accent));
  background: rgba(var(--color-accent), 0.1);
}

/* ── Todo App Layout ── */

.todo-app {
  max-width: 640px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
}

.todo-app h1 {
  font-family: 'DM Serif Display', serif;
  font-size: 2rem;
  font-weight: 400;
  color: rgb(var(--color-text-base));
  margin: 0;
  letter-spacing: -0.02em;
}

.subtitle {
  font-family: 'DM Mono', monospace;
  font-size: 0.8rem;
  color: rgba(var(--color-text-base), 0.35);
  margin: 0.375rem 0 0;
  letter-spacing: 0.03em;
}

/* ── Todo Card ── */

.todo-card {
  margin-top: 2rem;
  background: rgb(var(--color-card));
  border: 1px solid rgba(var(--color-border), 0.25);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.todo-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgb(var(--color-accent));
}

/* ── Add Form ── */

.add-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0;
}

.add-form input {
  flex: 1;
  padding: 0.6875rem 1rem;
  border: 1.5px solid rgba(var(--color-border), 0.25);
  border-radius: 10px;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9375rem;
  color: rgb(var(--color-text-base));
  background: rgba(var(--color-fill), 0.6);
  transition: all 0.2s;
  outline: none;
}

.add-form input::placeholder {
  color: rgba(var(--color-text-base), 0.25);
}

.add-form input:focus {
  border-color: rgb(var(--color-accent));
  background: rgba(var(--color-fill), 0.8);
  box-shadow: 0 0 0 3px rgba(var(--color-accent), 0.12);
}

.add-form button {
  padding: 0.6875rem 1.25rem;
  background: rgb(var(--color-accent));
  color: rgb(var(--color-fill));
  border: none;
  border-radius: 10px;
  font-family: 'DM Mono', monospace;
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.add-form button:hover {
  background: rgba(var(--color-accent), 0.85);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(var(--color-accent), 0.3);
}

.add-form button:active {
  transform: translateY(0);
}

/* ── Todo List ── */

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.todo-list:not(:empty) {
  margin-top: 1rem;
  border-top: 1px solid rgba(var(--color-border), 0.15);
  padding-top: 0.25rem;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  margin: 0.125rem -0.75rem;
  border-radius: 8px;
  transition: background 0.15s;
}

.todo-item:hover {
  background: rgba(var(--color-card-muted), 0.12);
}

/* Custom Checkbox */

.todo-item input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(var(--color-border), 0.4);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.todo-item input[type="checkbox"]:hover {
  border-color: rgb(var(--color-accent));
}

.todo-item input[type="checkbox"]:checked {
  background: rgb(var(--color-accent));
  border-color: rgb(var(--color-accent));
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='%23212737' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E");
  background-size: 12px;
  background-position: center;
  background-repeat: no-repeat;
}

.todo-item span {
  font-size: 0.9375rem;
  color: rgb(var(--color-text-base));
  transition: all 0.2s;
}

.todo-item .done {
  text-decoration: line-through;
  color: rgba(var(--color-text-base), 0.25);
}

.todo-item .delete {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(var(--color-text-base), 0.2);
  cursor: pointer;
  font-size: 0.8125rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: all 0.15s;
  opacity: 0;
}

.todo-item:hover .delete {
  opacity: 1;
}

.todo-item .delete:hover {
  color: rgb(var(--color-accent));
  background: rgba(var(--color-accent), 0.1);
}

/* ── Status ── */

.status {
  font-family: 'DM Mono', monospace;
  font-size: 0.8125rem;
  color: rgba(var(--color-text-base), 0.35);
  margin: 1.5rem 0 0;
  text-align: center;
}

.status.error {
  color: rgb(var(--color-accent));
}
</style>
