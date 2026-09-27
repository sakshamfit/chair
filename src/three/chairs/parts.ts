import { BufferGeometry, CylinderGeometry, Group, Mesh, TorusGeometry, Vector3, PlaneGeometry, MathUtils } from 'three'
import { lathe, roundedSlab, smooth, sweep, v3, wrapY, arcPts } from '../geometry'
import type { Slot } from '../materials'

/** Quality multiplier for segment counts (LOD). */
export type Q = number
const seg = (n: number, q: Q, min = 3) => Math.max(min, Math.round(n * q))

export function part(geo: BufferGeometry, slot: Slot, name?: string) {
  const m = new Mesh(geo)
  m.userData.slot = slot
  m.castShadow = true
  m.receiveShadow = false
  if (name) m.name = name
  return m
}

/* ------------------------------ BASES ------------------------------ */

export interface StarBaseOpts {
  legs?: number
  radius?: number
  hubY?: number
  tipY?: number
  legW?: number
  legH?: number
  slot?: Slot
  feet?: 'casters' | 'glides'
}

export function starBase(q: Q, o: StarBaseOpts = {}) {
  const legs = o.legs ?? 5
  const R = o.radius ?? 0.335
  const hubY = o.hubY ?? 0.108
  const tipY = o.tipY ?? (o.feet === 'glides' ? 0.03 : 0.084)
  const legW = o.legW ?? 0.052
  const legH = o.legH ?? 0.04
  const slot = o.slot ?? 'frame'
  const g = new Group()
  // hub
  g.add(part(lathe([
    [0, hubY + 0.036], [0.028, hubY + 0.036], [0.036, hubY + 0.032], [0.042, hubY + 0.018], [0.046, hubY - 0.004],
    [0.043, hubY - 0.022], [0.034, hubY - 0.03], [0, hubY - 0.03],
  ], seg(40, q)), slot, 'hub'))
  const legPts = [v3(0, hubY + 0.004, 0.02), v3(0, hubY - 0.002, R * 0.35), v3(0, hubY - 0.012, R * 0.7), v3(0, tipY + 0.012, R * 0.93), v3(0, tipY + 0.004, R)]
  const legGeo = sweep(legPts, {
    radius: (t) => [MathUtils.lerp(legH / 2, legH * 0.3, smooth(0, 1, t)), MathUtils.lerp(legW / 2, legW * 0.3, t)],
    tubular: seg(28, q), radial: seg(14, q, 6), up: new Vector3(0, 1, 0),
  })
  const bossGeo = lathe([[0, tipY + 0.012], [0.012, tipY + 0.012], [0.015, tipY + 0.006], [0.015, tipY - 0.012], [0, tipY - 0.012]], seg(20, q))
  for (let i = 0; i < legs; i++) {
    const a = (i / legs) * Math.PI * 2
    const leg = new Group()
    leg.add(part(legGeo, slot, 'leg'))
    const boss = part(bossGeo, slot)
    boss.position.z = R
    leg.add(boss)
    const foot = o.feet === 'glides' ? glide(q) : caster(q)
    foot.position.set(0, 0, R)
    foot.rotation.y = ((i * 137) % 360) * (Math.PI / 180) // natural caster swivel variance
    if (o.feet === 'glides') foot.position.y = tipY - 0.03
    leg.add(foot)
    leg.rotation.y = a
    g.add(leg)
  }
  return g
}

let casterCache: { wheel: BufferGeometry; hood: BufferGeometry; stem: BufferGeometry; hub: BufferGeometry } | null = null
export function caster(q: Q) {
  if (!casterCache || casterCache.wheel.userData.q !== q) {
    const rw = 0.026
    const wheel = lathe([
      [0.0, -0.0065], [rw - 0.004, -0.0065], [rw - 0.0005, -0.005], [rw, -0.002], [rw, 0.002], [rw - 0.0005, 0.005], [rw - 0.004, 0.0065], [0.0, 0.0065],
    ], seg(32, q, 10))
    wheel.rotateZ(Math.PI / 2)
    wheel.userData.q = q
    casterCache = {
      wheel,
      hood: roundedSlab(0.03, 0.03, 0.052, { radius: 0.012, seg: [1, 1, 2], edgeSeg: seg(4, q, 2) }),
      stem: new CylinderGeometry(0.0065, 0.0065, 0.03, seg(12, q, 6)),
      hub: new CylinderGeometry(0.009, 0.009, 0.03, seg(16, q, 6)).rotateZ(Math.PI / 2),
    }
  }
  const c = casterCache
  const g = new Group()
  const rw = 0.026
  for (const s of [-1, 1]) {
    const w = part(c.wheel, 'rubber')
    w.position.set(s * 0.0098, rw, 0.012)
    g.add(w)
  }
  const hub = part(c.hub, 'plastic')
  hub.position.set(0, rw, 0.012)
  g.add(hub)
  const hood = part(c.hood, 'plastic')
  hood.position.set(0, rw + 0.012, 0.004)
  g.add(hood)
  const stem = part(c.stem, 'chrome')
  stem.position.set(0, rw + 0.034, 0)
  g.add(stem)
  return g
}

