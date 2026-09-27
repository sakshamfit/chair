import { Group, MathUtils, Vector3, CatmullRomCurve3 } from 'three'
import { lathe, roundedSlab, smooth, sweep, thickSurface, v3, lerp } from '../geometry'
import {
  backPad, footRing, gasLift, loopArms, mechanism, meshBack, part, seatCushion, spine, starBase, tArms, tuftButtons, glide, type Q,
} from './parts'

export type ChairType =
  | 'task-mesh' | 'task-tufted' | 'task-soft' | 'task-light'
  | 'exec-ribbed' | 'exec-bucket'
  | 'conf-shell' | 'visitor-wood' | 'meeting-cantilever'
  | 'stool-drafting' | 'stool-perch'
  | 'lounge-club' | 'lounge-pedestal'

export interface BuildOpts { arms: boolean }

const SEAT_Y = 0.47

/* ---------------------------- TASK CHAIRS ---------------------------- */

function taskBase(q: Q, g: Group, seatW = 0.5) {
  g.add(starBase(q))
  g.add(gasLift(q, 0.14, 0.37))
  g.add(mechanism(q, 0.375))
  const pan = part(roundedSlab(seatW - 0.03, 0.018, 0.45, { radius: 0.008, seg: [2, 1, 2], edgeSeg: Math.max(2, Math.round(3 * q)) }), 'plastic', 'pan')
  pan.position.set(0, 0.41, 0.02)
  g.add(pan)
  const seat = part(seatCushion(q, seatW, 0.07, 0.48, { crown: 0.012, waterfall: 0.022 }), 'upholstery', 'seat')
  seat.position.set(0, SEAT_Y - 0.035, 0.025)
  g.add(seat)
}

function placeBack(obj: Group | ReturnType<typeof part>, y: number, z: number, tilt: number) {
  obj.position.set(0, y, z)
  obj.rotation.x = -tilt
  return obj
}

function taskChair(q: Q, kind: 'mesh' | 'tufted' | 'soft' | 'light', o: BuildOpts) {
  const g = new Group()
  taskBase(q, g)
  const backY = 0.8, backZ = -0.255, tilt = 0.15
  const W = 0.47, H = kind === 'light' ? 0.5 : 0.56, T = 0.07
  const wrap = 0.62
  if (kind === 'mesh') {
    const b = new Group()
    b.add(meshBack(q, W, H, wrap))
    g.add(placeBack(b, backY, backZ, tilt))
  } else if (kind === 'tufted' || kind === 'soft') {
    const b = new Group()
    const tufts: [number, number] | undefined = kind === 'tufted' ? [4, 5] : undefined
    const pad = part(backPad(q, W, H, T, { wrap, lumbar: 0.012, tufts, tuftDepth: 0.01, taperTop: 0.06, crown: 0.01 }), 'upholstery', 'back')
    b.add(pad)
    if (tufts) b.add(tuftButtons(q, W, H, T, tufts, wrap, 0.01))
    // thin rear shell
    const shell = part(backPad(q, W - 0.012, H - 0.012, 0.02, { wrap, taperTop: 0.06, crown: 0 }), 'plastic', 'backshell')
    shell.position.z = -T / 2 - 0.004
    b.add(shell)
    g.add(placeBack(b, backY, backZ, tilt))
  } else {
    // flexible molded back shell with a horizontal slot
    const b = new Group()
    const shell = thickSurface((u, v, p) => {
      const x = (u - 0.5) * W * (1 - 0.12 * smooth(0.2, 1, v))
      const y = (v - 0.5) * H
      const nx = (2 * x) / W
      p.set(x, y, 0.05 * nx * nx + 0.018 * Math.exp(-((v - 0.3) ** 2) / 0.03))
      p.z -= 0.0
    }, Math.round(28 * q), Math.round(28 * q), 0.012, { rimBulge: 0.6 })
    b.add(part(shell, 'shell', 'backshell'))
    g.add(placeBack(b, backY - 0.02, backZ + 0.03, tilt))
  }
  g.add(spine(q, v3(0, 0.39, -0.1), v3(0, kind === 'light' ? 0.58 : 0.56, -0.305)))
  if (o.arms) {
    if (kind === 'tufted' || kind === 'light') g.add(tArms(q, 0.5, SEAT_Y, { slot: 'frame', padSlot: 'plastic' }))
    else g.add(tArms(q, 0.5, SEAT_Y))
  }
  return g
}

/* -------------------------- EXECUTIVE CHAIRS ------------------------- */

