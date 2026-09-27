import {
  ACESFilmicToneMapping, BackSide, BoxGeometry, Camera, Color, CubeUVReflectionMapping, DataTexture, DirectionalLight, Group, HalfFloatType,
  HemisphereLight, LinearFilter, LinearSRGBColorSpace, Mesh, MeshBasicMaterial, NeutralToneMapping, OrthographicCamera, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, RGBAFormat, Scene, SRGBColorSpace, Texture, WebGLRenderer,
  type Material, type Object3D, type WebGLRenderTarget,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { ptime } from '../lib/ptime'
import { loadEnvAtlas, onTextureUpdate } from './textures'
import { schedule } from './scheduler'

/**
 * One WebGL context for the whole site.
 *
 * A fixed, transparent, pointer-transparent canvas sits *behind* the DOM.
 * Components register "stages": a DOM element + scene + camera. Each frame
 * the engine reads the element's rect and renders its scene into that
 * scissored region. Opaque DOM (header, drawers, menus) naturally covers
 * the chairs; transparent stage elements act as windows onto the 3D.
 */

export interface Stage {
  el: HTMLElement
  scene: Scene
  camera: Camera
  /** paint an opaque background in WebGL (e.g. card surfaces) */
  clear?: string | null
  /** clip to this ancestor (carousels / overflow containers) */
  clipEl?: HTMLElement | null
  /**
   * Per-frame update. Return the motion level:
   *   0 / false - static;  1 / true - ambient (slow rotation: 30 Hz is enough while
   *   the page scrolls);  2 - active (entrances, dragging, springs: every frame).
   */
  update?: (dt: number, t: number, w: number, h: number) => number | boolean
  /** set by IntersectionObserver */
  visible?: boolean
  /** called before render with the resolved CSS size */
  resize?: (w: number, h: number) => void
  /** extra fade (0..1) multiplied with the DOM opacity — used for entrances */
  opacity?: number
  _w?: number
  _h?: number
}

/**
 * 'document': the canvas lives in the page and scrolls with it (compositor-driven,
 *   so chairs can never lag behind their cards); it is re-positioned whenever it is
 *   redrawn. Used for all page content.
 * 'fixed': the canvas is fixed to the viewport. Used for fixed overlays (menu, viewer).
 */
export type EngineMode = 'document' | 'fixed'

type Listener = (ok: boolean) => void

export class Engine {
  constructor(public readonly layer: number, public readonly mode: EngineMode = 'fixed') {}
  private wrapper: HTMLDivElement | null = null
  /** overscan above and below the viewport (CSS px) - document mode */
  private over = 0
  /** tallest viewport seen: mobile URL bars showing/hiding never trigger a canvas resize */
  private maxH = 0
  private canvasH = 0
  private renderedScrollY = 0
  private lastScrollY = 0
  private lastScrollAt = -1e9
  private frameNo = 0
  /** diagnostics: frames rendered, and why */
  stats = { frames: 0, renders: 0, changed: 0, active: 0, coverage: 0, ambient: 0 }
  canvas: HTMLCanvasElement | null = null
  renderer: WebGLRenderer | null = null
  env: Texture | null = null
  supported = true
  stages = new Set<Stage>()
  private io: IntersectionObserver | null = null
  private raf = 0
  private last = 0
  private lastSig = ''
  private dirty = true
  private listeners = new Set<Listener>()
  private fadeScene = new Scene()
  private fadeCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private fadeMat = new MeshBasicMaterial({ color: '#ffffff', transparent: true, depthTest: false, depthWrite: false })
  private W = 0
  private H = 0
  private pr = 1
  /** adaptive resolution: 1 = full device pixel ratio; lowered only if frames run long */
  private quality = 1
  /** highest pixel ratio this GPU class sustains smoothly (decided once, at start) */
  private maxPR = 2
  private lastInput = 0
  private lastQualityChange = 0
  private perfWindow: number[] = []
  private goodWindows = 0
  frameCallbacks = new Set<(dt: number) => void>()
  /** resolves once the studio environment (reflections) exists — compile nothing before it */
  ready: Promise<void> = Promise.resolve()
  private scenes = new Set<WeakRef<Scene>>()

  init() {
    if (this.renderer || !this.supported) return this.renderer
    const P = (window as unknown as { __perf?: { mark: (n: string) => void } }).__perf
    P?.mark('engine:init:' + this.layer)
    try {
      const canvas = document.createElement('canvas')
      canvas.className = this.mode === 'document' ? 'gl-doc-canvas' : 'gl-stage-canvas'
      if (this.mode === 'fixed') canvas.style.zIndex = String(this.layer)
      canvas.setAttribute('aria-hidden', 'true')
      const q = new URLSearchParams(location.search)
      const diag = q.has('perf')
      const renderer = new WebGLRenderer({ canvas, antialias: !(diag && q.get('aa') === '0'), alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false })
      renderer.autoClear = false
      renderer.outputColorSpace = SRGBColorSpace
      renderer.toneMapping = NeutralToneMapping ?? ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.9
      // no real-time shadow maps anywhere: contact/floor shadows are baked
      renderer.shadowMap.enabled = false
      renderer.setClearColor(0x000000, 0)
      this.maxPR = diag && q.get('pr') ? Number(q.get('pr')) : gpuPixelRatioCap(renderer)
      for (const ev of ['scroll', 'wheel', 'touchmove'] as const) addEventListener(ev, () => { this.lastInput = performance.now() }, { passive: true, capture: true })
      if (this.mode === 'document') {
        const wrap = document.createElement('div')
        wrap.className = 'gl-layer'
        wrap.setAttribute('aria-hidden', 'true')
        wrap.append(canvas)
        document.body.prepend(wrap)
        this.wrapper = wrap
      } else document.body.append(canvas)
      this.canvas = canvas
      this.renderer = renderer
      P?.mark('engine:renderer:' + this.layer)
      this.ready = this.loadEnvironment(renderer)
      this.fadeScene.add(new Mesh(new PlaneGeometry(2, 2), this.fadeMat))
      renderer.compileAsync(this.fadeScene, this.fadeCam)
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.fail() })
      this.io = new IntersectionObserver((entries) => {
        for (const en of entries) for (const s of this.stages) if (s.el === en.target) s.visible = en.isIntersecting
        this.dirty = true
      }, { rootMargin: '240px 0px' })
      addEventListener('resize', () => (this.dirty = true))
      this.resize()
      return renderer
    } catch (err) {
      console.warn('[engine] WebGL unavailable — using image fallbacks', err)
      this.fail()
      return null
    }
  }

  private fail() {
    this.supported = false
    if (this === engine) topEngine.supported = false
    cancelAnimationFrame(this.raf)
    this.canvas?.remove()
    this.wrapper?.remove()
    this.renderer = null
    this.listeners.forEach((l) => l(false))
  }

  onStatus(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l) }

  /**
   * The studio reflection environment is pre-computed (see /studio?env=1) and
   * shipped as a 250 kB RGBE image, decoded to half floats in a worker and used
   * directly in three.js' cube-UV format — no filtering shaders ever compile on
   * the visitor's GPU. Falls back to generating it if the file is unavailable.
   */
  private async loadEnvironment(r: WebGLRenderer) {
    try {
      const a = await loadEnvAtlas(import.meta.env.BASE_URL + 'env/studio.rgbe.png')
      if (!this.renderer) return
      const t = new DataTexture(a.data, a.width, a.height, RGBAFormat, HalfFloatType)
      t.mapping = CubeUVReflectionMapping
      t.magFilter = t.minFilter = LinearFilter
      t.generateMipmaps = false
      t.colorSpace = LinearSRGBColorSpace
      t.name = 'PMREM.cubeUv'
      t.needsUpdate = true
      r.initTexture(t) // upload now, not during the first frame that uses it
      this.setEnvironment(t)
    } catch (err) {
      console.warn('[engine] pre-computed environment unavailable, generating', err)
      await this.buildEnvironment(r)
    }
  }

  private setEnvironment(t: Texture) {
    this.env = t
    for (const ref of this.scenes) { const sc = ref.deref(); if (sc) sc.environment = t; this.scenes.delete(ref) }
    this.dirty = true
  }

  /**
   * Fallback: generate the soft studio reflection environment (PMREM of a room with softboxes).
   * Generating it normally compiles several heavy shaders synchronously (~1 s on
   * integrated GPUs). Instead, pre-allocate the generator's passes and compile
   * every shader it will use in parallel — bound to a render target exactly as the
   * generator renders — then generate, which is now just a few fast draws.
   */
  private async buildEnvironment(r: WebGLRenderer) {
    type PM = PMREMGenerator & { _setSize(n: number): void; _allocateTargets(): WebGLRenderTarget; _blurMaterial: Material; _ggxMaterial: Material; _pingPongRenderTarget: WebGLRenderTarget }
    const pm = new PMREMGenerator(r) as PM
    const room = new RoomEnvironment()
    pm._setSize(256)
    pm._allocateTargets().dispose()
    const cam = new PerspectiveCamera(90, 1, 0.1, 100)
    const passes = new Group()
    const quad = new PlaneGeometry(2, 2)
    passes.add(new Mesh(quad, pm._blurMaterial), new Mesh(quad, pm._ggxMaterial))
    passes.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial({ side: BackSide, depthWrite: false, depthTest: false })))
    const prev = r.getRenderTarget()
    r.setRenderTarget(pm._pingPongRenderTarget)
    const compiled = Promise.all([r.compileAsync(room, cam), r.compileAsync(passes, cam, new Scene())])
    r.setRenderTarget(prev)
    await compiled
    if (!this.renderer) return
    this.setEnvironment(ptime('pmrem', () => pm.fromScene(room, 0.035).texture))
    pm.dispose()
  }

  /** A scene pre-wired with the shared studio environment + soft lights. */
  createScene(opts: { shadows?: boolean; envIntensity?: number } = {}) {
    const s = new Scene()
    s.environment = this.env
    if (!this.env) this.scenes.add(new WeakRef(s))
    s.environmentIntensity = opts.envIntensity ?? 0.5
    s.add(new HemisphereLight('#ffffff', '#d8d4cc', 0.4))
    const key = new DirectionalLight('#ffffff', 1.35)
    key.position.set(-2.2, 4, 3)
    s.add(key)
    const fill = new DirectionalLight('#f3f5ff', 0.45)
    fill.position.set(3, 1.5, 2)
    s.add(fill)
    const rim = new DirectionalLight('#ffffff', 0.9)
    rim.position.set(0.5, 2.5, -3.5)
    s.add(rim)
    s.userData.key = key
    return s
  }

  add(stage: Stage) {
    if (!this.init()) return false
    this.stages.add(stage)
    stage.visible = true
    this.io?.observe(stage.el)
    this.dirty = true
    if (!this.raf) this.loop(performance.now())
    return true
  }

  remove(stage: Stage) {
    this.stages.delete(stage)
    this.io?.unobserve(stage.el)
    this.dirty = true
  }

  invalidate() { this.dirty = true }

  /**
   * Compile every shader `obj` needs — with the lights of `target` — in parallel,
   * off the main thread (KHR_parallel_shader_compile). Resolves when it can be
   * drawn without stalling. Show things only after this resolves.
   */
  /**
   * Like prepare(), but one batch at a time: three.js assembles each new shader's
   * source on the main thread, so compiling many at once would be one long task.
   * Batches run in separate frames (or idle slots) and are awaited in sequence.
   */
  async prepareBatched(batches: Object3D[], camera: Camera, target: Scene, idle = false) {
    for (const b of batches) {
      await new Promise<void>((res) => schedule(() => res(), !idle))
      await this.prepare(b, camera, target)
    }
  }

  prepare(obj: Object3D, camera: Camera, target?: Scene): Promise<void> {
    const r = this.init()
    if (!r) return Promise.resolve()
    const t = target ?? (obj as Scene)
    // programs depend on the environment map — wait until it exists
    return this.ready.then(() => r.compileAsync(obj, camera, t)).then(() => undefined, () => undefined)
  }

  private resize() {
    const r = this.renderer
    if (!r || !this.canvas) return
    const W = window.innerWidth
    let H = window.innerHeight
    if (this.mode === 'document') {
      if (W !== this.W) this.maxH = 0
      this.maxH = Math.max(this.maxH, H)
      this.over = Math.max(64, Math.round(this.maxH * 0.08))
      H = this.maxH + 2 * this.over
    }
    // Full device pixel ratio for crisp 4K/retina, capped by total pixel budget.
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxPR)
    const budget = Math.max(1, Math.min(dpr, Math.sqrt(10_000_000 / (W * H))))
    // the governor may trade a little sharpness for fluid motion on weaker GPUs (never below 1× CSS pixels)
    const pr = Math.round(Math.max(Math.min(budget, 1), budget * this.quality) * 100) / 100
    if (W !== this.W || H !== this.H || pr !== this.pr) {
      this.W = W; this.H = H; this.pr = pr
      r.setPixelRatio(pr)
      r.setSize(W, H, false)
      this.canvas.style.width = W + 'px'
      this.canvas.style.height = H + 'px'
      this.canvasH = H
      this.dirty = true
    }
  }

  private opacityOf(el: HTMLElement) {
    let o = 1
    let n: HTMLElement | null = el
    let depth = 0
    while (n && n !== document.body && depth < 40) {
      const v = n.style.opacity
      if (v !== '') o *= parseFloat(v)
      if (n.style.visibility === 'hidden') return 0
      n = n.parentElement
      depth++
    }
    return o
  }

  /** Keep motion fluid: lower the pixel ratio a step if frames run long, restore when there is headroom. */
  private govern(interval: number) {
    if (interval > 100) return // tab switch / throttling — not a rendering signal
    // Resizing the canvas is itself a hitch: never do it mid-scroll, and not too often.
    const now = performance.now()
    if (now - this.lastInput < 800 || now - this.lastQualityChange < 4000) { this.perfWindow = []; return }
    this.perfWindow.push(interval)
    if (this.perfWindow.length < 45) return
    const avg = this.perfWindow.reduce((a, b) => a + b, 0) / this.perfWindow.length
    this.perfWindow = []
    if (avg > 20.5 && this.quality > 0.62) { this.quality = Math.max(0.62, this.quality - 0.14); this.goodWindows = 0; this.lastQualityChange = now }
    else if (avg < 17.4 && this.quality < 1) { if (++this.goodWindows >= 4) { this.quality = Math.min(1, this.quality + 0.1); this.goodWindows = 0; this.lastQualityChange = now } }
    else this.goodWindows = 0
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop)
    const r = this.renderer
    if (!r) return
    const interval = now - (this.last || now)
    const dt = Math.min(0.05, interval / 1000)
    this.last = now
    this.resize()
    this.frameCallbacks.forEach((cb) => cb(dt))
    const doc = this.mode === 'document'
    const W = this.W, vh = window.innerHeight
    const scrollY = doc ? window.scrollY : 0
    if (scrollY !== this.lastScrollY) { this.lastScrollY = scrollY; this.lastScrollAt = now }
    const scrolling = now - this.lastScrollAt < 150
    // the band of the viewport the canvas covers (viewport coordinates)
    const bandTop = doc ? -this.over : 0
    const bandBottom = doc ? vh + this.over : this.H
    let level = 0
    let sig = ''
    const jobs: { s: Stage; rect: DOMRect; o: number; clip: DOMRect | null }[] = []
    for (const s of this.stages) {
      if (s.visible === false) continue
      const rect = s.el.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1 || rect.bottom < bandTop || rect.top > bandBottom || rect.right < 0 || rect.left > W) continue
      const o = this.opacityOf(s.el) * (s.opacity ?? 1)
      if (o <= 0.001) { if (s.opacity != null && s.opacity < 1) s.update?.(dt, now / 1000, rect.width, rect.height); continue }
      const clip = s.clipEl ? s.clipEl.getBoundingClientRect() : null
      if (s._w !== rect.width || s._h !== rect.height) {
        s._w = rect.width; s._h = rect.height
        s.resize?.(rect.width, rect.height)
      }
      const lv = s.update?.(dt, now / 1000, rect.width, rect.height)
      level = Math.max(level, lv === true ? 1 : lv || 0)
      // Position in *document* space: plain scrolling doesn't change it, but reveals,
      // page transitions and sticky elements do - those are redrawn every frame.
      sig += `${rect.left | 0},${Math.round(rect.top + scrollY)},${rect.width | 0},${rect.height | 0},${o.toFixed(3)};`
      jobs.push({ s, rect, o, clip })
    }
    const changed = this.dirty || sig !== this.lastSig
    let render: boolean
    if (!doc) render = changed || level > 0
    else {
      // The compositor carries the canvas along while the page scrolls. Redraw when
      // something really moves, when the overscan margin runs low, or - for slow
      // ambient rotation during a scroll - every other frame (30 Hz is plenty).
      const coverageLow = Math.abs(scrollY - this.renderedScrollY) > this.over * 0.5
      render = changed || level >= 2 || coverageLow || (level === 1 && (!scrolling || (this.frameNo & 1) === 0))
      if (scrolling && jobs.length) {
        this.stats.frames++
        if (render) { this.stats.renders++; if (changed) this.stats.changed++; else if (level >= 2) this.stats.active++; else if (coverageLow) this.stats.coverage++; else this.stats.ambient++ }
      }
    }
    this.frameNo++
    if (!render) return
    if (level > 0) this.govern(interval)
    this.lastSig = sig
    this.dirty = false
    const CH = this.canvasH || this.H
    if (doc) {
      this.renderedScrollY = scrollY
      this.canvas!.style.transform = `translate3d(0, ${scrollY + bandTop}px, 0)`
    }
    r.setScissorTest(false)
    r.setClearColor(0x000000, 0)
    r.clear(true, true, true)
    r.setScissorTest(true)
    for (const j of jobs) {
      const { rect } = j
      // canvas coordinates (GL origin bottom-left)
      const top = rect.top - bandTop
      const x = rect.left, y = CH - (top + rect.height), w = rect.width, h = rect.height
      let sx = Math.max(0, x), sy = Math.max(0, y)
      let sx2 = Math.min(W, x + w), sy2 = Math.min(CH, y + h)
      if (j.clip) {
        sx = Math.max(sx, j.clip.left); sx2 = Math.min(sx2, j.clip.right)
        sy = Math.max(sy, CH - (j.clip.bottom - bandTop)); sy2 = Math.min(sy2, CH - (j.clip.top - bandTop))
      }
      if (sx2 - sx < 1 || sy2 - sy < 1) continue
      r.setViewport(x, y, w, h)
      r.setScissor(sx, sy, sx2 - sx, sy2 - sy)
      if (j.s.clear) {
        r.setClearColor(new Color(j.s.clear), 1)
        r.clear(true, true, false)
        r.setClearColor(0x000000, 0)
      } else r.clearDepth()
      ptime('render:' + (j.s.el.className.split(' ')[0] || 'stage'), () => r.render(j.s.scene, j.s.camera))
      if (j.o < 0.999) {
        // fade towards the white page behind the canvas
        this.fadeMat.opacity = 1 - j.o
        r.render(this.fadeScene, this.fadeCam)
      }
    }
  }
}