export function glide(q: Q) {
  const g = new Group()
  g.add(part(lathe([[0, 0], [0.018, 0], [0.021, 0.004], [0.02, 0.012], [0.012, 0.022], [0, 0.024]], seg(20, q)), 'plastic'))
  return g
}

/** Gas lift column: black shroud + chrome piston. */
export function gasLift(q: Q, fromY: number, toY: number, shroudR = 0.03) {
  const g = new Group()
  const h = toY - fromY
  g.add(part(lathe([
    [0, fromY], [shroudR, fromY], [shroudR, fromY + h * 0.08], [shroudR * 0.86, fromY + h * 0.55], [shroudR * 0.8, fromY + h * 0.58], [0, fromY + h * 0.58],
  ], seg(36, q)), 'plastic', 'shroud'))
  g.add(part(lathe([[0, fromY + h * 0.5], [0.0145, fromY + h * 0.5], [0.0145, toY], [0, toY]], seg(28, q)), 'chrome', 'piston'))
  return g
}

/** Seat mechanism housing with paddle levers. */
export function mechanism(q: Q, y: number, w = 0.2, d = 0.26) {
  const g = new Group()
  const body = part(roundedSlab(w, 0.05, d, { radius: 0.014, seg: [2, 1, 2], edgeSeg: seg(4, q, 2) }), 'plastic', 'mech')
  body.position.set(0, y, -0.02)
  g.add(body)
  const lever = part(sweep([v3(w / 2 - 0.01, y - 0.005, 0.02), v3(w / 2 + 0.05, y - 0.012, 0.05), v3(w / 2 + 0.085, y - 0.018, 0.1)], {
    radius: (t) => [0.005, MathUtils.lerp(0.008, 0.013, t)], tubular: seg(12, q), radial: seg(8, q, 5),
  }), 'plastic')
  g.add(lever)
  return g
}

/* ----------------------------- CUSHIONS ----------------------------- */

export interface CushionOpts {
  crown?: number
  waterfall?: number
  dish?: number
  taperFront?: number
  radius?: number
  segBase?: number
}

/** Seat cushion centred on origin, top at +h/2, front at +z. */
export function seatCushion(q: Q, w: number, h: number, d: number, o: CushionOpts = {}) {
  const crown = o.crown ?? 0.012
  const wf = o.waterfall ?? 0.02
  const dish = o.dish ?? 0.006
  const n = o.segBase ?? 12
  return roundedSlab(w, h, d, {
    radius: o.radius ?? Math.min(h * 0.48, 0.032),
    seg: [seg(n, q), 1, seg(n, q)],
    edgeSeg: seg(6, q, 3),
    deform: (v) => {
      const top = smooth(-h / 2, h / 2, v.y)
      const nx = (2 * v.x) / w, nz = (2 * v.z) / d
      v.y += top * crown * (1 - nx * nx) * (1 - nz * nz * 0.6)
      v.y -= top * dish * Math.exp(-(nx * nx) / 0.25) * smooth(0.2, -0.6, nz)
      const f = smooth(0.55, 1, nz)
      v.y -= f * f * wf
      if (o.taperFront) v.x *= 1 - o.taperFront * smooth(0, 1, nz)
    },
  })
}

export interface BackOpts {
  wrap?: number
  lumbar?: number
  taperTop?: number
  tufts?: [number, number]
  tuftDepth?: number
  crown?: number
  radius?: number
  segBase?: number
}

