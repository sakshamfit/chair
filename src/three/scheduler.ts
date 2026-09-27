/**
 * Spreads expensive 3D work (geometry builds, shadow bakes) across frames so
 * nothing ever blocks scrolling or input.
 *  - priority jobs: run at the start of animation frames, within a small time budget
 *    (things about to be seen)
 *  - idle jobs: run in browser idle time (warm-up of what *might* be seen)
 */
type Job = { fn: () => void; cancelled: boolean }
const urgent: Job[] = []
const idle: Job[] = []
let rafPending = false
let idlePending = false

const ric: (cb: (d: { timeRemaining: () => number; didTimeout: boolean }) => void, o?: { timeout: number }) => void =
  (globalThis as unknown as { requestIdleCallback?: typeof ric }).requestIdleCallback ??
  ((cb) => setTimeout(() => cb({ timeRemaining: () => 8, didTimeout: true }), 32))

function run(job: Job | undefined) {
  if (job && !job.cancelled) {
    try { job.fn() } catch (e) { console.error(e) }
  }
}

/** Per-frame budget for urgent jobs: several short jobs (bakes, uploads) share a frame. */
const FRAME_BUDGET_MS = 8

function pumpUrgent() {
  rafPending = false
  const start = performance.now()
  do run(urgent.shift())
  while (urgent.length && performance.now() - start < FRAME_BUDGET_MS)
  if (urgent.length) kickUrgent()
}
function kickUrgent() {
  if (rafPending) return
  rafPending = true
  requestAnimationFrame(pumpUrgent)
  // rAF is paused in hidden tabs; make sure queued work still completes
  setTimeout(() => { if (rafPending && document.hidden) pumpUrgent() }, 100)
}

// Background work pauses while the visitor is scrolling or dragging, and resumes shortly after.
let lastInput = 0
const markInput = () => { lastInput = performance.now() }
for (const ev of ['scroll', 'wheel', 'touchmove'] as const) addEventListener(ev, markInput, { passive: true, capture: true })

function pumpIdle(d: { timeRemaining: () => number; didTimeout: boolean }) {
  idlePending = false
  if (performance.now() - lastInput < 350) { setTimeout(kickIdle, 200); return }
  // never run idle work while urgent work is waiting
  if (!urgent.length && (d.timeRemaining() > 6 || d.didTimeout)) run(idle.shift())
  if (idle.length) kickIdle()
}
function kickIdle() {
  if (idlePending) return
  idlePending = true
  ric(pumpIdle, { timeout: 400 })
}

export function schedule(fn: () => void, priority = false) {
  const job: Job = { fn, cancelled: false }
  if (priority) { urgent.push(job); kickUrgent() } else { idle.push(job); kickIdle() }
  return () => { job.cancelled = true }
}

/** Promise form: resolves with the job's return value once it has run. */
export function scheduleAsync<T>(fn: () => T, priority = false): Promise<T> {
  return new Promise((resolve, reject) => {
    schedule(() => { try { resolve(fn()) } catch (e) { reject(e) } }, priority)
  })
}

/** Resolves after the next painted frame (lets the browser breathe between steps). */
export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
