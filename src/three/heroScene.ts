import { DataTexture, Euler, Group, Matrix4, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, PlaneGeometry, Quaternion, Vector2, Vector3 } from 'three'
import { engine, type Stage } from './engine'
import { bakedShadow, chairCenter, chairSize, createChair, ensureTemplate } from './chairs'
import { Turntable } from './turntable'
import { HERO_ENTER_MS, EntranceClock, easeOutCubic, makeFadeable, smoothstep } from './entrance'
import { prepareBake } from './contactShadow'
import { markFirstScreenDone } from './firstScreen'
import { schedule } from './scheduler'
import { shapeFor, specFor, bySlug } from '../data/products'

/**
 * Hero: radial composition of floating chairs around a clear centre.
 * Positions are in normalised viewport units (-1..1), so the composition
 * holds at every aspect ratio. Chairs are real 3D, lit by a studio rig.
 *
 * Floor shadows are *projected*, not rendered with a shadow map: each chair's
 * pre-baked soft silhouette (the same bake that grounds product cards) is
 * flattened onto the white floor with a planar-projection matrix every frame.
 * It follows the chair's spin exactly, costs one quad per chair, and needs no
 * shadow-map pass or extra shaders.
 */

export interface HeroSlot {
  slug: string
  color: number
  nx: number
  ny: number
  /** chair's largest dimension as fraction of viewport height */
  size: number
  /** euler tilt (x: toward viewer, z: roll) in radians */
  rx: number
  rz: number
  /** depth in world units (−0.4..0.4) — affects parallax + shadow offset */
  z: number
  period: number
  phase: number
}

const S = (slug: string, color: number, nx: number, ny: number, size: number, rx: number, rz: number, z: number, period: number, phase: number): HeroSlot =>
  ({ slug, color, nx, ny, size, rx, rz, z, period, phase })

// Desktop: a dozen chairs framing the viewport; centre (|nx|<.5, |ny|<.42) stays clear.
const WIDE: HeroSlot[] = [
  S('nova', 3, -0.97, 0.66, 0.26, -0.95, 0.5, -0.1, 24, 0.0),
  S('vera', 2, -0.66, 0.84, 0.2, -1.1, -0.7, 0.2, 21, 0.12),
  S('loft', 0, -0.3, 0.9, 0.2, -1.2, 0.9, -0.2, 27, 0.28),
  S('jara', 1, 0.24, 0.86, 0.19, -1.05, -1.3, 0.1, 22, 0.43),
  S('elevate', 0, 0.62, 0.74, 0.25, -0.9, 0.35, 0.25, 26, 0.57),
  S('clova', 3, 0.96, 0.48, 0.22, -1.15, -0.4, -0.15, 20, 0.71),
  S('onyx', 0, -0.86, 0.0, 0.25, -0.8, -1.0, 0.15, 28, 0.86),
  S('nova', 2, 0.84, -0.02, 0.21, -0.85, 1.2, 0.0, 19, 0.2),
  S('vera', 3, -0.72, -0.72, 0.27, -1.0, 0.7, 0.2, 29, 0.35),
  S('loft', 2, -0.3, -0.9, 0.2, -1.2, -0.6, -0.1, 23, 0.64),
  S('jara', 0, 0.3, -0.86, 0.22, -1.05, 1.5, 0.15, 25, 0.5),
  S('elevate', 3, 0.74, -0.72, 0.26, -0.9, -0.9, -0.2, 30, 0.78),
]

const MEDIUM: HeroSlot[] = [
  S('nova', 3, -0.92, 0.72, 0.2, -0.95, 0.5, -0.1, 24, 0.0),
  S('vera', 2, -0.2, 0.9, 0.16, -1.1, -0.7, 0.2, 21, 0.14),
  S('elevate', 0, 0.55, 0.8, 0.19, -0.9, 0.35, 0.25, 26, 0.3),
  S('clova', 3, 0.95, 0.2, 0.17, -0.85, 1.2, 0.0, 19, 0.45),
  S('onyx', 0, -0.95, -0.2, 0.19, -0.8, -1.0, 0.15, 28, 0.6),
  S('loft', 2, -0.62, -0.84, 0.2, -1.0, 0.7, 0.2, 29, 0.73),
  S('jara', 1, 0.1, -0.92, 0.16, -1.05, 1.5, 0.15, 25, 0.86),
  S('nova', 2, 0.78, -0.72, 0.2, -0.9, -0.9, -0.2, 30, 0.5),
]

