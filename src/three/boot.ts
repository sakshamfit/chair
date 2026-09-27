import { DataTexture, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry } from 'three'
import { engine } from './engine'
import { bakedShadow, ensureTemplate } from './chairs'
import { prepareBake } from './contactShadow'
import { schedule } from './scheduler'
import { materialFor, type Slot } from './materials'
import { fadeVariant } from './entrance'
import { pickLayout } from './heroScene'
import { bySlug, products, shapeFor, specFor } from '../data/products'

/**
 * Starts the 3D pipeline the moment the app boots — in parallel with React's first
 * render — so that by the time the hero mounts, its chairs, shadows and shaders are
 * (nearly) ready:
 *   • renderer + reflection environment (worker-decoded)
 *   • hero geometry (geometry workers)
 *   • every catalogue material compiled in parallel — opaque and fading variants —
 *     (shader programs don't depend on the mesh, so one small plane each is enough)
 *   • contact-shadow bakes for the hero chairs
 */
let booted = false

const SLOTS: Slot[] = ['upholstery', 'frame', 'shell', 'accent', 'plastic', 'rubber', 'chrome', 'mesh', 'wood']

export function bootEngine() {
  if (booted) return
  booted = true
  const r = engine.init()
  if (!r) return

  // hero chairs for the current layout (or, off the homepage, nothing hero-specific)
  const home = import.meta.env.BASE_URL.replace(/\/$/, '').toLowerCase()
  const heroSlots = location.pathname.replace(/\/$/, '').toLowerCase() === home ? pickLayout(innerWidth, innerHeight).slots : []
  const heroShapes = heroSlots.map((s) => bySlug(s.slug)).filter((p): p is NonNullable<typeof p> => !!p).map((p) => shapeFor(p))
  const templates = Promise.all(heroShapes.map((s) => ensureTemplate(s)))

  // The materials the first screen needs — opaque and fading — on tiny planes,
  // compiled with the studio lights. (The rest of the catalogue is prepared in idle
  // time by the warm-up, so start-up work stays focused on what is seen first.)
  const lights = engine.createScene()
  const cam = new PerspectiveCamera(30, 1, 0.1, 10)
  const batches: Group[] = []
  const plane = new PlaneGeometry(0.01, 0.01)
  const seen = new Set<unknown>()
  const firstScreen = heroSlots.length
    ? heroSlots.map((s) => { const p = bySlug(s.slug)!; return { p, color: p.colors[s.color % p.colors.length].id } })
    : products.map((p) => ({ p, color: p.colors[0].id }))
  for (const { p, color } of firstScreen) {
    const spec = specFor(p, color)
    for (const slot of SLOTS) {
      if (slot === 'mesh' && p.type !== 'task-mesh') continue
      if ((slot === 'shell' || slot === 'accent') && !spec.shell) continue
      if (slot === 'wood' && spec.frame !== 'oak' && spec.frame !== 'walnut') continue
      const m = materialFor(slot, spec)
      if (seen.has(m)) continue
      seen.add(m)
      const g = new Group()
      g.add(new Mesh(plane, m), new Mesh(plane, fadeVariant(m)))
      batches.push(g)
    }
  }
  // contact-shadow planes (a map + transparency) share one program
  const shadowPlane = new Group()
  shadowPlane.add(new Mesh(plane, new MeshBasicMaterial({ map: new DataTexture(new Uint8Array(4), 1, 1), color: 0x000000, transparent: true, depthWrite: false })))
  batches.unshift(shadowPlane)
  engine.ready.then(() => engine.prepareBatched(batches, cam, lights))

  // shadow bakes once geometry and bake shaders are ready (one per frame)
  Promise.all([templates, prepareBake(r)]).then(() => {
    for (const s of heroShapes) schedule(() => bakedShadow(s), true)
  })
}
