import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import { Group, PerspectiveCamera, Vector3 } from 'three'
import { engine, topEngine, type Stage } from '../../three/engine'
import { applyMaterials, attachShadow, chairCenter, chairSize, createChair, ensureTemplate, loadModel, type Lod } from '../../three/chairs'
import { Turntable } from '../../three/turntable'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'
import { shapeFor, specFor, type Product } from '../../data/products'
import { useEngineStatus } from './useEngineStatus'
import { fallbackSrc } from '../../lib/renders'
import { schedule } from '../../three/scheduler'
import { ENTER_MS, EntranceClock, easeOutCubic, smoothstep } from '../../three/entrance'
import { prepareBake } from '../../three/contactShadow'

export interface ChairStageHandle {
  reset: () => void
  view: (angle: number, tilt?: number, zoom?: number) => void
  /** multiply the current zoom (clamped) */
  zoomBy: (k: number) => void
}

export interface ChairStageProps {
  product: Product
  color?: string
  frame?: string
  config?: string
  lod?: Lod
  /** seconds per revolution */
  period?: number
  /** 0..1 rotation phase offset */
  phase?: number
  interactive?: boolean
  zoomable?: boolean
  tiltable?: boolean
  /** paint an opaque surface colour behind the chair */
  surface?: string | null
  /** camera elevation in degrees */
  elevation?: number
  /** fit margin (1 = tight) */
  margin?: number
  /** vertical framing offset (fraction of chair height) */
  lift?: number
  hovered?: boolean
  className?: string
  style?: CSSProperties
  clipEl?: HTMLElement | null
  label?: string
  startDelay?: number
  onInteract?: () => void
  /** render above overlays */
  layer?: 'base' | 'top'
  /** wheel zooms without a modifier key (fullscreen viewer) */
  freeZoom?: boolean
  /** build immediately instead of waiting to approach the viewport */
  eager?: boolean
}