// Portrait phones: fewer chairs, confined to top and bottom bands.
const NARROW: HeroSlot[] = [
  S('vera', 2, -0.78, 0.66, 0.15, -1.1, -0.7, 0.2, 22, 0.0),
  S('elevate', 0, 0.05, 0.76, 0.13, -0.9, 0.35, 0.25, 26, 0.3),
  S('nova', 3, 0.85, 0.6, 0.15, -0.95, 0.5, -0.1, 24, 0.55),
  S('onyx', 0, -0.8, -0.78, 0.15, -0.8, -1.0, 0.15, 28, 0.2),
  S('clova', 3, 0.05, -0.92, 0.12, -0.85, 1.2, 0.0, 20, 0.7),
  S('jara', 1, 0.82, -0.76, 0.15, -0.9, -0.9, -0.2, 30, 0.45),
]

export function pickLayout(w: number, h: number) {
  if (w < 640 || w / h < 0.8) return { name: 'narrow', slots: NARROW }
  if (w < 1100) return { name: 'medium', slots: MEDIUM }
  return { name: 'wide', slots: WIDE }
}

interface Item {
  slot: HeroSlot
  pivot: Group
  spin: Group
  anchor: Object3D
  shadow: Mesh
  shadowMat: MeshBasicMaterial
  tt: Turntable
  scale: number
  radius: number
  /** ms on the entrance clock; < 0 means already in place */
  enterDelay: number
  setOpacity: ((o: number) => void) | null
  settled: boolean
  screen: Vector2
  screenR: number
  bobPhase: number
}

/** Placeholder silhouette (transparent) and a unit quad scaled to each bake's span. */
const EMPTY = new DataTexture(new Uint8Array(4), 1, 1)
EMPTY.needsUpdate = true
const UNIT_PLANE = new PlaneGeometry(1, 1)

/** The white "floor" the chairs float above, and the soft key light direction. */
const FLOOR_Z = -0.55
const LIGHT = new Vector3(-1.6, 2.8, 10).normalize()
const SHADOW_OPACITY = 0.24
/** Planar projection onto z = FLOOR_Z along LIGHT (directional). */
const PROJECT = new Matrix4().set(
  LIGHT.z, 0, -LIGHT.x, LIGHT.x * FLOOR_Z,
  0, LIGHT.z, -LIGHT.y, LIGHT.y * FLOOR_Z,
  0, 0, 0, LIGHT.z * FLOOR_Z,
  0, 0, 0, LIGHT.z,
)

type PerfWin = { __perf?: { mark: (n: string) => void } }

export class HeroScene {
  stage: Stage
  cam = new PerspectiveCamera(30, 1, 0.5, 60)
  items: Item[] = []
  private layoutName = ''
  private clock = new EntranceClock()
  private mouse = new Vector2()
  private mouseS = new Vector2()
  private hoverIdx = -1
  private drag: { i: number; x: number; t: number; pid: number } | null = null
  private reduced: boolean
  private root = new Group()
  private shadowRoot = new Group()
  private buildToken = 0
  private disposed = false
  onHover?: (slug: string | null) => void
  /** element whose box chairs must never overlap (headline + CTA) */
  avoidEl: HTMLElement | null = null
  private sizeK = 0.84
  private lastScrollK = -1

  constructor(public el: HTMLElement, opts: { reduced: boolean }) {
    this.reduced = opts.reduced
    const scene = engine.createScene({ envIntensity: 0.55 })
    this.cam.position.set(0, 0, 10)
    scene.add(this.shadowRoot, this.root)
    this.stage = {
      el,
      scene,
      camera: this.cam,
      resize: (w, h) => this.resize(w, h),
      update: (dt) => this.update(dt),
    }
  }

