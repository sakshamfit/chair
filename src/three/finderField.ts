import { Group, Mesh, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three'
import { engine, type Stage } from './engine'
import { chairSize, createChair, ensureTemplate } from './chairs'
import { Turntable } from './turntable'
import { ENTER_MS, EntranceClock, easeOutCubic, makeFadeable, smoothstep } from './entrance'
import { schedule } from './scheduler'
import { prepareBake } from './contactShadow'
import { products, shapeFor, specFor, type Product } from '../data/products'

/**
 * The showroom floor: every chair stands on a near-white floor, each on its
 * own slow turntable. As the visitor answers questions, matching chairs grow
 * and step forward; poor matches recede. Layout is authored in screen space
 * (NDC) and projected onto the floor, so it holds at every aspect ratio.
 */

type P = [string, number, number]
// [slug, nx, ny] — bottom-centre is reserved for the finder card
const WIDE: P[] = [
  ['nova', -0.82, 0.8], ['loft', -0.3, 0.86], ['vera', 0.22, 0.82], ['jara', 0.78, 0.84],
  ['elevate', -0.72, 0.34], ['clova', -0.14, 0.42], ['onyx', 0.6, 0.36],
]
const NARROW: P[] = [
  ['nova', -0.64, 0.9], ['vera', 0.0, 0.92], ['loft', 0.64, 0.9],
  ['jara', -0.64, 0.5], ['clova', 0.0, 0.52], ['onyx', 0.64, 0.5],
]

interface Item {
  p: Product; root: Group; tt: Turntable; nx: number; ny: number; scale: number; vel: number; target: number; base: number
  world: Vector3; screen: Vector2; r: number
  clock: EntranceClock; delay: number; setOpacity: ((o: number) => void) | null; settled: boolean
}

export class FinderField {
  stage: Stage
  cam = new PerspectiveCamera(24, 1, 0.5, 80)
  items: Item[] = []
  private layout = ''
  private ray = new Raycaster()
  private floor = new Plane(new Vector3(0, 1, 0), 0)
  private hover = -1
  private reduced: boolean
  onHover?: (p: Product | null, x: number, y: number) => void
  onPick?: (p: Product) => void
  scores = new Map<string, number>()
  focusOnly: string[] | null = null
  private sizeK = 1

  constructor(public el: HTMLElement, opts: { reduced: boolean; surface: string | null }) {
    this.reduced = opts.reduced
    const scene = engine.createScene({ envIntensity: 0.55 })
    this.cam.position.set(0, 5.2, 9.5)
    this.cam.lookAt(0, 0.2, 0)
    this.stage = {
      el, scene, camera: this.cam, clear: opts.surface,
      resize: (w, h) => this.resize(w, h),
      update: (dt) => this.update(dt),
    }
  }

  mount() {
    if (!engine.add(this.stage)) return false
    this.el.addEventListener('pointermove', this.onMove)
    this.el.addEventListener('pointerleave', this.onLeave)
    this.el.addEventListener('click', this.onClick)
    return true
  }

  dispose() {
    this.token++
    this.jobs.forEach((c) => c())
    engine.remove(this.stage)
    this.el.removeEventListener('pointermove', this.onMove)
    this.el.removeEventListener('pointerleave', this.onLeave)
    this.el.removeEventListener('click', this.onClick)
    this.stage.scene.clear()
  }

  setScores(s: Map<string, number>) { this.scores = s }

  private resize(w: number, h: number) {
    this.cam.aspect = w / h
    // keep a similar horizontal field on narrow screens by pulling back
    const d = w / h < 1 ? 10.5 : 9.5
    this.sizeK = w < 700 ? 0.86 : 1
    this.cam.position.set(0, d * 0.55, d)
    this.cam.lookAt(0, 0.2, 0)
    this.cam.updateProjectionMatrix()
    const name = w < 700 ? 'narrow' : 'wide'
    if (name !== this.layout) { this.layout = name; this.build(name === 'narrow' ? NARROW : WIDE) }
    else this.place()
  }

  private jobs: (() => void)[] = []

  private token = 0

  private async build(list: P[]) {
    const scene = this.stage.scene
    const token = ++this.token
    this.items.forEach((it) => scene.remove(it.root))
    this.items = []
    this.jobs.forEach((c) => c())
    this.jobs = []
    // the contact-shadow bake shaders compile in parallel before any chair is built
    await prepareBake(engine.renderer!)
    if (token !== this.token) return
    this.jobs = list.map(([slug, nx, ny], i) => {
      let cancel = () => {}
      let dead = false
      const p = products.find((x) => x.slug === slug)
      if (!p) return cancel
      const shape = shapeFor(p)
      ensureTemplate(shape).then(() => { if (!dead && token === this.token) cancel = schedule(() => this.addChair(p, shape, nx, ny, i, token), true) })
      return () => { dead = true; cancel() }
    })
  }

  private addChair(p: Product, shape: ReturnType<typeof shapeFor>, nx: number, ny: number, i: number, token: number) {
    const scene = this.stage.scene
    {
      const root = createChair(shape, specFor(p), 'low', { contactShadow: true })
      const size = chairSize(shape)
      const animate = !this.reduced
      const tt = new Turntable({ period: 22 + ((i * 7) % 11), phase: (i * 0.137) % 1, reduced: this.reduced, initialFactor: animate ? 0 : 1 })
      tt.rampTau = 0.9
      if (this.reduced) tt.angle = -0.5
      if (animate) tt.hold()
      // the shared opaque materials this chair returns to once it has settled
      const originals = new Group()
      root.traverse((o) => { const m = o as Mesh; if (m.isMesh) originals.add(new Mesh(m.geometry, m.material)) })
      const setOpacity = animate ? makeFadeable(root) : null
      setOpacity?.(0)
      const item: Item = {
        p, root, tt, nx, ny, scale: -1, vel: 0, target: 1, base: 1 / Math.max(size.y, size.x * 1.05, size.z * 1.05, 0.75),
        world: new Vector3(), screen: new Vector2(), r: 0,
        // front rows (lower on screen) rise first, the wave travels to the back
        clock: new EntranceClock(), delay: animate ? Math.max(0, (ny + 0.3) / 1.3) * 260 : 0,
        setOpacity, settled: !animate,
      }
      // enter the scene only once its shaders — fading and settled — are compiled (parallel, off the main thread)
      Promise.all([engine.prepare(root, this.cam, scene), engine.prepare(originals, this.cam, scene)]).then(() => {
        if (token !== this.token) return
        scene.add(root)
        this.items.push(item)
        this.place()
        engine.invalidate()
      })
    }
  }

  private place() {
    for (const it of this.items) {
      this.ray.setFromCamera(new Vector2(it.nx, it.ny * 0.92 - 0.12), this.cam)
      this.ray.ray.intersectPlane(this.floor, it.world)
      it.root.position.copy(it.world)
    }
  }

  private update(dt: number) {
    let active = false
    const rect = this.el.getBoundingClientRect()
    const v = new Vector3()
    let i = 0
    for (const it of this.items) {
      const s = this.scores.get(it.p.slug) ?? 0.5
      const focus = this.focusOnly ? (this.focusOnly.includes(it.p.slug) ? 1.15 : 0.0001) : 1
      // score → scale: 0.42× (poor) … 1.12× (excellent)
      it.target = (0.42 + 0.7 * Math.pow(s, 1.4)) * focus * (i === this.hover ? 1.06 : 1)
      if (it.scale < 0 || this.reduced) it.scale = it.target
      else {
        // critically damped spring: starts and ends with zero velocity — no pops
        const w = 5.5, h = Math.min(dt, 1 / 30)
        it.vel += (w * w * (it.target - it.scale) - 2 * w * it.vel) * h
        it.scale += it.vel * h
        if (Math.abs(it.target - it.scale) > 1e-3 || Math.abs(it.vel) > 1e-3) active = true
      }
      it.root.scale.setScalar(Math.max(0.0001, it.scale * it.base * 0.95 * this.sizeK))
      if (!it.settled) {
        active = true
        const k = Math.max(0, Math.min(1, (it.clock.tick(dt) - it.delay) / ENTER_MS))
        const chair = it.root.userData.chair as Group
        const shadow = it.root.userData.shadow as Group | undefined
        const lift = (1 - easeOutCubic(k)) * 0.16
        chair.position.y = -lift
        if (shadow) shadow.position.y = lift
        it.setOpacity?.(smoothstep(0, 0.5, k))
        if (k >= 1) { it.settled = true; it.tt.begin() }
        else it.tt.hold()
      }
      it.tt.update(dt)
      it.root.rotation.y = it.tt.angle
      v.copy(it.world).setY(0.45 * it.scale).project(this.cam)
      it.screen.set((v.x * 0.5 + 0.5) * rect.width, (0.5 - v.y * 0.5) * rect.height)
      it.r = 60 * it.scale * (rect.height / 700)
      i++
    }
    return active ? 2 : this.reduced ? 0 : 1
  }

  private pick(e: PointerEvent | MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-no-pick]')) return -1
    const r = this.el.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    let best = -1, bd = Infinity
    this.items.forEach((it, i) => {
      if (it.scale < 0.05) return
      const d = Math.hypot(it.screen.x - x, it.screen.y - y)
      if (d < it.r && d < bd) { bd = d; best = i }
    })
    return best
  }

  private onMove = (e: PointerEvent) => {
    const i = this.pick(e)
    if (i !== this.hover) {
      this.hover = i
      this.el.style.cursor = i >= 0 ? 'pointer' : ''
    }
    const it = this.items[i]
    this.onHover?.(it ? it.p : null, it ? it.screen.x : 0, it ? it.screen.y - it.r * 1.1 : 0)
  }

  private onLeave = () => { this.hover = -1; this.el.style.cursor = ''; this.onHover?.(null, 0, 0) }

  private onClick = (e: MouseEvent) => {
    const i = this.pick(e)
    if (i >= 0) this.onPick?.(this.items[i].p)
  }
}