/** Behind the DOM — used by all page content. */
export const engine = new Engine(0, 'document')
/** Above overlays (menu, fullscreen viewer). */
export const topEngine = new Engine(140, 'fixed')

if (import.meta.env.DEV || location.search.includes('perf')) Object.assign(window, { __engine: engine, __top: topEngine })

// Texture pixels arrive asynchronously from the worker: upload each one on its own
// frame (instead of all at once inside a render), then redraw idle stages.
onTextureUpdate((t) => {
  schedule(() => {
    engine.renderer?.initTexture(t)
    topEngine.renderer?.initTexture(t)
    engine.invalidate()
    topEngine.invalidate()
  }, true)
})

/**
 * GPU class → sustainable pixel-ratio cap, decided once so the canvas never has to
 * be resized mid-session. Discrete GPUs and Apple silicon render at full retina
 * density (2×); phone GPUs at 1.5×; integrated laptop GPUs at 1.25× — measured on an
 * Intel Iris Xe, that is what keeps scrolling at 60 fps with 4× MSAA edges; software
 * rasterisers at 1×.
 */
function gpuPixelRatioCap(r: WebGLRenderer) {
  try {
    const gl = r.getContext()
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase()
    if (/swiftshader|llvmpipe|software|basic render/.test(name)) return 1
    if (/mali|adreno|powervr|vivante/.test(name)) return 1.5
    if (/intel|uhd|iris|radeon\(tm\) graphics|radeon graphics/.test(name)) return 1.25
    return 2
  } catch {
    return 1.5
  }
}
