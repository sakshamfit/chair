import {
  BufferGeometry,
  BoxGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Vector2,
  Vector3,
  CatmullRomCurve3,
} from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/* ------------------------------------------------------------------ */
/* Rounded slab — the workhorse for cushions, pads, housings.          */
/* A dense box grid, remapped so the rounded edges get their own        */
/* segments, projected onto a rounded box, then optionally deformed.    */
/* ------------------------------------------------------------------ */

export interface SlabOptions {
  /** segments across the flat part of each axis */
  seg?: [number, number, number]
  /** segments inside each rounded edge */
  edgeSeg?: number
  /** radius of the rounded edges; may differ per axis */
  radius?: number
  /** deform every vertex (in local metres, after rounding). `face` is the dominant outward axis sign of the source box face */
  deform?: (v: Vector3, face: Vector3) => void
  /** world metres per UV unit (keeps fabric texel density constant) */
  uvScale?: number
}

function edgeRemap(n: number, e: number, half: number, r: number) {
  // n = flat segments, e = segments per rounded zone. returns positions for i in [0, n+2e]
  const total = n + 2 * e
  const out: number[] = []
  for (let i = 0; i <= total; i++) {
    if (i <= e) out.push(-half + (i / e) * r)
    else if (i >= total - e) out.push(half - r + ((i - (total - e)) / e) * r)
    else out.push(-half + r + ((i - e) / n) * (2 * half - 2 * r))
  }
  return out
}

export function roundedSlab(w: number, h: number, d: number, opts: SlabOptions = {}) {
  const r = Math.min(opts.radius ?? Math.min(w, h, d) * 0.3, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)
  const [sx, sy, sz] = opts.seg ?? [8, 8, 2]
  const e = opts.edgeSeg ?? 5
  const geo = new BoxGeometry(1, 1, 1, sx + 2 * e, sy + 2 * e, sz + 2 * e)
  const pos = geo.getAttribute('position')
  const nrm = geo.getAttribute('normal')
  const mapX = edgeRemap(sx, e, w / 2, r)
  const mapY = edgeRemap(sy, e, h / 2, r)
  const mapZ = edgeRemap(sz, e, d / 2, r)
  const tx = sx + 2 * e, ty = sy + 2 * e, tz = sz + 2 * e
  const v = new Vector3(), q = new Vector3(), face = new Vector3()
  const inner = new Vector3(w / 2 - r, h / 2 - r, d / 2 - r)
  for (let i = 0; i < pos.count; i++) {
    const ix = Math.round((pos.getX(i) + 0.5) * tx)
    const iy = Math.round((pos.getY(i) + 0.5) * ty)
    const iz = Math.round((pos.getZ(i) + 0.5) * tz)
    v.set(mapX[ix], mapY[iy], mapZ[iz])
    q.set(
      Math.max(-inner.x, Math.min(inner.x, v.x)),
      Math.max(-inner.y, Math.min(inner.y, v.y)),
      Math.max(-inner.z, Math.min(inner.z, v.z)),
    )
    const dx = v.x - q.x, dy = v.y - q.y, dz = v.z - q.z
    const len = Math.hypot(dx, dy, dz)
    if (len > 1e-9) v.set(q.x + (dx / len) * r, q.y + (dy / len) * r, q.z + (dz / len) * r)
    face.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i))
    opts.deform?.(v, face)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  return finalize(geo, opts.uvScale ?? 0.13)
}

/** Weld, recompute smooth normals and box-project UVs. */
export function finalize(geo: BufferGeometry, uvScale = 0.25) {
  geo.deleteAttribute('normal')
  geo.deleteAttribute('uv')
  const merged = mergeVertices(geo, 1e-6)
  merged.computeVertexNormals()
  boxUV(merged, uvScale)
  geo.dispose()
  return merged
}

export function boxUV(geo: BufferGeometry, scale = 0.25) {
  const pos = geo.getAttribute('position')
  const nrm = geo.getAttribute('normal')
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i))
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    let u: number, w: number
    if (nx >= ny && nx >= nz) { u = z; w = y } else if (ny >= nz) { u = x; w = z } else { u = x; w = y }
    uv[i * 2] = u / scale
    uv[i * 2 + 1] = w / scale
  }
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2))
}