  /**
   * Start-up never blocks the main thread: geometry is built one chair per frame,
   * shaders compile in parallel, and the entrance starts only when everything can
   * be drawn without a stall.
   */
  mount() {
    if (!engine.init()) return false
    this.el.addEventListener('pointermove', this.onMove)
    this.el.addEventListener('pointerleave', this.onLeave)
    this.el.addEventListener('pointerdown', this.onDown)
    addEventListener('pointerup', this.onUp)
    const r = this.el.getBoundingClientRect()
    this.cam.aspect = r.width / Math.max(1, r.height)
    this.cam.updateProjectionMatrix()
    const L = pickLayout(r.width, r.height)
    this.layoutName = L.name
    this.build(L.slots, true).then(() => {
      if (this.disposed) return
      engine.add(this.stage)
      ;(window as unknown as PerfWin).__perf?.mark('heroReady')
    })
    return true
  }

  dispose() {
    this.disposed = true
    this.buildToken++
    engine.remove(this.stage)
    this.el.removeEventListener('pointermove', this.onMove)
    this.el.removeEventListener('pointerleave', this.onLeave)
    this.el.removeEventListener('pointerdown', this.onDown)
    removeEventListener('pointerup', this.onUp)
    this.stage.scene.clear()
  }

  private resize(w: number, h: number) {
    this.cam.aspect = w / h
    this.cam.updateProjectionMatrix()
    const L = pickLayout(w, h)
    if (L.name !== this.layoutName) {
      this.layoutName = L.name
      this.build(L.slots, false)
    }
  }

  private halfExtents(z: number) {
    const halfH = Math.tan((this.cam.fov * Math.PI) / 360) * (this.cam.position.z - z)
    return { halfH, halfW: halfH * this.cam.aspect }
  }

  private async build(slots: HeroSlot[], animateIn: boolean) {
    const token = ++this.buildToken
    const animate = animateIn && !this.reduced
    const products = slots.map((s) => bySlug(s.slug)).filter((p): p is NonNullable<typeof p> => !!p)
    const mark = (n: string) => (window as unknown as PerfWin).__perf?.mark(n)
    mark('hero:start')
    // 1 — geometry, built in parallel in the geometry workers
    await Promise.all(products.map((p) => ensureTemplate(shapeFor(p))))
    mark('hero:templates')
    if (token !== this.buildToken) return
    // 2 — assemble (cheap: shared geometry, per-chair material copies for the fade).
    //     Floor silhouettes don't hold the entrance back: each attaches itself as soon
    //     as its bake is done (a placeholder texture keeps the shader identical).
    const items: Item[] = []
    const staging = new Group()
    for (const s of slots) {
      const p = bySlug(s.slug)
      if (!p) continue
      const color = p.colors[s.color % p.colors.length].id
      const shape = shapeFor(p)
      const chair = createChair(shape, specFor(p, color), 'low')
      const size = chairSize(shape), center = chairCenter(shape)
      const offset = new Group()
      offset.position.copy(center).multiplyScalar(-1)
      offset.add(chair)
      // silhouette anchor: the chair-local floor plane (same frame as a contact shadow)
      const anchor = new Object3D()
      anchor.rotation.x = -Math.PI / 2
      anchor.scale.set(0.0001, -0.0001, 1) // sized to the bake's span once it lands
      offset.add(anchor)
      const spin = new Group()
      spin.add(offset)
      const pivot = new Group()
      pivot.add(spin)
      pivot.quaternion.copy(new Quaternion().setFromEuler(new Euler(s.rx, 0, s.rz, 'ZXY')))
      const shadowMat = new MeshBasicMaterial({ map: EMPTY, color: 0x000000, transparent: true, depthWrite: false, opacity: animate ? 0 : SHADOW_OPACITY })
      const shadow = new Mesh(UNIT_PLANE, shadowMat)
      const attach = () => {
        const b = bakedShadow(shape)
        if (!b) return
        shadowMat.map = b.textures[1]
        anchor.scale.set(b.span, -b.span, 1)
      }
      prepareBake(engine.renderer!).then(() => schedule(attach, true))
      shadow.matrixAutoUpdate = false
      shadow.frustumCulled = false
      shadow.renderOrder = -1
      const tt = new Turntable({ period: s.period, phase: s.phase, reduced: this.reduced, initialFactor: animate ? 0 : 1 })
      tt.rampTau = 0.8 // rotation eases in once the chair has settled
      if (animate) tt.hold()
      const setOpacity = makeFadeable(chair)
      setOpacity(animate ? 0 : 1)
      staging.add(pivot, shadow)
      items.push({
        slot: s, pivot, spin, anchor, shadow, shadowMat, tt, scale: 1, radius: Math.max(size.x, size.y, size.z) / 2,
        // a gentle wave: the lowest chairs rise first, the top row follows
        enterDelay: animate ? 40 + ((s.ny + 1) / 2) * 340 + s.phase * 90 : -1,
        setOpacity, settled: !animate,
        screen: new Vector2(), screenR: 0, bobPhase: s.phase * Math.PI * 2,
      })
    }
    // 4 — compile every shader in parallel, with this scene's lights
    await engine.ready
    mark('hero:env')
    await engine.prepare(staging, this.cam, this.stage.scene)
    mark('hero:compiled')
    if (token !== this.buildToken) return
    // 5 — swap in
    this.root.clear()
    this.shadowRoot.clear()
    for (const it of items) { this.root.add(it.pivot); this.shadowRoot.add(it.shadow) }
    this.items = items
    this.hoverIdx = -1
    this.drag = null
    if (animate) this.clock = new EntranceClock()
    engine.invalidate()
  }

