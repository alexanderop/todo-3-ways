<script setup lang="ts">
const approaches = [
  { num: '01', title: 'Pinia', description: 'Manual state management', path: '/pinia' },
  { num: '02', title: 'Pinia Colada', description: 'Keyed queries with automatic caching', path: '/colada' },
  { num: '03', title: 'rstore', description: 'Local-first with Drizzle auto-generated API', path: '/rstore' },
  { num: '04', title: 'Yjs', description: 'Local-first CRDT with offline sync', path: '/yjs' },
]
</script>

<template>
  <div class="mx-auto px-6 pb-16 pt-16 max-w-[640px]">
    <div class="mb-12 after:(mt-6 rounded-sm bg-accent h-[3px] w-12 block content-empty)">
      <h1 class="text-[2.5rem] text-text-base leading-[1.15] tracking-[-0.02em] font-normal font-serif m-0">
        Todo, Four Ways
      </h1>
      <p class="text-[1.0625rem] text-text-base/45 leading-relaxed mb-0 mt-3">
        The same todo app built with four different state management approaches in Nuxt.
      </p>
    </div>

    <div class="mt-12 gap-4 grid">
      <NuxtLink
        v-for="approach in approaches"
        :key="approach.path"
        :to="approach.path"
        class="group text-inherit p-6 pr-7 border border-border/25 rounded-[14px] bg-card no-underline flex flex-col transition-all duration-250 ease relative overflow-hidden hover:(border-accent/50 shadow-[0_8px_24px_-8px_rgba(255,107,237,0.15)] -translate-y-0.5 after:scale-y-100) after:(bg-accent h-full w-[3px] content-empty origin-top scale-y-0 transition-transform duration-300 ease left-0 top-0 absolute)"
      >
        <span class="text-[0.6875rem] text-accent tracking-[0.12em] font-mono uppercase">
          {{ approach.num }}
        </span>
        <h2 class="text-[1.375rem] text-text-base font-normal font-serif mb-0 mt-2">
          {{ approach.title }}
        </h2>
        <p class="text-[0.875rem] text-text-base/40 leading-normal mb-0 mt-1.5">
          {{ approach.description }}
        </p>
        <span class="text-[1.25rem] text-accent mt-5 opacity-0 transition-all duration-250 ease group-hover:(opacity-100 translate-x-0) -translate-x-1.5">
          &rarr;
        </span>
      </NuxtLink>
    </div>

    <FeatureMatrix />
  </div>
</template>