/* ------------------------------------------------------------------ */
/* Sweep — tube with elliptical, variable cross-section along a path.  */
/* ------------------------------------------------------------------ */

export interface SweepOptions {
  /** radius at t ∈ [0,1]; number or [vertical, horizontal] half-sizes */
  radius: number | [number, number] | ((t: number) => number | [number, number])
  tubular?: number
  radial?: number
  closed?: boolean
  caps?: boolean
  /** reference "up" used to orient elliptical sections */
  up?: Vector3
  tension?: number
  uvScale?: number
}

export function sweep(points: Vector3[], o: SweepOptions) {
  const curve = new CatmullRomCurve3(points, !!o.closed, 'catmullrom', o.tension ?? 0.5)
  const tubular = o.tubular ?? 48
  const radial = o.radial ?? 16
  const up = (o.up ?? new Vector3(0, 1, 0)).clone().normalize()
  const R0 = o.radius
  const rf = typeof R0 === 'function' ? R0 : () => R0
  const positions: number[] = []
  const indices: number[] = []
  const T = new Vector3(), N = new Vector3(), B = new Vector3(), P = new Vector3()
  const rings = o.closed ? tubular : tubular + 1
  const len = curve.getLength()
  for (let i = 0; i < rings; i++) {
    const t = i / tubular
    curve.getPointAt(t, P)
    curve.getTangentAt(t, T).normalize()
    N.copy(up).addScaledVector(T, -up.dot(T))
    if (N.lengthSq() < 1e-6) N.set(1, 0, 0).addScaledVector(T, -T.x)
    N.normalize()
    B.crossVectors(T, N).normalize()
    const rr = rf(t)
    const [rn, rb] = Array.isArray(rr) ? rr : [rr, rr]
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const c = Math.cos(a), s = Math.sin(a)
      positions.push(P.x + N.x * c * rn + B.x * s * rb, P.y + N.y * c * rn + B.y * s * rb, P.z + N.z * c * rn + B.z * s * rb)
    }
  }
  for (let i = 0; i < tubular; i++) {
    const i2 = o.closed ? (i + 1) % rings : i + 1
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial
      const a = i * radial + j, b = i2 * radial + j, c = i2 * radial + j2, d = i * radial + j2
      indices.push(a, b, d, b, c, d)
    }
  }
  if (!o.closed && o.caps !== false) {
    for (const end of [0, rings - 1]) {
      const t = end === 0 ? 0 : 1
      curve.getPointAt(t, P)
      const center = positions.length / 3
      positions.push(P.x, P.y, P.z)
      // duplicate ring for flat cap normals
      const start = positions.length / 3
      for (let j = 0; j < radial; j++) {
        const k = (end * radial + j) * 3
        positions.push(positions[k], positions[k + 1], positions[k + 2])
      }
      for (let j = 0; j < radial; j++) {
        const j2 = (j + 1) % radial
        if (end === 0) indices.push(center, start + j2, start + j)
        else indices.push(center, start + j, start + j2)
      }
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  // uv: along length / around
  const uv = new Float32Array((positions.length / 3) * 2)
  for (let i = 0; i < rings; i++) for (let j = 0; j < radial; j++) {
    const k = (i * radial + j) * 2
    uv[k] = (j / radial) * 0.3
    uv[k + 1] = ((i / tubular) * len) / (o.uvScale ?? 0.25)
  }
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return geo
}

/* ------------------------------------------------------------------ */
/* Lathe helper — profile as [radius, y] pairs                          */
/* ------------------------------------------------------------------ */

export function lathe(profile: [number, number][], segments = 48) {
  const g = new LatheGeometry(profile.map(([r, y]) => new Vector2(Math.max(r, 0.00001), y)), segments)
  g.computeVertexNormals()
  return g
}

/** Smoothly rounded profile helper: samples a quarter circle */
export function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n = 6): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return pts
}

