import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, RGBAFormat, SRGBColorSpace, UnsignedByteType, type Texture } from 'three'
import type { TexKind, TexRequest } from './texWorker'

/**
 * Procedural textures — generated once in a Web Worker, tiled everywhere.
 *
 * Each accessor returns a full-size texture *immediately*, filled with a neutral
 * placeholder (flat normal, average roughness, base colour). Materials therefore
 * compile with their final shader features straight away, and when the worker
 * delivers the real pixels they are copied into the same texture — no shader
 * recompile, no main-thread work beyond a GPU upload.
 */

const SIZE = 512
const cache = new Map<string, DataTexture>()
const listeners = new Set<(t: Texture) => void>()
const pending = new Set<string>()
let settle: (() => void) | null = null

/** Resolves once every requested texture has its final pixels (used by the render studio). */
export function texturesSettled() {
  return pending.size ? new Promise<void>((r) => { const prev = settle; settle = () => { prev?.(); r() } }) : Promise.resolve()
}
let worker: Worker | null = null

export interface EnvAtlas { data: Uint16Array; width: number; height: number; error?: string }
const envRequests = new Map<string, (a: EnvAtlas) => void>()

/** Fetch + decode the pre-computed RGBE environment atlas in the worker → half-float pixels. */
let envWorker: Worker | null = null
/** Separate worker so the environment never queues behind texture generation. */
export function loadEnvAtlas(url: string) {
  return new Promise<EnvAtlas>((resolve, reject) => {
    const key = '__env:' + url
    envRequests.set(key, (a) => (a.error ? reject(new Error(a.error)) : resolve(a)))
    if (!envWorker) {
      envWorker = new Worker(new URL('./texWorker.ts', import.meta.url), { type: 'module' })
      envWorker.onmessage = (e: MessageEvent<EnvAtlas & { key: string }>) => {
        const cb = envRequests.get(e.data.key)
        envRequests.delete(e.data.key)
        cb?.(e.data)
      }
    }
    envWorker.postMessage({ key, kind: 'env', url })
  })
}

/** Called whenever a texture receives its final pixels (stages redraw). */
export function onTextureUpdate(fn: (t: Texture) => void) { listeners.add(fn); return () => listeners.delete(fn) }

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./texWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ key: string; data: Uint8Array }>) => {
      const envCb = envRequests.get(e.data.key)
      if (envCb) { envRequests.delete(e.data.key); envCb(e.data as unknown as EnvAtlas); return }
      const t = cache.get(e.data.key)
      if (!t) return
      ;(t.image.data as Uint8Array).set(e.data.data)
      t.needsUpdate = true
      pending.delete(e.data.key)
      if (!pending.size && settle) { const f = settle; settle = null; f() }
      listeners.forEach((l) => l(t))
    }
  }
  return worker
}

function make(key: string, kind: TexKind, fill: [number, number, number, number], opts: { color?: boolean; param?: string } = {}): Texture {
  let t = cache.get(key)
  if (t) return t
  const data = new Uint8Array(SIZE * SIZE * 4)
  for (let i = 0; i < data.length; i += 4) { data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = fill[3] }
  t = new DataTexture(data, SIZE, SIZE, RGBAFormat, UnsignedByteType)
  t.wrapS = t.wrapT = RepeatWrapping
  t.magFilter = LinearFilter
  t.minFilter = LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.anisotropy = 8
  t.colorSpace = opts.color ? SRGBColorSpace : NoColorSpace
  t.needsUpdate = true
  cache.set(key, t)
  pending.add(key)
  const req: TexRequest = { key, kind, param: opts.param, size: SIZE }
  getWorker().postMessage(req)
  return t
}

const FLAT_N: [number, number, number, number] = [128, 128, 255, 255]
const hexRGB = (h: string): [number, number, number, number] => {
  const c = parseInt(h.slice(1), 16)
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255, 255]
}

/** Plain-weave upholstery fabric */
export const fabricNormal = () => make('fabricN', 'fabricN', FLAT_N)
export const fabricRough = () => make('fabricR', 'fabricR', [224, 224, 224, 255])
/** Heavy looped bouclé */
export const boucleNormal = () => make('boucleN', 'boucleN', FLAT_N)
/** Pebbled leather grain */
export const leatherNormal = () => make('leatherN', 'leatherN', FLAT_N)
export const leatherRough = () => make('leatherR', 'leatherR', [133, 133, 133, 255])
/** Knitted 3D mesh for task-chair backs (alpha) */
export const meshAlpha = () => make('meshA', 'meshA', [255, 255, 255, 150])
/** Oak / walnut grain colour map */
export const woodColor = (base: string) => make('wood' + base, 'wood', hexRGB(base), { color: true, param: base })