  private update(dt: number) {
    const now = performance.now()
    const clock = this.clock.tick(dt)
    ;(window as unknown as PerfWin).__perf?.mark('heroFirstFrame')
    this.mouseS.lerp(this.mouse, 1 - Math.exp(-dt / 0.35))
    const rect = this.el.getBoundingClientRect()
    const av = this.avoidEl?.getBoundingClientRect()
    const scrollK = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)))
    // scroll parallax, mouse parallax, entrances, hovers and drags need every frame;
    // the slow turn and float alone are ambient
    let active = scrollK !== this.lastScrollK || this.mouse.distanceTo(this.mouseS) > 1e-3 || !!this.drag
    this.lastScrollK = scrollK
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i]
      const s = it.slot
      const { halfH, halfW } = this.halfExtents(s.z)
      let tx = s.nx * halfW
      const ty = Math.min(s.ny, 0.8) * halfH
      const worldScale = (s.size * this.sizeK * 2 * halfH) / (it.radius * 2)
      if (av) {
        // keep the headline block clear: push the chair horizontally out of it
        const px = rect.width / (2 * halfW)
        const r = ((s.size * this.sizeK * rect.height) / 2) * 0.72
        const cx = rect.width / 2 + tx * px, cy = rect.height / 2 - ty * px
        const L = av.left - rect.left - 24, R = av.right - rect.left + 24, T = av.top - rect.top - 16, B = av.bottom - rect.top + 16
        if (cx + r > L && cx - r < R && cy + r > T && cy - r < B) {
          const toLeft = cx + r - L, toRight = R - (cx - r)
          tx += (toLeft < toRight ? -toLeft : toRight) / px
        }
      }
      // entrance: rise from just below, fade in, decelerate softly into place
      const k = it.enterDelay < 0 ? 1 : Math.max(0, Math.min(1, (clock - it.enterDelay) / HERO_ENTER_MS))
      const e = easeOutCubic(k)
      if (!it.settled) {
        const fade = smoothstep(0, 0.5, k)
        it.setOpacity?.(fade)
        it.shadowMat.opacity = SHADOW_OPACITY * fade
        if (k >= 1) { it.settled = true; it.tt.begin() }
        else if (!it.tt.dragging) it.tt.hold()
      }
      let x = tx
      let y = ty - (1 - e) * halfH * 0.16
      // life: slow float, mouse parallax (deeper = less), scroll drift
      const depth = 1 + s.z
      if (!this.reduced) {
        x += this.mouseS.x * 0.09 * depth
        y += this.mouseS.y * 0.06 * depth + Math.sin(now / 1000 / (6 + s.phase * 3) + it.bobPhase) * 0.035
        y += scrollK * halfH * (0.35 + s.size * 1.6)
      }
      it.pivot.position.set(x, y, s.z)
      const target = i === this.hoverIdx || this.drag?.i === i ? 1.05 : 1
      it.scale += (target - it.scale) * (1 - Math.exp(-dt / 0.12))
      if (!it.settled || Math.abs(target - it.scale) > 1e-3) active = true
      it.pivot.scale.setScalar(worldScale * (0.97 + 0.03 * e) * it.scale)
      it.tt.update(dt, now)
      it.spin.rotation.y = it.tt.angle - (1 - e) * 0.25
      // project the silhouette onto the floor
      it.pivot.updateMatrixWorld(true)
      it.shadow.matrix.multiplyMatrices(PROJECT, it.anchor.matrixWorld)
      it.shadow.matrixWorldNeedsUpdate = true
      // screen-space hit circle for hover/drag
      const v = new Vector3(x, y, s.z).project(this.cam)
      it.screen.set((v.x * 0.5 + 0.5) * rect.width, (0.5 - v.y * 0.5) * rect.height)
      it.screenR = ((s.size * this.sizeK * rect.height) / 2) * 0.8
    }
    if (this.items.length && this.items.every((it) => it.settled)) markFirstScreenDone()
    return active ? 2 : this.reduced ? 0 : 1
  }

  private hit(x: number, y: number) {
    let best = -1, bd = Infinity
    this.items.forEach((it, i) => {
      const d = Math.hypot(it.screen.x - x, it.screen.y - y)
      if (d < it.screenR && d < bd) { bd = d; best = i }
    })
    return best
  }

  private onMove = (e: PointerEvent) => {
    const r = this.el.getBoundingClientRect()
    this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
    if (this.drag) {
      const it = this.items[this.drag.i]
      const dx = e.clientX - this.drag.x
      const nowT = performance.now()
      it.tt.angle += dx * 0.012
      it.tt.dragVel = (dx * 0.012) / Math.max(0.001, (nowT - this.drag.t) / 1000)
      it.tt.lastInteract = nowT
      this.drag.x = e.clientX
      this.drag.t = nowT
      return
    }
    const onUI = (e.target as HTMLElement).closest('a,button,input,[data-no-drag]')
    const i = onUI ? -1 : this.hit(e.clientX - r.left, e.clientY - r.top)
    if (i !== this.hoverIdx) {
      this.hoverIdx = i
      this.el.style.cursor = i >= 0 ? 'grab' : ''
      this.onHover?.(i >= 0 ? this.items[i].slot.slug : null)
    }
  }

  private onLeave = () => {
    this.mouse.set(0, 0)
    if (!this.drag) { this.hoverIdx = -1; this.el.style.cursor = ''; this.onHover?.(null) }
  }

  private onDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('a,button,input,[data-no-drag]')) return
    const r = this.el.getBoundingClientRect()
    const i = this.hit(e.clientX - r.left, e.clientY - r.top)
    if (i < 0) return
    this.drag = { i, x: e.clientX, t: performance.now(), pid: e.pointerId }
    const it = this.items[i]
    it.tt.dragging = true
    it.tt.lastInteract = performance.now()
    this.el.style.cursor = 'grabbing'
    e.preventDefault()
  }

  private onUp = () => {
    if (!this.drag) return
    const it = this.items[this.drag.i]
    it.tt.dragging = false
    it.tt.dragVel = Math.max(-4, Math.min(4, it.tt.dragVel))
    if (performance.now() - this.drag.t > 80) it.tt.dragVel = 0
    it.tt.lastInteract = performance.now()
    this.drag = null
    this.el.style.cursor = this.hoverIdx >= 0 ? 'grab' : ''
  }

}
