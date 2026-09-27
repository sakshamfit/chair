import { Box3, BufferAttribute, BufferGeometry, Group, Mesh, Vector3, type Material, type Object3D } from 'three'
import { mergeBySlot, type ChairPayload } from './merge'
import { getCached, putCached } from './geoCache'
import { buildFamily, type ChairType } from './families'
import { materialFor, type MaterialSpec, type Slot } from '../materials'
import { bakeContactShadow, type BakedShadow } from '../contactShadow'
import { engine, type Engine } from '../engine'
import { ptime } from '../../lib/ptime'

export type { ChairType }
export type Lod = 'high' | 'low'

export interface ChairShape { type: ChairType; arms: boolean }

const templates = new Map<string, Group>()
const shadows = new WeakMap<Engine, Map<string, BakedShadow>>()
const bounds = new Map<string, Box3>()

const keyOf = (s: ChairShape, lod: Lod) => `${s.type}|${s.arms ? 1 : 0}|${lod}`

function store(k: string, t: Group) {
  templates.set(k, t)
  bounds.set(k, new Box3().setFromObject(t))
  return t
}

/** Synchronous build — only a fallback; normally templates arrive from the workers. */
function template(shape: ChairShape, lod: Lod) {
  const k = keyOf(shape, lod)
  return templates.get(k) ?? store(k, ptime('build(main):' + k, () => mergeBySlot(buildFamily(shape.type, lod === 'high' ? 1 : 0.55, { arms: shape.arms }))))
}

/* ------------------------------------------------------------------------
 * Geometry workers: chair models are built and merged off the main thread,
 * in parallel, and arrive as transferable vertex buffers.
 * ---------------------------------------------------------------------- */
const pool: Worker[] = []
let nextWorker = 0
let nextId = 0
const waiting = new Map<number, (d: { payload?: ChairPayload; error?: string }) => void>()
const inflight = new Map<string, Promise<void>>()

function worker() {
  const size = Math.min(3, Math.max(1, (navigator.hardwareConcurrency || 4) - 2))
  if (pool.length < size) {
    const w = new Worker(new URL('./geoWorker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<{ id: number; payload?: ChairPayload; error?: string }>) => {
      const cb = waiting.get(e.data.id)
      waiting.delete(e.data.id)
      cb?.(e.data)
    }
    pool.push(w)
    return w
  }
  return pool[nextWorker++ % pool.length]
}

function fromPayload(p: ChairPayload) {
  const g = new Group()
  for (const m of p.meshes) {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(m.position, 3))
    geo.setAttribute('normal', new BufferAttribute(m.normal, 3))
    geo.setAttribute('uv', new BufferAttribute(m.uv, 2))
    geo.setIndex(new BufferAttribute(m.index, 1))
    geo.computeBoundingSphere()
    const mesh = new Mesh(geo)
    mesh.userData.slot = m.slot
    mesh.castShadow = true
    mesh.renderOrder = m.renderOrder
    g.add(mesh)
  }
  return g
}

/**
 * Resolves once the chair's geometry is ready: from the persistent cache when it
 * has been built before, otherwise built in a worker. Never blocks the page.
 */
export function ensureTemplate(shape: ChairShape, lod: Lod = 'low'): Promise<void> {
  const k = keyOf(shape, lod)
  if (templates.has(k)) return Promise.resolve()
  let p = inflight.get(k)
  if (!p) {
    p = getCached(k).then((cached) => {
      if (cached) {
        if (!templates.has(k)) store(k, fromPayload(cached))
        inflight.delete(k)
        return
      }
      return buildInWorker(shape, lod, k)
    })
    inflight.set(k, p)
  }
  return p
}

function buildInWorker(shape: ChairShape, lod: Lod, k: string) {
  {
    return new Promise<void>((resolve) => {
      const id = nextId++
      waiting.set(id, (d) => {
        if (!templates.has(k)) {
          if (d.payload) { store(k, fromPayload(d.payload)); putCached(k, d.payload) }
          else { console.warn('[chairs] worker build failed, building on main thread', d.error); template(shape, lod) }
        }
        inflight.delete(k)
        resolve()
      })
      try {
        worker().postMessage({ id, type: shape.type, arms: shape.arms, q: lod === 'high' ? 1 : 0.55 })
      } catch {
        waiting.delete(id)
        template(shape, lod)
        inflight.delete(k)
        resolve()
      }
    })
  }
}

