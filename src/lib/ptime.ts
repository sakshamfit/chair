/** Times `fn` when the dev perf probe is active (window.__perf); otherwise just runs it. */
export function ptime<T>(label: string, fn: () => T): T {
  const p = (globalThis as unknown as { __perf?: { time: <R>(l: string, f: () => R) => R } }).__perf
  return p ? p.time(label, fn) : fn()
}
