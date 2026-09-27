/**
 * "First screen done": resolves once the hero's chairs have risen and settled
 * (or shortly after load on pages without a hero). Background work — the idle
 * warm-up and the below-the-fold finder floor — waits for this, so nothing ever
 * competes with the opening entrance, and it's all ready before the visitor scrolls.
 */
let resolveFn: (() => void) | null = null
export const firstScreenDone = new Promise<void>((r) => { resolveFn = r })

export function markFirstScreenDone() {
  resolveFn?.()
  resolveFn = null
}

// safety net: never hold background work back for long
setTimeout(markFirstScreenDone, 4500)