function execRibbed(q: Q, o: BuildOpts) {
  const g = new Group()
  g.add(starBase(q, { radius: 0.345, legW: 0.058, legH: 0.044 }))
  g.add(gasLift(q, 0.14, 0.38))
  g.add(mechanism(q, 0.385, 0.22, 0.3))
  const W = 0.5
  // seat: three soft pads
  const seatPad = seatCushion(q, W, 0.075, 0.17, { crown: 0.01, waterfall: 0, dish: 0, radius: 0.032 })
  const zs = [0.17, 0.0, -0.17]
  zs.forEach((z, i) => {
    const p = part(seatPad, 'upholstery', 'seatpad')
    p.position.set(0, SEAT_Y - 0.03 - i * 0.006, z + 0.02)
    p.rotation.x = i === 0 ? 0.08 : 0
    g.add(p)
  })
  // back: six stacked pads following a lumbar curve
  const curve = new CatmullRomCurve3([v3(0, 0.56, -0.27), v3(0, 0.72, -0.285), v3(0, 0.94, -0.33), v3(0, 1.12, -0.37)])
  const pad = backPad(q, 0.48, 0.1, 0.075, { wrap: 0.7, crown: 0.012, radius: 0.034 })
  const N = 6
  const railL: Vector3[] = [], railR: Vector3[] = []
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t)
    const m = part(pad, 'upholstery', 'backpad')
    m.position.copy(p)
    m.rotation.x = -Math.atan2(-tan.z, tan.y)
    g.add(m)
  }
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const p = curve.getPointAt(t)
    railL.push(v3(-0.262, p.y, p.z - 0.004 + 0.06))
    railR.push(v3(0.262, p.y, p.z - 0.004 + 0.06))
  }
  // side rails continue under the seat to the mechanism
  for (const [rail, s] of [[railL, -1], [railR, 1]] as const) {
    const pts = [v3(s * 0.1, 0.4, -0.06), v3(s * 0.2, 0.41, -0.16), v3(s * 0.262, 0.46, -0.24), ...rail.slice(1)]
    g.add(part(sweep(pts, { radius: (t) => [MathUtils.lerp(0.02, 0.015, t), 0.012], tubular: Math.round(64 * q), radial: Math.round(12 * q), up: new Vector3(1, 0, 0) }), 'frame', 'rail'))
  }
  if (o.arms) g.add(tArms(q, 0.52, SEAT_Y, { slot: 'frame', padSlot: 'upholstery', height: 0.23, padLen: 0.27 }))
  return g
}

/** Bucket body: wraps from one arm around the back to the other. */
function bucketShell(q: Q, o: { R: number; thetaMax: number; yBot: number; yTop: number; armDrop: number; cz: number; thick: number; flare: number }) {
  return thickSurface((u, v, p) => {
    const th = (u - 0.5) * 2 * o.thetaMax
    const a = Math.abs(th) / o.thetaMax
    const top = o.yTop - o.armDrop * smooth(0.35, 0.95, a)
    const y = lerp(o.yBot, top, v)
    const R = o.R * (1 + o.flare * v) * (1 - 0.06 * (1 - v) * a)
    p.set(Math.sin(th) * R, y, o.cz - Math.cos(th) * R)
  }, Math.round(56 * q), Math.round(18 * q), o.thick, { rimBulge: 0.55, uvScale: 0.13 })
}

function execBucket(q: Q, o: BuildOpts) {
  const g = new Group()
  g.add(starBase(q, { radius: 0.345 }))
  g.add(gasLift(q, 0.14, 0.37))
  g.add(mechanism(q, 0.375))
  const body = part(bucketShell(q, { R: 0.28, thetaMax: o.arms ? 1.95 : 1.45, yBot: 0.42, yTop: 1.02, armDrop: 0.36, cz: 0.02, thick: 0.075, flare: 0.1 }), 'upholstery', 'bucket')
  body.rotation.x = -0.1
  body.position.z = -0.02
  g.add(body)
  const seat = part(seatCushion(q, 0.46, 0.09, 0.5, { crown: 0.014, waterfall: 0.025, radius: 0.04 }), 'upholstery', 'seat')
  seat.position.set(0, SEAT_Y - 0.03, 0.05)
  g.add(seat)
  return g
}

/* -------------------------- SHELL / MEETING -------------------------- */

