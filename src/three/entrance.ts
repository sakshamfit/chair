import type { Material, Mesh, Object3D } from 'three'

/**
 * Shared vocabulary for chair entrances: every chair rises gently from
 * below while fading in, then settles and starts to turn.
 */

/** Product stages (cards, product page). */
export const ENTER_MS = 1100
/** Hero / finder chairs. */
export const HERO_ENTER_MS = 1250

/** Smooth, long deceleration — no snap at the start or the end. */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)
export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** A fading copy of a material (for pre-compiling the fade shader variants). */
export function fadeVariant(m: Material) {
  const c = m.clone()
  if (!m.transparent) { c.transparent = true; c.depthWrite = true }
  return c
}

/**
 * Gives this chair instance transparent copies of its materials (textures stay
 * shared) so it can fade independently. When the fade completes (opacity 1) the
 * shared *opaque* originals are restored — opaque surfaces draw front-to-back with
 * early depth rejection, which is far cheaper on the GPU than transparent ones.
 * Both variants are pre-compiled at boot, so neither switch costs a frame.
 */
export function makeFadeable(root: Object3D) {
  const meshes: { mesh: Mesh; orig: Material; fade: Material; base: number }[] = []
  const seen = new Map<Material, Material>()
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || Array.isArray(mesh.material)) return
    const orig = mesh.material as Material
    let c = seen.get(orig)
    if (!c) { c = fadeVariant(orig); seen.set(orig, c) }
    meshes.push({ mesh, orig, fade: c, base: orig.opacity })
    mesh.material = c
  })
  let last = -1
  let restored = false
  return (opacity: number) => {
    if (Math.abs(opacity - last) < 0.002) return
    last = opacity
    if (opacity >= 1) {
      if (!restored) { restored = true; for (const x of meshes) x.mesh.material = x.orig }
      return
    }
    if (restored) { restored = false; for (const x of meshes) x.mesh.material = x.fade }
    for (const x of meshes) (x.mesh.material as Material).opacity = x.base * opacity
  }
}

/**
 * A frame-driven entrance clock: it only advances on frames that were actually
 * drawn (clamped to ~30 fps steps) and skips the first frame, which usually
 * absorbs shader compilation — so the motion is never half-finished by the time
 * it becomes visible.
 */
export class EntranceClock {
  ms = 0
  private frames = 0
  tick(dt: number) {
    this.frames++
    if (this.frames > 2) this.ms += Math.min(dt, 1 / 30) * 1000
    return this.ms
  }
}
