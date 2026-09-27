/**
 * Dev-only performance probe: records long main-thread tasks and frame
 * intervals from the very start of the app. Inspect via `window.__perf`.
 */
type Perf = {
  timings: [string, number, number][]
  time: <T>(label: string, fn: () => T) => T
  longTasks: [number, number][]
  frames: number[]
  frameEnds: number[]
  marks: Record<string, number>
  mark: (name: string) => void
  reset: () => void
}

const perf: Perf = {
  timings: [],
  time(label, fn) {
    const t = performance.now()
    const r = fn()
    const d = performance.now() - t
    if (d > 4) this.timings.push([label, Math.round(d), Math.round(t)])
    return r
  },
  longTasks: [],
  frames: [],
  frameEnds: [],
  marks: {},
  mark(name) { if (!(name in this.marks)) { this.marks[name] = Math.round(performance.now()); try { performance.mark(name) } catch { /* noop */ } } },
  reset() { this.longTasks = []; this.frames = []; this.frameEnds = []; this.marks = {}; this.timings = [] },
}

try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) perf.longTasks.push([Math.round(e.startTime), Math.round(e.duration)])
  }).observe({ type: 'longtask', buffered: true })
} catch { /* unsupported */ }

let last = performance.now()
const tick = (t: number) => {
  perf.frames.push(Math.round((t - last) * 10) / 10)
  perf.frameEnds.push(Math.round(t))
  if (perf.frames.length > 2000) { perf.frames.shift(); perf.frameEnds.shift() }
  last = t
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

;(window as unknown as { __perf: Perf }).__perf = perf
export {}
