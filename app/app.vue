<template>
  <NuxtLayout>
    <header class="app-header">
      <div class="header-inner">
        <NuxtLink to="/" class="brand">
          Todo 6 Ways
        </NuxtLink>
        <nav class="app-nav">
          <NuxtLink to="/pinia" class="nav-link" active-class="nav-link-active">
            Pinia
          </NuxtLink>
          <NuxtLink to="/colada" class="nav-link" active-class="nav-link-active">
            Colada
          </NuxtLink>
          <NuxtLink to="/rstore" class="nav-link" active-class="nav-link-active">
            rstore
          </NuxtLink>
          <NuxtLink to="/yjs" class="nav-link" active-class="nav-link-active">
            Yjs
          </NuxtLink>
          <NuxtLink to="/tanstack-db" class="nav-link" active-class="nav-link-active">
            TanStack DB
          </NuxtLink>
          <NuxtLink to="/livestore" class="nav-link" active-class="nav-link-active">
            LiveStore
          </NuxtLink>
        </nav>
      </div>
    </header>
    <NuxtPage />
  </NuxtLayout>
</template>