/** Upholstered back pad centred on origin, front at +z. */
export function backPad(q: Q, w: number, h: number, t: number, o: BackOpts = {}) {
  const n = o.segBase ?? 12
  const tufts = o.tufts
  const segX = tufts ? seg(tufts[0] * 8, q, tufts[0] * 3) : seg(n, q)
  const segY = tufts ? seg(tufts[1] * 8, q, tufts[1] * 3) : seg(n + 4, q)
  return roundedSlab(w, h, t, {
    radius: o.radius ?? Math.min(t * 0.46, 0.03),
    seg: [segX, segY, 1],
    edgeSeg: seg(6, q, 3),
    deform: (v) => {
      const front = smooth(-t / 2, t / 2, v.z)
      const ny = (2 * v.y) / h, nx = (2 * v.x) / w
      if (o.taperTop) v.x *= 1 - o.taperTop * smooth(-0.2, 1, ny)
      v.z += (o.crown ?? 0.008) * front * (1 - nx * nx) * (1 - ny * ny * 0.5)
      if (o.lumbar) v.z += o.lumbar * Math.exp(-((ny + 0.45) ** 2) / 0.18) * (0.6 + 0.4 * front)
      if (tufts) {
        const [cx, cy] = tufts
        const inset = 0.035
        const u = (v.x + w / 2 - inset) / (w - inset * 2), vv = (v.y + h / 2 - inset) / (h - inset * 2)
        if (u > 0 && u < 1 && vv > 0 && vv < 1) {
          const su = Math.abs(Math.sin(u * cx * Math.PI)), sv = Math.abs(Math.sin(vv * cy * Math.PI))
          const pillow = Math.pow(su, 0.45) * Math.pow(sv, 0.45)
          const edgeFade = smooth(0, 0.04, Math.min(u, 1 - u, vv, 1 - vv) * 0.25)
          v.z -= front * (o.tuftDepth ?? 0.009) * (1 - pillow) * edgeFade
        }
      }
      if (o.wrap) wrapY(v, o.wrap)
    },
  })
}

/** Buttons at tuft intersections (returned in back-pad local space). */
export function tuftButtons(q: Q, w: number, h: number, t: number, tufts: [number, number], wrap?: number, depth = 0.009) {
  const g = new Group()
  const geo = lathe([[0, 0.004], [0.004, 0.0035], [0.0055, 0.001], [0.0055, -0.002], [0, -0.002]], seg(12, q, 6))
  geo.rotateX(Math.PI / 2)
  const inset = 0.035
  for (let i = 1; i < tufts[0]; i++) for (let j = 1; j < tufts[1]; j++) {
    const p = new Vector3(-w / 2 + inset + ((w - inset * 2) * i) / tufts[0], -h / 2 + inset + ((h - inset * 2) * j) / tufts[1], t / 2 - depth + 0.001)
    if (wrap) wrapY(p, wrap)
    const b = part(geo, 'upholstery')
    b.position.copy(p)
    b.lookAt(p.clone().add(new Vector3(-p.x / (wrap ?? 1e9), 0, 1)))
    g.add(b)
  }
  return g
}

/** Rounded-rectangle loop (xy plane), useful for frames and piping. */
export function roundedRectLoop(w: number, h: number, r: number, perCorner = 5) {
  const pts: Vector3[] = []
  const corners: [number, number, number][] = [
    [w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5],
  ]
  for (const [cx, cy, a0] of corners) for (const [x, y] of arcPts(cx, cy, r, a0, a0 + Math.PI / 2, perCorner)) pts.push(v3(x, y, 0))
  return pts
}

/** Mesh back: extruded frame + knitted mesh panel. */
export function meshBack(q: Q, w: number, h: number, wrap: number) {
  const g = new Group()
  const loop = roundedRectLoop(w, h, 0.09, 6).map((p) => {
    p.x *= 1 - 0.1 * smooth(-0.2, 1, (2 * p.y) / h)
    wrapY(p, wrap)
    return p
  })
  g.add(part(sweep(loop, { radius: [0.011, 0.014], closed: true, tubular: seg(120, q), radial: seg(12, q, 6), up: new Vector3(0, 0, 1) }), 'plastic', 'frame'))
  const pg = new PlaneGeometry(w - 0.02, h - 0.02, seg(24, q), seg(28, q))
  const pos = pg.getAttribute('position')
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    v.x *= 1 - 0.1 * smooth(-0.2, 1, (2 * v.y) / h)
    // sits just behind the frame, with a gentle lumbar bulge
    v.z += -0.004 + 0.014 * (1 - ((2 * v.x) / w) ** 2) * Math.exp(-(((2 * v.y) / h + 0.4) ** 2) / 0.3)
    wrapY(v, wrap)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  pg.computeVertexNormals()
  // clip corners via uv-less alpha: scale uvs for dense mesh texture
  const uv = pg.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 5, uv.getY(i) * h * 5)
  const mesh = part(pg, 'mesh', 'mesh')
  mesh.castShadow = true
  mesh.renderOrder = 2
  g.add(mesh)
  return g
}

