<script setup lang="ts">
const features = [
  {
    label: 'Works offline',
    pinia: false,
    colada: false,
    rstore: true,
    yjs: true,
  },
  {
    label: 'Multi-tab sync',
    pinia: false,
    colada: false,
    rstore: false,
    yjs: true,
  },
  {
    label: 'Conflict resolution',
    pinia: false,
    colada: false,
    rstore: false,
    yjs: true,
    yjsNote: 'CRDT',
  },
  {
    label: 'Real-time updates',
    pinia: false,
    colada: false,
    rstore: false,
    yjs: true,
  },
  {
    label: 'Auto-generated API',
    pinia: false,
    colada: false,
    rstore: true,
    yjs: false,
  },
  {
    label: 'Caching',
    pinia: false,
    colada: true,
    rstore: true,
    yjs: true,
    yjsNote: 'local',
  },
  {
    label: 'Optimistic updates',
    pinia: false,
    colada: false,
    rstore: true,
    yjs: true,
  },
]

const approaches = ['Pinia', 'Colada', 'rstore', 'Yjs'] as const
const keys = ['pinia', 'colada', 'rstore', 'yjs'] as const
</script>

<template>
  <div class="mt-16">
    <h2 class="text-[1.5rem] text-text-base tracking-[-0.01em] font-normal font-serif mb-6">
      Feature Comparison
    </h2>

    <div class="border border-border/25 rounded-xl overflow-x-auto">
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="matrix-th text-left">
              Feature
            </th>
            <th v-for="a in approaches" :key="a" class="matrix-th text-center">
              {{ a }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in features" :key="f.label" class="matrix-row">
            <td class="text-[0.8125rem] font-mono matrix-td">
              {{ f.label }}
            </td>
            <td
              v-for="k in keys"
              :key="k"
              class="matrix-td text-center"
            >
              <span v-if="f[k]" class="text-xs text-green-400 font-mono">
                yes<span v-if="k === 'yjs' && f.yjsNote" class="text-text-base/30 ml-0.5">({{ f.yjsNote }})</span>
              </span>
              <span v-else class="text-xs text-text-base/20 font-mono">&mdash;</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-10 p-6 border border-border/25 rounded-xl bg-card/50">
      <h3 class="text-[1.125rem] text-text-base font-normal font-serif mb-3 mt-0">
        How to explore
      </h3>
      <ul class="text-[0.8125rem] text-text-base/50 leading-relaxed font-mono m-0 p-0 list-none space-y-2">
        <li>
          <span class="text-accent mr-1.5">1.</span>
          Toggle <strong class="text-text-base/70">offline mode</strong> on each page to see which approaches keep working without a server.
        </li>
        <li>
          <span class="text-accent mr-1.5">2.</span>
          Open the same page in <strong class="text-text-base/70">two browser tabs</strong> to see which approaches sync changes in real time.
        </li>
      </ul>
    </div>
  </div>
</template>