function moldedShell(q: Q, seatY: number, o: { seatW?: number; backW?: number; waist?: number; curl?: number; thick?: number } = {}) {
  const seatW = o.seatW ?? 0.47, backW = o.backW ?? 0.47, waist = o.waist ?? 0.4, curl = o.curl ?? 0.05
  const prof = new CatmullRomCurve3([
    v3(0, seatY - 0.035, 0.235), v3(0, seatY - 0.004, 0.2), v3(0, seatY - 0.02, 0.02), v3(0, seatY - 0.01, -0.15),
    v3(0, seatY + 0.05, -0.215), v3(0, seatY + 0.2, -0.245), v3(0, seatY + 0.37, -0.285),
  ], false, 'catmullrom', 0.5)
  const P = new Vector3(), T = new Vector3()
  return thickSurface((u, v, p) => {
    prof.getPointAt(v, P)
    prof.getTangentAt(v, T)
    const nz = T.y, ny = -T.z
    let w = seatW + (waist - seatW) * smooth(0.3, 0.52, v) + (backW - waist) * smooth(0.55, 0.95, v)
    w *= 1 - 0.28 * (1 - smooth(0, 0.12, v)) ** 2 - 0.42 * (1 - smooth(1, 0.8, v)) ** 2
    const xn = (u - 0.5) * 2
    const k = curl * (0.6 + 0.4 * smooth(0.4, 0.7, v)) * (1 - 0.75 * smooth(0.8, 1, v))
    const lift = k * Math.abs(xn) ** 3
    p.set(xn * (w / 2) * (1 - 0.08 * Math.abs(xn) ** 3), P.y + ny * lift, P.z + nz * lift)
  }, Math.round(36 * q), Math.round(56 * q), o.thick ?? 0.012, { rimBulge: 0.6 })
}

function confShell(q: Q, o: BuildOpts) {
  const g = new Group()
  const seatY = SEAT_Y
  g.add(starBase(q, { legs: 4, radius: 0.31, feet: 'glides', hubY: 0.1, legW: 0.046, legH: 0.034 }))
  g.add(part(lathe([[0, 0.12], [0.022, 0.12], [0.022, seatY - 0.06], [0, seatY - 0.06]], 32), 'frame', 'column'))
  const plate = part(roundedSlab(0.18, 0.02, 0.2, { radius: 0.008, seg: [2, 1, 2], edgeSeg: 3 }), 'frame', 'plate')
  plate.position.set(0, seatY - 0.055, -0.01)
  g.add(plate)
  g.add(part(moldedShell(q, seatY, { curl: 0.06 }), 'shell', 'shell'))
  if (o.arms) {
    for (const s of [-1, 1]) {
      g.add(part(sweep([v3(s * 0.15, seatY - 0.04, 0.0), v3(s * 0.25, seatY - 0.02, 0.02), v3(s * 0.265, seatY + 0.18, 0.05), v3(s * 0.26, seatY + 0.2, -0.1), v3(s * 0.245, seatY + 0.13, -0.22)], {
        radius: 0.0085, tubular: Math.round(40 * q), radial: Math.round(10 * q), up: new Vector3(1, 0, 0),
      }), 'frame', 'armrod'))
    }
  }
  return g
}

function visitorWood(q: Q, o: BuildOpts) {
  const g = new Group()
  const seatY = 0.455
  g.add(part(moldedShell(q, seatY, { curl: o.arms ? 0.1 : 0.055, seatW: o.arms ? 0.52 : 0.46 }), 'shell', 'shell'))
  const legGeo = (sx: number, sz: number) => sweep([v3(sx * 0.15, seatY - 0.04, sz * 0.13), v3(sx * 0.2, seatY * 0.5, sz * 0.19), v3(sx * 0.235, 0.012, sz * 0.225)], {
    radius: (t) => MathUtils.lerp(0.017, 0.011, t), tubular: Math.round(16 * q), radial: Math.round(14 * q), caps: true,
  })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(part(legGeo(sx, sz), 'wood', 'leg'))
  // wire stretcher cradle
  const cross = [v3(-0.19, 0.2, -0.17), v3(0, 0.23, 0), v3(0.19, 0.2, 0.17)]
  g.add(part(sweep(cross, { radius: 0.005, tubular: 20, radial: 8 }), 'plastic', 'wire'))
  g.add(part(sweep(cross.map((p) => v3(-p.x, p.y, p.z)), { radius: 0.005, tubular: 20, radial: 8 }), 'plastic', 'wire'))
  const mount = part(roundedSlab(0.34, 0.02, 0.3, { radius: 0.008, seg: [2, 1, 2], edgeSeg: 3 }), 'wood', 'mount')
  mount.position.set(0, seatY - 0.045, -0.005)
  g.add(mount)
  return g
}

