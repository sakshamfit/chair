import { Group, PerspectiveCamera } from 'three'
import { engine } from './engine'
import { bakedShadow, createChair, prebuild, type ChairShape } from './chairs'
import { makeFadeable } from './entrance'
import { prepareBake } from './contactShadow'
import { scheduleAsync } from './scheduler'
import { products, specFor } from '../data/products'
import { firstScreenDone } from './firstScreen'

/**
 * Idle-time warm-up. After the first screen is up, quietly prepare everything the
 * visitor might scroll to or click next, so nothing has to be built or compiled
 * mid-scroll:
 *   1. every chair's geometry (both armrest configurations)
 *   2. every contact-shadow bake
 *   3. every material/shader variant — opaque (product stages) and fading
 *      (finder floor) — compiled in parallel via KHR_parallel_shader_compile
 *   4. the high-detail models for the featured sections, then the rest
 * Each step runs in browser idle time, one small job at a time.
 */
let started = false

export function scheduleWarmup(delay = 250) {
  if (started) return
  started = true
  firstScreenDone.then(() => setTimeout(() => { warmup().catch((e) => console.warn('[warmup]', e)) }, delay))
}

async function warmup() {
  const r = engine.init()
  if (!r) return
  const shapes = new Map<string, ChairShape>()
  for (const p of products) for (const c of p.configs) shapes.set(`${p.type}|${c.arms}`, { type: p.type, arms: c.arms })

  // 1 + 2 — geometry and shadow bakes
  await prepareBake(r)
  for (const shape of shapes.values()) await prebuild(shape)
  for (const shape of shapes.values()) await scheduleAsync(() => bakedShadow(shape))

  // 3 — one representative per material variant, compiled with the standard studio lights
  const lights = engine.createScene()
  const cam = new PerspectiveCamera(26, 1, 0.05, 40)
  const batches = products.map((p) => {
    const g = new Group()
    const shape = { type: p.type, arms: p.configs[0].arms }
    for (const f of p.frames) g.add(createChair(shape, specFor(p, p.colors[0].id, f.id), 'low', { contactShadow: true }))
    const fading = createChair(shape, specFor(p), 'low', { contactShadow: true })
    makeFadeable(fading)(0.5)
    g.add(fading)
    return g
  })
  await engine.prepareBatched(batches, cam, lights, true)

  // 4 — high-detail models: featured first, then everything else
  const order = ['onyx', 'elevate', ...products.map((p) => p.slug)]
  const done = new Set<string>()
  for (const slug of order) {
    const p = products.find((x) => x.slug === slug)
    if (!p || done.has(slug)) continue
    done.add(slug)
    for (const c of p.configs) await prebuild({ type: p.type, arms: c.arms }, 'high')
  }
}
