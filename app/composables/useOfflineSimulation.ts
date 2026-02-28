import { onScopeDispose, readonly, ref } from 'vue'

export function useOfflineSimulation() {
  const isOffline = ref(false)
  let originalFetch: typeof globalThis.fetch | null = null

  function toggleOffline() {
    if (import.meta.server)
      return

    isOffline.value = !isOffline.value

    if (isOffline.value) {
      originalFetch = globalThis.fetch
      globalThis.fetch = () => Promise.reject(new TypeError('Failed to fetch'))
      // Override navigator.onLine so libraries like @rstore/offline detect offline state
      Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true })
      window.dispatchEvent(new Event('offline'))
      return
    }

    if (originalFetch) {
      globalThis.fetch = originalFetch
      originalFetch = null
    }
    Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true })
    window.dispatchEvent(new Event('online'))
  }

  onScopeDispose(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch
      originalFetch = null
    }
    // Restore navigator.onLine
    Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true })
  })

  return {
    isOffline: readonly(isOffline),
    toggleOffline,
  }
}