function cantilever(q: Q, o: BuildOpts) {
  const g = new Group()
  const X = 0.225, sY = 0.45, fz = 0.25, bz = -0.23
  const side = (s: number) => [
    v3(s * X, 0.86, -0.32), v3(s * X, 0.7, -0.29), v3(s * X, sY + 0.06, -0.25), v3(s * X, sY - 0.005, -0.19),
    v3(s * X, sY - 0.02, 0.05), v3(s * X, sY - 0.03, 0.2), v3(s * X, sY - 0.1, fz + 0.03), v3(s * X, 0.3, fz + 0.06),
    v3(s * X, 0.07, fz + 0.03), v3(s * X, 0.012, fz - 0.03), v3(s * X, 0.012, 0.0), v3(s * X, 0.012, bz + 0.06), v3(s * X * 0.8, 0.012, bz),
  ]
  const left = side(-1), right = side(1).reverse()
  const pts = [...left, v3(0, 0.012, bz - 0.012), ...right]
  g.add(part(sweep(pts, { radius: 0.0115, tubular: Math.round(260 * q), radial: Math.round(16 * q), tension: 0.35 }), 'frame', 'tube'))
  // arm hoops (optional)
  if (o.arms) for (const s of [-1, 1]) {
    g.add(part(sweep([v3(s * X, sY - 0.02, 0.12), v3(s * (X + 0.02), sY + 0.1, 0.16), v3(s * (X + 0.02), sY + 0.2, 0.08), v3(s * (X + 0.02), sY + 0.2, -0.12), v3(s * X, sY + 0.14, -0.26)], {
      radius: 0.0115, tubular: Math.round(60 * q), radial: Math.round(16 * q), up: new Vector3(1, 0, 0),
    }), 'frame', 'arm'))
  }
  const seat = part(seatCushion(q, 0.47, 0.06, 0.45, { crown: 0.01, waterfall: 0.018, radius: 0.026 }), 'upholstery', 'seat')
  seat.position.set(0, sY + 0.015, 0.0)
  g.add(seat)
  const back = part(backPad(q, 0.47, 0.28, 0.055, { wrap: 0.75, crown: 0.008, radius: 0.025 }), 'upholstery', 'back')
  back.position.set(0, 0.72, -0.3)
  back.rotation.x = -0.14
  g.add(back)
  return g
}

/* ------------------------------- STOOLS ------------------------------ */

function stoolDrafting(q: Q) {
  const g = new Group()
  const seatY = 0.72
  g.add(starBase(q, { radius: 0.31, feet: 'glides', legW: 0.046 }))
  g.add(gasLift(q, 0.13, seatY - 0.07, 0.032))
  g.add(footRing(q, 0.4, 0.2))
  const seat = part(lathe([
    [0, seatY + 0.012], [0.12, seatY + 0.01], [0.17, seatY + 0.002], [0.186, seatY - 0.012], [0.19, seatY - 0.03], [0.185, seatY - 0.048], [0.17, seatY - 0.056], [0, seatY - 0.056],
  ], Math.round(64 * q)), 'upholstery', 'seat')
  g.add(seat)
  g.add(part(lathe([[0, seatY - 0.056], [0.15, seatY - 0.056], [0.14, seatY - 0.07], [0, seatY - 0.07]], Math.round(40 * q)), 'plastic', 'pan'))
  return g
}

function stoolPerch(q: Q) {
  const g = new Group()
  const seatY = 0.66
  g.add(part(lathe([[0, 0], [0.2, 0], [0.215, 0.006], [0.21, 0.016], [0.12, 0.03], [0.04, 0.036], [0, 0.036]], Math.round(64 * q)), 'frame', 'disc'))
  g.add(part(lathe([[0, 0.03], [0.022, 0.03], [0.02, seatY - 0.06], [0.03, seatY - 0.05], [0, seatY - 0.04]], Math.round(32 * q)), 'chrome', 'column'))
  const seat = part(roundedSlab(0.36, 0.07, 0.32, {
    radius: 0.03, seg: [Math.round(14 * q), 1, Math.round(14 * q)], edgeSeg: 5,
    deform: (v) => {
      const nx = v.x / 0.18, nz = v.z / 0.16
      v.y += 0.035 * nx * nx - 0.02 * nz * nz * (nz < 0 ? -1 : 1) * 0.6
      v.x *= 1 - 0.35 * smooth(0, 1, nz)
    },
  }), 'upholstery', 'seat')
  seat.position.y = seatY - 0.03
  g.add(seat)
  return g
}

/* ------------------------------ LOUNGE ------------------------------- */

