import type { ChairPayload } from './merge'

/**
 * Persistent cache of built chair geometry (IndexedDB). Chairs are procedural and
 * deterministic, so a model built once never needs rebuilding: on reloads and
 * return visits the hero's chairs load in milliseconds instead of being rebuilt
 * by the workers. Bump GEOMETRY_VERSION whenever the chair-building code changes.
 * Disabled in development so model edits always show immediately.
 */
export const GEOMETRY_VERSION = 4
const DB = 'chesselle-geometry'
const STORE = 'chairs'
const enabled = !import.meta.env.DEV && typeof indexedDB !== 'undefined'

let dbp: Promise<IDBDatabase | null> | null = null
function db() {
  if (!enabled) return Promise.resolve(null)
  if (!dbp) {
    dbp = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB, GEOMETRY_VERSION)
        req.onupgradeneeded = () => {
          const d = req.result
          if (d.objectStoreNames.contains(STORE)) d.deleteObjectStore(STORE) // new geometry version: start fresh
          d.createObjectStore(STORE)
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
        req.onblocked = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }
  return dbp
}

export async function getCached(key: string): Promise<ChairPayload | null> {
  const d = await db()
  if (!d) return null
  return new Promise((resolve) => {
    try {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(key)
      req.onsuccess = () => resolve((req.result as ChairPayload) ?? null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function putCached(key: string, payload: ChairPayload) {
  const d = await db()
  if (!d) return
  try {
    d.transaction(STORE, 'readwrite').objectStore(STORE).put(payload, key)
  } catch {
    /* quota or private mode — caching is best-effort */
  }
}