export const ChairStage = forwardRef<ChairStageHandle, ChairStageProps>(function ChairStage(p, handle) {
  const ref = useRef<HTMLDivElement>(null)
  const ok = useEngineStatus()
  const [ready, setReady] = useState(false)
  const [near, setNear] = useState(!!p.eager)
  const chairRef = useRef<Group | null>(null)
  const ttRef = useRef<Turntable | null>(null)
  const hoverRef = useRef(false)
  const angleRef = useRef<number | null>(null)
  const tiltZoomRef = useRef<[number, number] | null>(null)
  const shape = shapeFor(p.product, p.config)
  const spec = specFor(p.product, p.color, p.frame)
  const shapeKey = `${shape.type}|${shape.arms}|${p.lod ?? 'low'}`
  const specKey = JSON.stringify(spec)
  hoverRef.current = !!p.hovered

  useImperativeHandle(handle, () => ({
    reset: () => ttRef.current?.reset(),
    zoomBy: (k) => {
      const tt = ttRef.current
      if (!tt) return
      tt.zoomTarget = Math.max(tt.zoomRange[0], Math.min(tt.zoomRange[1], tt.zoomTarget * k))
      tt.lastInteract = performance.now()
    },
    view: (angle, tilt = 0, zoom = 1) => {
      const tt = ttRef.current
      if (!tt) return
      // shortest path to the requested angle, animated by inertia-free lerp
      const cur = tt.angle
      const target = angle + Math.round((cur - angle) / (Math.PI * 2)) * Math.PI * 2
      tt.lastInteract = performance.now()
      tt.tiltTarget = tilt
      tt.zoomTarget = zoom
      const start = performance.now()
      const step = () => {
        const k = Math.min(1, (performance.now() - start) / 700)
        const e = 1 - Math.pow(1 - k, 3)
        tt.angle = cur + (target - cur) * e
        tt.lastInteract = performance.now()
        if (k < 1) requestAnimationFrame(step)
      }
      step()
    },
  }), [])

  useEffect(() => {
    if (near || !ref.current) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect() } }, { rootMargin: '900px 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [near, ok])

  useEffect(() => {
    const el = ref.current
    const eng = p.layer === 'top' ? topEngine : engine
    if (!el || !near || !eng.init()) return
    let dispose: (() => void) | null = null
    let cancelled = false
    let cancel = () => {}
    // geometry is built in the workers and bake shaders compile in parallel first,
    // so creating the stage never stalls a frame
    Promise.all([prepareBake(eng.renderer!), ensureTemplate(shape, p.lod ?? 'low'), ensureTemplate(shape, 'low')]).then(() => {
      if (cancelled) return
      // stages about to scroll into view are built promptly (one per frame)
      cancel = schedule(() => { dispose = build(el, eng) }, true)
    })
    return () => { cancelled = true; cancel(); dispose?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey, ok, near])

  function build(el: HTMLDivElement, eng: typeof engine) {
    const reduced = prefersReducedMotion()
    const scene = eng.createScene()
    const chair = createChair(shape, spec, p.lod ?? 'low', { contactShadow: true, engine: eng })
    chairRef.current = chair
    scene.add(chair)
    const size = chairSize(shape)
    const center = chairCenter(shape)
    const radius = Math.max(Math.hypot(size.x, size.z) / 2, 0.3)
    const cam = new PerspectiveCamera(26, 1, 0.05, 40)
    const tt = new Turntable({ period: p.period ?? 36, phase: p.phase ?? 0.1, reduced, startDelay: p.startDelay ?? 0, initialFactor: 1 })
    if (reduced) tt.angle = -0.55
    const rebuilt = angleRef.current != null
    if (rebuilt) {
      // configuration change: keep the visitor's orientation, no re-fade
      tt.angle = angleRef.current!
      ;[tt.tilt, tt.zoom] = tiltZoomRef.current ?? [0, 1]
      tt.tiltTarget = tt.tilt
      tt.zoomTarget = tt.zoom
    }
    ttRef.current = tt
    const target = new Vector3()
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360)
    let scale = 1
    // entrance: rise gently from below while fading in, then start turning
    const animate = !rebuilt && !reduced
    const clock = new EntranceClock()
    const inner = chair.userData.chair as Group
    const shadow = chair.userData.shadow as Group | undefined
    let settled = !animate
    if (animate) { tt.hold(); tt.rampTau = 0.9 }
    const stage: Stage = {
      el,
      scene,
      camera: cam,
      clear: p.surface ?? null,
      clipEl: p.clipEl ?? null,
      opacity: animate ? 0 : 1,
      resize: (w, h) => { cam.aspect = w / h; cam.updateProjectionMatrix() },
      update: (dt) => {
        let active = !settled
        const prevAngle = tt.angle
        if (!settled) {
          const k = Math.min(1, clock.tick(dt) / ENTER_MS)
          const lift = (1 - easeOutCubic(k)) * size.y * 0.12
          inner.position.y = -lift
          if (shadow) shadow.position.y = lift // the shadow stays on the floor and fades in
          stage.opacity = smoothstep(0, 0.5, k)
          if (k >= 1) { settled = true; tt.begin() }
          else if (!tt.dragging) tt.hold()
        }
        tt.update(dt)
        chair.rotation.y = tt.angle
        angleRef.current = tt.angle
        tiltZoomRef.current = [tt.tiltTarget, tt.zoomTarget]
        const s = hoverRef.current ? 1.035 : 1
        scale += (s - scale) * (1 - Math.exp(-dt / 0.09))
        chair.scale.setScalar(scale)
        // anything faster than the slow showroom turn needs every frame
        if (Math.abs(scale - s) > 1e-3 || tt.dragging || Math.abs(tt.dragVel) > 0.02 ||
          Math.abs(tt.tilt - tt.tiltTarget) > 1e-3 || Math.abs(tt.zoom - tt.zoomTarget) > 1e-3 ||
          Math.abs(tt.angle - prevAngle) > tt.speed * dt * 1.5 + 1e-4) active = true
        const m = p.margin ?? 1.18
        const el = ((p.elevation ?? 9) * Math.PI) / 180 + tt.tilt
        const fitH = (size.y * m) / (2 * tanHalf)
        const fitW = (radius * 2 * m) / (2 * tanHalf * cam.aspect)
        const D = Math.max(fitH, fitW) / tt.zoom
        target.set(0, center.y + size.y * (p.lift ?? 0) + (tt.zoom - 1) * size.y * 0.04, 0)
        cam.position.set(0, target.y + Math.sin(el) * D, Math.cos(el) * D)
        cam.lookAt(target)
        return active ? 2 : tt.speed > 0 ? 1 : 0
      },
    }
    // a real model replaces the procedural stand-in once it has loaded
    let alive = true
    let detach: (() => void) | undefined
    // show only once every shader is compiled (in parallel, off the main thread)
    eng.prepare(scene, cam).then(() => {
      if (!alive) return
      eng.add(stage)
      setReady(true)
      detach = p.interactive ? tt.attach(el, { tilt: p.tiltable, zoom: p.zoomable, onInteract: p.onInteract }) : undefined
    })
    if (p.product.modelUrl && (p.lod === 'high')) {
      loadModel(p.product.modelUrl, size.y).then((model) => {
        if (!alive) return
        const inner = chair.userData.chair as Group
        inner.clear()
        inner.add(model)
        attachShadow(model, eng)
        eng.invalidate()
      }).catch((err) => console.warn('[ChairStage] model failed, keeping procedural chair', err))
    }
    if (p.zoomable) tt.zoomRange = [1, 2.4]
    return () => {
      alive = false
      eng.remove(stage)
      detach?.()
      scene.clear()
      chairRef.current = null
    }
  }

  useEffect(() => {
    if (chairRef.current) { applyMaterials(chairRef.current, spec); engine.invalidate(); topEngine.invalidate() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specKey])

  useEffect(() => {
    if (ttRef.current && p.period) ttRef.current.setPeriod(p.period)
  }, [p.period])

  if (!ok) {
    return (
      <div className={`chair-stage is-fallback ${p.className ?? ''}`} style={{ ...p.style, background: p.surface ?? undefined }}>
        <img src={fallbackSrc(p.product.slug, p.color ?? p.product.colors[0].id, 'hero', p.config)} alt={p.label ?? `${p.product.name} chair`} loading="lazy" decoding="async" />
      </div>
    )
  }
  return (
    <div
      ref={ref}
      className={`chair-stage ${p.interactive ? 'is-interactive' : ''} ${p.className ?? ''}`}
      style={p.style}
      data-ready={ready ? 'true' : undefined}
      role={p.interactive ? 'img' : undefined}
      aria-label={p.label ?? `${p.product.name}, 3D view`}
      tabIndex={p.interactive ? 0 : undefined}
      data-zoom-free={p.freeZoom ? 'true' : undefined}
    />
  )
})
