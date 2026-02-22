import 'server-only'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

export function createTTLCache<T>(maxSize: number, ttlMs: number) {
  const cache = new Map<string, CacheEntry<T>>()

  return {
    get(key: string): T | null {
      const entry = cache.get(key)
      if (!entry) return null
      if (Date.now() - entry.timestamp > ttlMs) {
        cache.delete(key)
        return null
      }
      return entry.data
    },

    set(key: string, data: T): void {
      if (cache.size >= maxSize) {
        const oldestKey = cache.keys().next().value
        if (oldestKey) cache.delete(oldestKey)
      }
      cache.set(key, { data, timestamp: Date.now() })
    },
  }
}
