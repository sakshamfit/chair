import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Group, Mesh } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Slot } from '../materials'

/**
 * Collapse a built chair (often 40+ parts: every leg, boss, wheel, hood…) into one
 * mesh per material slot. Same look, ~6× fewer draw calls per chair.
 * Pure geometry — runs on the main thread or inside the geometry workers.
 */
export function mergeBySlot(root: Group) {
  root.updateMatrixWorld(true)
  const bySlot = new Map<Slot, BufferGeometry[]>()
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const slot = m.userData.slot as Slot
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld)
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name)
    if (!g.getAttribute('uv')) g.setAttribute('uv', new Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2))
    if (!g.index) {
      const n = g.getAttribute('position').count
      const idx = new Uint32Array(n)
      for (let i = 0; i < n; i++) idx[i] = i
      g.setIndex(new BufferAttribute(idx, 1))
    }
    let list = bySlot.get(slot)
    if (!list) bySlot.set(slot, (list = []))
    list.push(g)
  })
  const out = new Group()
  for (const [slot, list] of bySlot) {
    const merged = mergeGeometries(list, false)
    list.forEach((g) => g.dispose())
    if (!merged) continue
    const mesh = new Mesh(merged)
    mesh.userData.slot = slot
    mesh.castShadow = true
    if (slot === 'mesh') mesh.renderOrder = 2
    out.add(mesh)
  }
  return out
}

/** Transferable description of a merged chair (one entry per material slot). */
export interface ChairPayload {
  meshes: { slot: Slot; renderOrder: number; position: Float32Array; normal: Float32Array; uv: Float32Array; index: Uint32Array | Uint16Array }[]
}

export function toPayload(g: Group): { payload: ChairPayload; transfer: ArrayBuffer[] } {
  const payload: ChairPayload = { meshes: [] }
  const transfer: ArrayBuffer[] = []
  for (const child of g.children) {
    const m = child as Mesh
    const geo = m.geometry
    const position = geo.getAttribute('position').array as Float32Array
    const normal = geo.getAttribute('normal').array as Float32Array
    const uv = geo.getAttribute('uv').array as Float32Array
    const index = geo.index!.array as Uint32Array | Uint16Array
    payload.meshes.push({ slot: m.userData.slot as Slot, renderOrder: m.renderOrder, position, normal, uv, index })
    for (const a of [position, normal, uv, index]) if (!transfer.includes(a.buffer as ArrayBuffer)) transfer.push(a.buffer as ArrayBuffer)
  }
  return { payload, transfer }
}
