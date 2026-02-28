<template>
  <NuxtLayout>
    <header class="app-header">
      <div class="header-inner">
        <NuxtLink to="/" class="brand">
          Todo 4 Ways
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
        </nav>
      </div>
    </header>
    <NuxtPage />
  </NuxtLayout>
</template>