/* ------------------------------------------------------------------ */
/* Thick parametric surface — molded shells, buckets, lounge bodies.    */
/* ------------------------------------------------------------------ */

export function thickSurface(
  fn: (u: number, v: number, target: Vector3) => void,
  nu: number,
  nv: number,
  thickness: number | ((u: number, v: number) => number),
  opts: { uvScale?: number; rimBulge?: number } = {},
) {
  const th = typeof thickness === 'number' ? () => thickness : thickness
  const cols = nu + 1, rows = nv + 1
  const top: Vector3[] = []
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const p = new Vector3()
    fn(i / nu, j / nv, p)
    top.push(p)
  }
  const at = (i: number, j: number) => top[j * cols + i]
  const normals: Vector3[] = []
  const du = new Vector3(), dv = new Vector3()
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    du.subVectors(at(Math.min(i + 1, nu), j), at(Math.max(i - 1, 0), j))
    dv.subVectors(at(i, Math.min(j + 1, nv)), at(i, Math.max(j - 1, 0)))
    normals.push(new Vector3().crossVectors(du, dv).normalize())
  }
  const positions: number[] = []
  for (const p of top) positions.push(p.x, p.y, p.z)
  const bottomStart = top.length
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i
    const p = top[k], n = normals[k], t = th(i / nu, j / nv)
    positions.push(p.x - n.x * t, p.y - n.y * t, p.z - n.z * t)
  }
  const indices: number[] = []
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * cols + i, b = a + 1, c = a + cols + 1, d = a + cols
    indices.push(a, b, d, b, c, d)
    indices.push(bottomStart + a, bottomStart + d, bottomStart + b, bottomStart + b, bottomStart + d, bottomStart + c)
  }
  // boundary loop (counter-clockwise in parameter space)
  const loop: [number, number][] = []
  for (let i = 0; i < nu; i++) loop.push([i, 0])
  for (let j = 0; j < nv; j++) loop.push([nu, j])
  for (let i = nu; i > 0; i--) loop.push([i, nv])
  for (let j = nv; j > 0; j--) loop.push([0, j])
  const midStart = positions.length / 3
  const bulge = opts.rimBulge ?? 0.45
  for (const [i, j] of loop) {
    const k = j * cols + i
    const p = top[k], n = normals[k], t = th(i / nu, j / nv)
    // outward in-surface direction
    const out = new Vector3()
    if (i === 0) out.sub(new Vector3().subVectors(at(1, j), p))
    if (i === nu) out.add(new Vector3().subVectors(p, at(nu - 1, j)))
    if (j === 0) out.sub(new Vector3().subVectors(at(i, 1), p))
    if (j === nv) out.add(new Vector3().subVectors(p, at(i, nv - 1)))
    out.addScaledVector(n, -out.dot(n)).normalize()
    positions.push(p.x - n.x * t * 0.5 + out.x * t * bulge, p.y - n.y * t * 0.5 + out.y * t * bulge, p.z - n.z * t * 0.5 + out.z * t * bulge)
  }
  const L = loop.length
  for (let s = 0; s < L; s++) {
    const [i0, j0] = loop[s], [i1, j1] = loop[(s + 1) % L]
    const t0 = j0 * cols + i0, t1 = j1 * cols + i1
    const m0 = midStart + s, m1 = midStart + ((s + 1) % L)
    const b0 = bottomStart + t0, b1 = bottomStart + t1
    indices.push(t0, m0, t1, t1, m0, m1)
    indices.push(m0, b0, m1, m1, b0, b1)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  boxUV(geo, opts.uvScale ?? 0.13)
  return geo
}

/* ------------------------------------------------------------------ */
/* Small maths helpers                                                  */
/* ------------------------------------------------------------------ */

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z)

/** Wrap a point around a vertical cylinder of radius R centred at z = R (bends the part towards +z at its sides). */
export function wrapY(v: Vector3, R: number) {
  if (!isFinite(R) || R <= 0) return
  const a = v.x / R
  const z = v.z
  v.x = Math.sin(a) * (R - z)
  v.z = R - Math.cos(a) * (R - z)
}
