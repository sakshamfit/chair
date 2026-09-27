/// <reference lib="webworker" />
/**
 * Geometry worker: builds and merges chair models entirely off the main thread.
 * Receives { id, type, arms, q } and replies with transferable vertex buffers.
 */
import { buildFamily, type ChairType } from './families'
import { mergeBySlot, toPayload } from './merge'

self.onmessage = (e: MessageEvent<{ id: number; type: ChairType; arms: boolean; q: number }>) => {
  const { id, type, arms, q } = e.data
  try {
    const { payload, transfer } = toPayload(mergeBySlot(buildFamily(type, q, { arms })))
    ;(self as unknown as Worker).postMessage({ id, payload }, transfer)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ id, error: String(err) })
  }
}