function loungeClub(q: Q) {
  const g = new Group()
  const soft = (w: number, h: number, d: number, r: number, crown = 0.012) => roundedSlab(w, h, d, {
    radius: r, seg: [Math.round(10 * q), Math.round(8 * q), Math.round(10 * q)], edgeSeg: Math.max(3, Math.round(7 * q)),
    deform: (v) => {
      const nx = (2 * v.x) / w, ny = (2 * v.y) / h, nz = (2 * v.z) / d
      const bulge = crown * (1 - nx * nx * 0.7) * (1 - ny * ny * 0.7) * (1 - nz * nz * 0.7)
      v.multiplyScalar(1 + bulge)
    },
  })
  const W = 0.84, D = 0.8, legH = 0.11
  const plinth = part(soft(W, 0.2, D, 0.07), 'upholstery', 'plinth')
  plinth.position.set(0, legH + 0.1, 0)
  g.add(plinth)
  for (const s of [-1, 1]) {
    const arm = part(soft(0.15, 0.36, D, 0.07, 0.02), 'upholstery', 'arm')
    arm.position.set(s * (W / 2 - 0.075), legH + 0.37, 0)
    g.add(arm)
  }
  const back = part(soft(W - 0.02, 0.48, 0.17, 0.075, 0.02), 'upholstery', 'back')
  back.position.set(0, legH + 0.46, -D / 2 + 0.085)
  back.rotation.x = -0.1
  g.add(back)
  const seat = part(soft(W - 0.3, 0.14, D - 0.22, 0.06, 0.03), 'upholstery', 'seat')
  seat.position.set(0, legH + 0.26, 0.07)
  g.add(seat)
  const cush = part(soft(W - 0.3, 0.38, 0.15, 0.06, 0.035), 'upholstery', 'backcushion')
  cush.position.set(0, legH + 0.5, -D / 2 + 0.23)
  cush.rotation.x = -0.2
  g.add(cush)
  const leg = lathe([[0, 0], [0.016, 0], [0.02, legH * 0.9], [0.022, legH + 0.02], [0, legH + 0.02]], 24)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = part(leg, 'wood', 'leg')
    l.position.set(sx * (W / 2 - 0.08), 0, sz * (D / 2 - 0.08))
    g.add(l)
  }
  return g
}

function loungePedestal(q: Q, o: BuildOpts) {
  const g = new Group()
  g.add(part(lathe([
    [0, 0], [0.27, 0], [0.275, 0.008], [0.26, 0.02], [0.18, 0.04], [0.09, 0.09], [0.055, 0.18], [0.045, 0.3], [0.05, 0.34], [0.12, 0.35], [0, 0.35],
  ], Math.round(72 * q)), 'frame', 'pedestal'))
  const body = part(bucketShell(q, { R: 0.33, thetaMax: o.arms ? 1.9 : 1.55, yBot: 0.34, yTop: 0.86, armDrop: 0.26, cz: 0.07, thick: 0.05, flare: 0.16 }), 'upholstery', 'body')
  body.rotation.x = -0.14
  g.add(body)
  // base of the bucket (seat pan)
  const pan = part(lathe([[0, 0.335], [0.3, 0.335], [0.31, 0.35], [0.3, 0.37], [0, 0.37]], Math.round(48 * q)), 'upholstery', 'pan')
  pan.scale.set(1, 1, 0.95)
  pan.position.z = 0.06
  g.add(pan)
  const seat = part(seatCushion(q, 0.54, 0.11, 0.5, { crown: 0.02, waterfall: 0.02, radius: 0.05, segBase: 14 }), 'upholstery', 'seat')
  seat.position.set(0, 0.43, 0.1)
  g.add(seat)
  return g
}

/* ------------------------------ FACTORY ------------------------------ */

export function buildFamily(type: ChairType, q: Q, o: BuildOpts): Group {
  switch (type) {
    case 'task-mesh': return taskChair(q, 'mesh', o)
    case 'task-tufted': return taskChair(q, 'tufted', o)
    case 'task-soft': return taskChair(q, 'soft', o)
    case 'task-light': return taskChair(q, 'light', o)
    case 'exec-ribbed': return execRibbed(q, o)
    case 'exec-bucket': return execBucket(q, o)
    case 'conf-shell': return confShell(q, o)
    case 'visitor-wood': return visitorWood(q, o)
    case 'meeting-cantilever': return cantilever(q, o)
    case 'stool-drafting': return stoolDrafting(q)
    case 'stool-perch': return stoolPerch(q)
    case 'lounge-club': return loungeClub(q)
    case 'lounge-pedestal': return loungePedestal(q, o)
  }
}

export { glide, loopArms }
