import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, Vector2, type Material } from 'three'
import { boucleNormal, fabricNormal, fabricRough, leatherNormal, leatherRough, meshAlpha, woodColor } from './textures'

export type Upholstery = 'fabric' | 'leather' | 'boucle' | 'plastic' | 'felt'
export type Finish = 'polished' | 'brushed' | 'black' | 'white' | 'chrome' | 'oak' | 'walnut'

/** Material slots every chair part is tagged with. */
export type Slot = 'upholstery' | 'frame' | 'shell' | 'accent' | 'plastic' | 'rubber' | 'chrome' | 'mesh' | 'wood'

export interface MaterialSpec {
  upholstery: Upholstery
  color: string
  frame: Finish
  /** molded shell / backrest colour where relevant */
  shell?: string
  mesh?: string
}

const cache = new Map<string, Material>()
const memo = <T extends Material>(key: string, make: () => T): T => {
  let m = cache.get(key) as T | undefined
  if (!m) { m = make(); cache.set(key, m) }
  return m
}

const lighten = (hex: string, t: number) => '#' + new Color(hex).lerp(new Color('#ffffff'), t).getHexString()

export function upholsteryMat(kind: Upholstery, color: string) {
  return memo(`uph:${kind}:${color}`, () => {
    switch (kind) {
      case 'leather':
        return new MeshStandardMaterial({
          color, roughness: 1, roughnessMap: leatherRough(), normalMap: leatherNormal(), normalScale: new Vector2(0.3, 0.3),
        })
      case 'boucle':
        return new MeshPhysicalMaterial({
          color, roughness: 0.96, normalMap: boucleNormal(), normalScale: new Vector2(1.1, 1.1),
          sheen: 0.6, sheenRoughness: 0.9, sheenColor: new Color(lighten(color, 0.2)),
        })
      case 'plastic':
        return plasticMat(color)
      case 'felt':
        return new MeshPhysicalMaterial({
          color, roughness: 1, normalMap: fabricNormal(), normalScale: new Vector2(0.25, 0.25),
          sheen: 0.8, sheenRoughness: 0.9, sheenColor: new Color(lighten(color, 0.3)),
        })
      default:
        return new MeshPhysicalMaterial({
          color, roughness: 0.95, roughnessMap: fabricRough(), normalMap: fabricNormal(),
          normalScale: new Vector2(0.4, 0.4),
          sheen: 0.45, sheenRoughness: 0.9, sheenColor: new Color(lighten(color, 0.18)),
        })
    }
  })
}

export function plasticMat(color: string) {
  return memo(`plastic:${color}`, () =>
    new MeshStandardMaterial({ color, roughness: 0.42 }))
}

export function frameMat(f: Finish) {
  return memo(`frame:${f}`, () => {
    switch (f) {
      case 'polished': return new MeshStandardMaterial({ color: '#dcdde0', metalness: 1, roughness: 0.16 })
      case 'chrome': return new MeshStandardMaterial({ color: '#eceef1', metalness: 1, roughness: 0.07 })
      case 'brushed': return new MeshStandardMaterial({ color: '#c9cbce', metalness: 1, roughness: 0.34 })
      case 'white': return new MeshStandardMaterial({ color: '#f1f0ec', metalness: 0, roughness: 0.3 })
      case 'oak': return woodMat('#c79d6b')
      case 'walnut': return woodMat('#6b4a33')
      default: return new MeshStandardMaterial({ color: '#1b1b1c', metalness: 0.35, roughness: 0.36 })
    }
  })
}

export function woodMat(base: string) {
  return memo(`wood:${base}`, () => new MeshStandardMaterial({ map: woodColor(base), roughness: 0.48 }))
}

export const rubberMat = () => memo('rubber', () => new MeshStandardMaterial({ color: '#141414', roughness: 0.7, metalness: 0 }))
export const darkPlastic = () => memo('darkplastic', () => new MeshStandardMaterial({ color: '#1c1c1d', roughness: 0.42 }))
export const chromeMat = () => frameMat('chrome')

export function meshMat(color: string) {
  return memo(`mesh:${color}`, () => {
    const m = new MeshPhysicalMaterial({
      color, roughness: 0.8, alphaMap: meshAlpha(), transparent: true, side: DoubleSide,
      sheen: 0.6, sheenRoughness: 0.8, sheenColor: new Color(lighten(color, 0.3)), depthWrite: false,
    })
    return m
  })
}

/** Resolve a slot to a material for a spec. */
export function materialFor(slot: Slot, spec: MaterialSpec): Material {
  switch (slot) {
    case 'upholstery': return upholsteryMat(spec.upholstery, spec.color)
    case 'frame': return frameMat(spec.frame)
    case 'shell': return plasticMat(spec.shell ?? spec.color)
    case 'accent': return plasticMat(spec.shell ?? '#1c1c1d')
    case 'plastic': return darkPlastic()
    case 'rubber': return rubberMat()
    case 'chrome': return chromeMat()
    case 'mesh': return meshMat(spec.mesh ?? spec.color)
    case 'wood': return frameMat(spec.frame === 'walnut' ? 'walnut' : 'oak')
  }
}
