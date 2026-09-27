/**
 * Slow showroom turntable.
 * - Auto-rotates at `period` seconds / revolution, starting at a phase offset.
 * - Drag overrides; release keeps a little inertia.
 * - After `resumeDelay` ms of inactivity auto-rotation eases back in from the
 *   *current* orientation (never snaps back to a start angle).
 */
export class Turntable {
  angle: number
  speed: number
  factor = 0
  dragVel = 0
  dragging = false
  lastInteract = -Infinity
  resumeDelay = 1500
  /** vertical orbit (radians), optional */
  tilt = 0
  tiltTarget = 0
  tiltRange: [number, number] = [-0.12, 0.45]
  zoom = 1
  zoomTarget = 1
  zoomRange: [number, number] = [1, 1]
  hoverBoost = 0
  /** time constant (s) for auto-rotation easing in/out */
  rampTau = 0.28
  private boost = 0
  private startDelay: number

  constructor(o: { period: number; phase?: number; startDelay?: number; reduced?: boolean; initialFactor?: number }) {
    this.speed = o.reduced ? 0 : (Math.PI * 2) / o.period
    this.angle = (o.phase ?? 0) * Math.PI * 2
    this.startDelay = o.startDelay ?? 0
    this.factor = o.initialFactor ?? 0
  }

  setPeriod(p: number) { this.speed = (Math.PI * 2) / p }

  update(dt: number, nowMs = performance.now()) {
    if (this.startDelay > 0) { this.startDelay -= dt * 1000; return true }
    if (!this.dragging) {
      this.angle += this.dragVel * dt
      this.dragVel *= Math.exp(-dt * 3.2)
      if (Math.abs(this.dragVel) < 0.002) this.dragVel = 0
      const idle = nowMs - this.lastInteract > this.resumeDelay
      const target = idle ? 1 : 0
      // ~600ms ease back into motion
      this.factor += (target - this.factor) * (1 - Math.exp(-dt / (target > this.factor ? this.rampTau : 0.28)))
      this.boost += (this.hoverBoost - this.boost) * (1 - Math.exp(-dt / 0.25))
      this.angle += this.speed * this.factor * (1 + this.boost) * dt
    }
    this.tilt += (this.tiltTarget - this.tilt) * (1 - Math.exp(-dt / 0.12))
    this.zoom += (this.zoomTarget - this.zoom) * (1 - Math.exp(-dt / 0.14))
    return true
  }

  /** Wire pointer + wheel + keyboard interaction to an element. Returns detach fn. */
  attach(el: HTMLElement, o: { tilt?: boolean; zoom?: boolean; onInteract?: () => void } = {}) {
    let lastX = 0, lastY = 0, lastT = 0, pid = -1
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      pid = e.pointerId
      el.setPointerCapture(e.pointerId)
      this.dragging = true
      this.dragVel = 0
      lastX = e.clientX; lastY = e.clientY; lastT = performance.now()
      this.lastInteract = lastT
      el.dataset.dragging = 'true'
      o.onInteract?.()
    }
    const move = (e: PointerEvent) => {
      if (!this.dragging || e.pointerId !== pid) return
      const now = performance.now()
      const dx = e.clientX - lastX, dy = e.clientY - lastY
      const k = 5.2 / Math.max(320, el.clientWidth)
      this.angle += dx * k
      const dtS = Math.max(1, now - lastT) / 1000
      this.dragVel = this.dragVel * 0.6 + ((dx * k) / dtS) * 0.4
      if (o.tilt) this.tiltTarget = Math.max(this.tiltRange[0], Math.min(this.tiltRange[1], this.tiltTarget + dy * k * 0.6))
      lastX = e.clientX; lastY = e.clientY; lastT = now
      this.lastInteract = now
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      this.dragging = false
      this.dragVel = Math.max(-4, Math.min(4, this.dragVel))
      if (performance.now() - lastT > 80) this.dragVel = 0
      this.lastInteract = performance.now()
      delete el.dataset.dragging
      pid = -1
    }
    const wheel = (e: WheelEvent) => {
      if (!o.zoom || !(e.ctrlKey || e.metaKey || el.dataset.zoomFree === 'true')) return
      e.preventDefault()
      this.zoomTarget = Math.max(this.zoomRange[0], Math.min(this.zoomRange[1], this.zoomTarget * Math.exp(-e.deltaY * 0.0015)))
      this.lastInteract = performance.now()
    }
    const key = (e: KeyboardEvent) => {
      const step = Math.PI / 12
      if (e.key === 'ArrowLeft') this.angle -= step
      else if (e.key === 'ArrowRight') this.angle += step
      else if (o.tilt && e.key === 'ArrowUp') this.tiltTarget = Math.min(this.tiltRange[1], this.tiltTarget + 0.08)
      else if (o.tilt && e.key === 'ArrowDown') this.tiltTarget = Math.max(this.tiltRange[0], this.tiltTarget - 0.08)
      else if (o.zoom && (e.key === '+' || e.key === '=')) this.zoomTarget = Math.min(this.zoomRange[1], this.zoomTarget * 1.15)
      else if (o.zoom && e.key === '-') this.zoomTarget = Math.max(this.zoomRange[0], this.zoomTarget / 1.15)
      else return
      e.preventDefault()
      this.lastInteract = performance.now()
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('keydown', key)
    }
  }

  /** Hold still (entrance in progress). */
  hold() { this.factor = 0; this.lastInteract = performance.now() }

  /** Begin auto-rotation now, easing in over ~3×rampTau. */
  begin() { this.lastInteract = performance.now() - this.resumeDelay }

  reset() {
    this.tiltTarget = 0
    this.zoomTarget = 1
    this.lastInteract = performance.now() - this.resumeDelay + 300
  }
}
