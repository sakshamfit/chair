import { useSyncExternalStore } from 'react'

const q = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

export const prefersReducedMotion = () => !!q?.matches

export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => { q?.addEventListener('change', cb); return () => q?.removeEventListener('change', cb) },
    () => !!q?.matches,
    () => false,
  )
}

const mq = (query: string) => (typeof window !== 'undefined' ? window.matchMedia(query) : null)

export function useMedia(query: string) {
  const m = mq(query)
  return useSyncExternalStore(
    (cb) => { m?.addEventListener('change', cb); return () => m?.removeEventListener('change', cb) },
    () => !!m?.matches,
    () => false,
  )
}