/* ------------------------------- ARMS ------------------------------- */

export function tArms(q: Q, seatW: number, seatY: number, o: { height?: number; slot?: Slot; padSlot?: Slot; z?: number; padLen?: number } = {}) {
  const g = new Group()
  const H = o.height ?? 0.22
  const z = o.z ?? -0.04
  const pad = roundedSlab(0.072, 0.026, o.padLen ?? 0.25, { radius: 0.012, seg: [2, 1, 4], edgeSeg: seg(4, q, 2) })
  for (const s of [-1, 1]) {
    const up = sweep([
      v3(s * (seatW / 2 - 0.05), seatY - 0.06, z), v3(s * (seatW / 2 + 0.012), seatY - 0.05, z), v3(s * (seatW / 2 + 0.035), seatY + 0.02, z),
      v3(s * (seatW / 2 + 0.038), seatY + H * 0.6, z), v3(s * (seatW / 2 + 0.036), seatY + H - 0.012, z),
    ], { radius: (t) => [MathUtils.lerp(0.012, 0.016, t), MathUtils.lerp(0.02, 0.016, t)], tubular: seg(24, q), radial: seg(12, q, 6), up: new Vector3(0, 0, 1) })
    g.add(part(up, o.slot ?? 'plastic', 'arm'))
    const p = part(pad, o.padSlot ?? 'plastic', 'armpad')
    p.position.set(s * (seatW / 2 + 0.036), seatY + H, z + 0.02)
    g.add(p)
  }
  return g
}

/** Continuous polished loop arm from under the seat up to the back. */
export function loopArms(q: Q, seatW: number, seatY: number, backZ: number, o: { height?: number; slot?: Slot } = {}) {
  const g = new Group()
  const H = o.height ?? 0.21
  for (const s of [-1, 1]) {
    const x = s * (seatW / 2 + 0.03)
    const geo = sweep([
      v3(s * (seatW / 2 - 0.04), seatY - 0.055, 0.06), v3(x, seatY - 0.045, 0.1), v3(x, seatY + H * 0.55, 0.13), v3(x, seatY + H, 0.08),
      v3(x, seatY + H + 0.005, -0.06), v3(x * 0.97, seatY + H * 0.8, backZ + 0.02), v3(x * 0.9, seatY + H * 0.55, backZ),
    ], { radius: (t) => [MathUtils.lerp(0.012, 0.014, Math.sin(t * Math.PI)), 0.017], tubular: seg(56, q), radial: seg(12, q, 6), up: new Vector3(1, 0, 0) })
    g.add(part(geo, o.slot ?? 'frame', 'looparm'))
  }
  return g
}

/* ------------------------------- MISC ------------------------------- */

export function footRing(q: Q, y: number, r = 0.2, slot: Slot = 'frame') {
  const g = new Group()
  const ring = part(new TorusGeometry(r, 0.0095, seg(12, q, 6), seg(72, q, 24)), slot, 'footring')
  ring.rotation.x = Math.PI / 2
  ring.position.y = y
  g.add(ring)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6
    const spoke = part(sweep([v3(0, y + 0.01, 0.02), v3(0, y + 0.005, r * 0.6), v3(0, y, r)], { radius: [0.007, 0.012], tubular: seg(8, q), radial: seg(8, q, 5) }), slot)
    spoke.rotation.y = a
    g.add(spoke)
  }
  return g
}

/** Spine that joins the mechanism to the backrest. */
export function spine(q: Q, from: Vector3, to: Vector3, slot: Slot = 'plastic', width = 0.05) {
  const mid1 = from.clone().lerp(to, 0.33).add(v3(0, -0.02, -0.03))
  const mid2 = from.clone().lerp(to, 0.7).add(v3(0, 0, -0.02))
  return part(sweep([from, mid1, mid2, to], { radius: (t) => [MathUtils.lerp(width / 2, width * 0.4, t), MathUtils.lerp(0.014, 0.011, t)], tubular: seg(24, q), radial: seg(12, q, 6), up: new Vector3(1, 0, 0) }), slot, 'spine')
}
