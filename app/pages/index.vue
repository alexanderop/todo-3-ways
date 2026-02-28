<template>
  <div class="landing">
    <div class="landing-header">
      <h1>Todo, Three Ways</h1>
      <p>The same todo app built with three different state management approaches in Nuxt.</p>
    </div>

    <div class="approach-grid">
      <NuxtLink to="/pinia" class="approach-card">
        <span class="approach-num">01</span>
        <h2>Pinia</h2>
        <p>Manual state management</p>
        <span class="approach-go">&rarr;</span>
      </NuxtLink>

      <NuxtLink to="/colada" class="approach-card">
        <span class="approach-num">02</span>
        <h2>Pinia Colada</h2>
        <p>Keyed queries with automatic caching</p>
        <span class="approach-go">&rarr;</span>
      </NuxtLink>

      <NuxtLink to="/rstore" class="approach-card">
        <span class="approach-num">03</span>
        <h2>rstore</h2>
        <p>Local-first with Drizzle auto-generated API</p>
        <span class="approach-go">&rarr;</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.landing {
  max-width: 640px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
}

.landing-header h1 {
  font-family: 'DM Serif Display', serif;
  font-size: 2.5rem;
  font-weight: 400;
  color: rgb(var(--color-text-base));
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.landing-header p {
  font-size: 1.0625rem;
  color: rgba(var(--color-text-base), 0.45);
  margin: 0.75rem 0 0;
  line-height: 1.6;
}

.landing-header::after {
  content: '';
  display: block;
  width: 48px;
  height: 3px;
  background: rgb(var(--color-accent));
  border-radius: 2px;
  margin-top: 1.5rem;
}

.approach-grid {
  display: grid;
  gap: 1rem;
  margin-top: 3rem;
}

.approach-card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1.75rem;
  background: rgb(var(--color-card));
  border: 1px solid rgba(var(--color-border), 0.25);
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

.approach-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: rgb(var(--color-accent));
  transform: scaleY(0);
  transform-origin: top;
  transition: transform 0.3s ease;
}

.approach-card:hover {
  border-color: rgba(var(--color-accent), 0.5);
  box-shadow: 0 8px 24px -8px rgba(var(--color-accent), 0.15);
  transform: translateY(-2px);
}

.approach-card:hover::after {
  transform: scaleY(1);
}

.approach-num {
  font-family: 'DM Mono', monospace;
  font-size: 0.6875rem;
  color: rgb(var(--color-accent));
  letter-spacing: 0.12em;
}

.approach-card h2 {
  font-family: 'DM Serif Display', serif;
  font-size: 1.375rem;
  font-weight: 400;
  margin: 0.5rem 0 0;
  color: rgb(var(--color-text-base));
}

.approach-card > p {
  font-size: 0.875rem;
  color: rgba(var(--color-text-base), 0.4);
  margin: 0.375rem 0 0;
  line-height: 1.5;
}

.approach-go {
  margin-top: 1.25rem;
  font-size: 1.25rem;
  color: rgb(var(--color-accent));
  opacity: 0;
  transform: translateX(-6px);
  transition: all 0.25s ease;
}

.approach-card:hover .approach-go {
  opacity: 1;
  transform: translateX(0);
}
</style>
