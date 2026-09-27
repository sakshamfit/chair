/// <reference lib="webworker" />
/**
 * Procedural texture generation, off the main thread.
 * Receives { key, kind, param } and replies with an RGBA Uint8 buffer (transferred).
 * Height fields are converted to tangent-space normal maps.
 */

export type TexKind = 'fabricN' | 'fabricR' | 'boucleN' | 'leatherN' | 'leatherR' | 'meshA' | 'wood'
export interface TexRequest { key: string; kind: TexKind; param?: string; size: number }

function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

/** Tileable value noise */
function noiseField(size: number, cells: number, seed: number) {
  const r = rng(seed)
  const g = new Float32Array(cells * cells).map(() => r())
  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = (x / size) * cells, fy = (y / size) * cells
    const x0 = Math.floor(fx), y0 = Math.floor(fy)
    const tx = fx - x0, ty = fy - y0
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty)
    const a = g[(y0 % cells) * cells + (x0 % cells)]
    const b = g[(y0 % cells) * cells + ((x0 + 1) % cells)]
    const c = g[((y0 + 1) % cells) * cells + (x0 % cells)]
    const d = g[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)]
    out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
  }
  return out
}

function fbm(size: number, octaves: [number, number][], seed: number) {
  const out = new Float32Array(size * size)
  octaves.forEach(([cells, amp], i) => {
    const n = noiseField(size, cells, seed + i * 97)
    for (let k = 0; k < out.length; k++) out[k] += n[k] * amp
  })
  return out
}

function heightToNormal(h: Float32Array, size: number, strength: number) {
  const out = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = h[y * size + ((x - 1 + size) % size)], r = h[y * size + ((x + 1) % size)]
    const u = h[((y - 1 + size) % size) * size + x], d = h[((y + 1) % size) * size + x]
    let nx = (l - r) * strength, ny = (d - u) * strength, nz = 1
    const len = Math.hypot(nx, ny, nz)
    nx /= len; ny /= len; nz /= len
    const k = (y * size + x) * 4
    out[k] = (nx * 0.5 + 0.5) * 255
    out[k + 1] = (ny * 0.5 + 0.5) * 255
    out[k + 2] = (nz * 0.5 + 0.5) * 255
    out[k + 3] = 255
  }
  return out
}

function gray(h: Float32Array, lo: number, hi: number) {
  const out = new Uint8Array(h.length * 4)
  let min = Infinity, max = -Infinity
  for (const v of h) { if (v < min) min = v; if (v > max) max = v }
  for (let i = 0; i < h.length; i++) {
    const t = (h[i] - min) / (max - min || 1)
    const g = (lo + (hi - lo) * t) * 255
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = g
    out[i * 4 + 3] = 255
  }
  return out
}

const generators: Record<TexKind, (s: number, param?: string) => Uint8Array> = {
  /** Plain-weave upholstery fabric */
  fabricN: (s) => {
    const h = new Float32Array(s * s)
    const threads = 64
    const n = fbm(s, [[32, 0.35], [128, 0.25]], 7)
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const u = (x / s) * threads, v = (y / s) * threads
      const over = (Math.floor(u) + Math.floor(v)) % 2 === 0
      const warp = Math.sin((u % 1) * Math.PI), weft = Math.sin((v % 1) * Math.PI)
      h[y * s + x] = (over ? warp * 0.9 + weft * 0.35 : weft * 0.9 + warp * 0.35) + n[y * s + x] * 0.6
    }
    return heightToNormal(h, s, 2.2)
  },
  fabricR: (s) => gray(fbm(s, [[16, 0.6], [64, 0.4]], 3), 0.78, 0.98),
  /** Heavy looped bouclé */
  boucleN: (s) => {
    const h = fbm(s, [[24, 0.4], [48, 0.5], [96, 0.6], [192, 0.3]], 11)
    const r = rng(5)
    for (let i = 0; i < 2600; i++) {
      const cx = r() * s, cy = r() * s, rad = 3 + r() * 4
      for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
        const d = Math.hypot(x, y)
        const ring = Math.exp(-((d - rad) ** 2) / 2.2)
        const px = (((Math.floor(cx) + x) % s) + s) % s, py = (((Math.floor(cy) + y) % s) + s) % s
        h[py * s + px] += ring * 0.5
      }
    }
    return heightToNormal(h, s, 3.2)
  },
  /** Pebbled leather grain (Worley cells) */
  leatherN: (s) => {
    const h = new Float32Array(s * s)
    const r = rng(21)
    const pts: [number, number][] = Array.from({ length: 900 }, () => [r() * s, r() * s])
    const G = 24, bucket: number[][] = Array.from({ length: G * G }, () => [])
    pts.forEach(([x, y], i) => bucket[Math.floor((y / s) * G) * G + Math.floor((x / s) * G)].push(i))
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const gx = Math.floor((x / s) * G), gy = Math.floor((y / s) * G)
      let d1 = 1e9, d2 = 1e9
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const bx = (gx + ox + G) % G, by = (gy + oy + G) % G
        for (const i of bucket[by * G + bx]) {
          let dx = Math.abs(pts[i][0] - x), dy = Math.abs(pts[i][1] - y)
          if (dx > s / 2) dx = s - dx
          if (dy > s / 2) dy = s - dy
          const d = dx * dx + dy * dy
          if (d < d1) { d2 = d1; d1 = d } else if (d < d2) d2 = d
        }
      }
      h[y * s + x] = Math.min(1, (Math.sqrt(d2) - Math.sqrt(d1)) / 5)
    }
    const n = fbm(s, [[8, 1]], 2)
    for (let i = 0; i < h.length; i++) h[i] = h[i] * 0.8 + n[i] * 0.4
    return heightToNormal(h, s, 1.6)
  },
  leatherR: (s) => gray(fbm(s, [[6, 0.5], [24, 0.3], [96, 0.2]], 9), 0.42, 0.62),
  /** Knitted 3D mesh for task-chair backs (alpha) */
  meshA: (s) => {
    const out = new Uint8Array(s * s * 4)
    const cells = 40
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const u = ((x / s) * cells) % 1, v = ((y / s) * cells * 0.72) % 1
      const du = Math.abs(u - 0.5) * 2, dv = Math.abs(v - 0.5) * 2
      const hole = Math.max(du * 0.85 + dv * 0.5, dv)
      const k = (y * s + x) * 4
      out[k] = out[k + 1] = out[k + 2] = 255
      out[k + 3] = hole > 0.72 ? 255 : Math.max(0, Math.min(255, (hole - 0.55) * 1500))
    }
    return out
  },
  /** Wood grain colour map; param = base hex colour */
  wood: (s, base = '#c79d6b') => {
    const c = parseInt(base.slice(1), 16)
    const R = (c >> 16) & 255, Gc = (c >> 8) & 255, B = c & 255
    const out = new Uint8Array(s * s * 4)
    const n = fbm(s, [[4, 1], [16, 0.5]], 13)
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = y * s + x
      const grain = Math.sin((x / s) * 90 + n[i] * 14) * 0.5 + 0.5
      const f = 0.86 + grain * 0.14 - n[i] * 0.06
      out[i * 4] = R * f; out[i * 4 + 1] = Gc * f; out[i * 4 + 2] = B * f; out[i * 4 + 3] = 255
    }
    return out
  },
}

