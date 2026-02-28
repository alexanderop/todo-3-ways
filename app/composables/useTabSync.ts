import { onScopeDispose, ref } from 'vue'

export interface RemoteEvent {
  action: string
  timestamp: number
}

export function useTabSync(channel: string) {
  if (import.meta.server) {
    return {
      tabCount: ref(1),
      lastRemoteEvent: ref<RemoteEvent | null>(null),
      broadcastMutation: (_action: string) => {},
    }
  }

  const tabCount = ref(1)
  const lastRemoteEvent = ref<RemoteEvent | null>(null)
  const tabId = crypto.randomUUID()
  const peers = new Map<string, number>()

  const bc = new BroadcastChannel(`todo-tabs-${channel}`)

  function pruneStale() {
    const now = Date.now()
    for (const [id, ts] of peers) {
      if (now - ts > 6000)
        peers.delete(id)
    }
    tabCount.value = peers.size + 1
  }

  interface TabMessage {
    type: string
    id: string
    action?: string
    timestamp?: number
  }

  bc.onmessage = (e: MessageEvent<TabMessage>) => {
    const { data } = e

    if (data.type === 'heartbeat') {
      peers.set(data.id, Date.now())
      pruneStale()
      return
    }

    if (data.type === 'mutation') {
      lastRemoteEvent.value = {
        action: data.action ?? 'unknown',
        timestamp: data.timestamp ?? Date.now(),
      }
    }
  }

  const heartbeatInterval = setInterval(() => {
    bc.postMessage({ type: 'heartbeat', id: tabId })
    pruneStale()
  }, 2000)

  // Send initial heartbeat
  bc.postMessage({ type: 'heartbeat', id: tabId })

  function broadcastMutation(action: string) {
    bc.postMessage({ type: 'mutation', id: tabId, action, timestamp: Date.now() })
  }

  onScopeDispose(() => {
    clearInterval(heartbeatInterval)
    bc.close()
  })

  return {
    tabCount,
    lastRemoteEvent,
    broadcastMutation,
  }
}