/** The chair's baked contact shadow (textures + floor planes), cached per engine. */
export function bakedShadow(shape: ChairShape, eng: Engine = engine) {
  const sk = keyOf(shape, 'low')
  let perEngine = shadows.get(eng)
  if (!perEngine) { perEngine = new Map(); shadows.set(eng, perEngine) }
  let s = perEngine.get(sk)
  if (!s && eng.renderer) {
    s = ptime('bake:' + sk, () => bakeContactShadow(eng.renderer!, template(shape, 'low')))
    perEngine.set(sk, s)
  }
  return s
}

export const hasBakedShadow = (shape: ChairShape, eng: Engine = engine) => !!shadows.get(eng)?.get(keyOf(shape, 'low'))

/** Prepare a chair's geometry ahead of time (worker-built) — used by the idle warm-up. */
export const prebuild = (shape: ChairShape, lod: Lod = 'low') => ensureTemplate(shape, lod)

export function shapeBounds(shape: ChairShape, lod: Lod = 'low') {
  template(shape, lod)
  return bounds.get(keyOf(shape, lod))!.clone()
}

/** Apply a material spec to every slot-tagged mesh. */
export function applyMaterials(root: Object3D, spec: MaterialSpec, overrides: Partial<Record<Slot, Material>> = {}) {
  root.traverse((o) => {
    const m = o as Mesh
    const slot = m.userData?.slot as Slot | undefined
    if (m.isMesh && slot) m.material = overrides[slot] ?? materialFor(slot, spec)
  })
}

/**
 * Returns a new chair instance (geometry shared, materials resolved from spec).
 * Chair stands on y = 0, centred on x/z, facing +z.
 */
export function createChair(shape: ChairShape, spec: MaterialSpec, lod: Lod = 'low', opts: { contactShadow?: boolean; engine?: Engine } = {}) {
  const t = template(shape, lod)
  const chair = t.clone(true)
  applyMaterials(chair, spec)
  const root = new Group()
  root.add(chair)
  root.userData.chair = chair
  if (opts.contactShadow) {
    const s = bakedShadow(shape, opts.engine ?? engine)?.plane
    if (s) {
      const shadow = s.clone(true)
      chair.add(shadow)
      root.userData.shadow = shadow
    }
  }
  return root
}

export function chairSize(shape: ChairShape) {
  const b = shapeBounds(shape)
  return b.getSize(new Vector3())
}

export function chairCenter(shape: ChairShape) {
  const b = shapeBounds(shape)
  return b.getCenter(new Vector3())
}

/* ---------------------------------------------------------------------------
 * Real models. When a product defines `modelUrl`, the GLB/GLTF is loaded,
 * normalised to stand on y = 0 at real-world scale (height ≈ targetHeight),
 * and swapped in for the procedural chair. Loader is code-split.
 * ------------------------------------------------------------------------- */
const glbCache = new Map<string, Promise<Group>>()

export function loadModel(url: string, targetHeight: number) {
  let p = glbCache.get(url)
  if (!p) {
    p = import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) =>
      new GLTFLoader().loadAsync(url).then((gltf) => {
        const g = new Group()
        const m = gltf.scene
        const b = new Box3().setFromObject(m)
        const s = b.getSize(new Vector3())
        m.scale.setScalar(targetHeight / Math.max(s.y, 1e-3))
        const b2 = new Box3().setFromObject(m)
        const c = b2.getCenter(new Vector3())
        m.position.set(-c.x, -b2.min.y, -c.z)
        m.traverse((o) => { if ((o as Mesh).isMesh) o.castShadow = true })
        g.add(m)
        return g
      }),
    )
    glbCache.set(url, p)
  }
  return p.then((g) => g.clone(true))
}

export function attachShadow(obj: Object3D, eng: Engine = engine) {
  if (!eng.renderer) return
  obj.add(bakeContactShadow(eng.renderer, obj).plane)
}