/* ---------------- pre-computed reflection environment (RGBE PNG → half floats) ---------------- */

const f32 = new Float32Array(1)
const u32 = new Uint32Array(f32.buffer)
function toHalf(v: number) {
  f32[0] = v
  const x = u32[0]
  const sign = (x >> 16) & 0x8000
  const e = ((x >> 23) & 0xff) - 127 + 15
  let m = x & 0x7fffff
  if (e <= 0) { if (e < -10) return sign; m = (m | 0x800000) >> (1 - e); return sign | (m >> 13) }
  if (e >= 31) return sign | 0x7c00
  return sign | (e << 10) | (m >> 13)
}

async function decodeRGBEPng(url: string) {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer())
  const dv = new DataView(buf.buffer)
  let p = 8, w = 0, h = 0
  const idat: Uint8Array[] = []
  while (p < buf.length) {
    const len = dv.getUint32(p)
    const type = String.fromCharCode(buf[p + 4], buf[p + 5], buf[p + 6], buf[p + 7])
    if (type === 'IHDR') { w = dv.getUint32(p + 8); h = dv.getUint32(p + 12) }
    else if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len))
    else if (type === 'IEND') break
    p += 12 + len
  }
  const inflated = new Blob(idat as BlobPart[]).stream().pipeThrough(new DecompressionStream('deflate'))
  const raw = new Uint8Array(await new Response(inflated).arrayBuffer())
  const stride = w * 4
  const px = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]
    const src = y * (stride + 1) + 1, dst = y * stride, up = (y - 1) * stride
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i]
      const a = i >= 4 ? px[dst + i - 4] : 0
      const b = y > 0 ? px[up + i] : 0
      const c = i >= 4 && y > 0 ? px[up + i - 4] : 0
      let v = x
      if (f === 1) v = x + a
      else if (f === 2) v = x + b
      else if (f === 3) v = x + ((a + b) >> 1)
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) }
      px[dst + i] = v & 255
    }
  }
  const half = new Uint16Array(w * h * 4)
  const one = toHalf(1)
  for (let i = 0; i < w * h; i++) {
    const E = px[i * 4 + 3]
    if (E) {
      const f = Math.pow(2, E - 136)
      half[i * 4] = toHalf((px[i * 4] + 0.5) * f)
      half[i * 4 + 1] = toHalf((px[i * 4 + 1] + 0.5) * f)
      half[i * 4 + 2] = toHalf((px[i * 4 + 2] + 0.5) * f)
    }
    half[i * 4 + 3] = one
  }
  return { data: half, width: w, height: h }
}

self.onmessage = async (e: MessageEvent<TexRequest | { key: string; kind: 'env'; url: string }>) => {
  if (e.data.kind === 'env') {
    const { key, url } = e.data as { key: string; url: string }
    try {
      const env = await decodeRGBEPng(url)
      ;(self as unknown as Worker).postMessage({ key, ...env }, [env.data.buffer])
    } catch (err) {
      ;(self as unknown as Worker).postMessage({ key, error: String(err) })
    }
    return
  }
  const { key, kind, param, size } = e.data as TexRequest
  const data = generators[kind](size, param)
  ;(self as unknown as Worker).postMessage({ key, data }, [data.buffer])
}
