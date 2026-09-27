import {
  Box3, BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Object3D, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector3,
  WebGLRenderTarget, HalfFloatType, LinearFilter, type Texture, type WebGLRenderer,
} from 'three'
import { ptime } from '../lib/ptime'
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js'
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

/**
 * Baked contact shadow.
 * The chair is rendered from beneath with an orthographic camera; fragments
 * closer to the floor are darker. The result is blurred and mapped onto a
 * floor plane that is parented to the chair — because the "light" is directly
 * overhead, rotating that plane with the chair is physically exact.
 * Two layers: a tight contact layer and a wide ambient-occlusion layer.
 */

const depthMat = new ShaderMaterial({
  uniforms: { falloff: { value: 2.0 }, strength: { value: 1.0 } },
  vertexShader: /* glsl */`void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform float falloff; uniform float strength;
    void main(){ float z = gl_FragCoord.z; gl_FragColor = vec4(0.0,0.0,0.0, pow(clamp(1.0 - z,0.0,1.0), falloff) * strength); }`,
  depthTest: true,
  depthWrite: true,
})

/** Composites the tight contact layer and the wide ambient layer into one texture. */
const combineMat = new ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, oA: { value: 0.85 }, oB: { value: 0.5 } },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tA; uniform sampler2D tB; uniform float oA; uniform float oB; varying vec2 vUv;
    void main(){ float a = 1.0 - (1.0 - texture2D(tA, vUv).a * oA) * (1.0 - texture2D(tB, vUv).a * oB); gl_FragColor = vec4(0.0, 0.0, 0.0, a); }`,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
})

const hBlur = new ShaderMaterial(HorizontalBlurShader)
const vBlur = new ShaderMaterial(VerticalBlurShader)
hBlur.depthTest = vBlur.depthTest = false
const quad = new FullScreenQuad()


/** src → (horizontal) → tmp → (vertical) → dst */
function blurInto(r: WebGLRenderer, src: WebGLRenderTarget, dst: WebGLRenderTarget, tmp: WebGLRenderTarget, amount: number, res: number) {
  quad.material = hBlur
  hBlur.uniforms.tDiffuse.value = src.texture
  hBlur.uniforms.h.value = amount / res
  r.setRenderTarget(tmp)
  quad.render(r)
  quad.material = vBlur
  vBlur.uniforms.tDiffuse.value = tmp.texture
  vBlur.uniforms.v.value = amount / res
  r.setRenderTarget(dst)
  quad.render(r)
}

const RES = 512
const linear = { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter } as const
/** Scratch targets reused by every bake (allocated and primed once per renderer). */
interface Pool { depth: WebGLRenderTarget; scratch: WebGLRenderTarget; spare: WebGLRenderTarget }
const pools = new WeakMap<WebGLRenderer, Pool>()
function pool(r: WebGLRenderer) {
  let p = pools.get(r)
  if (!p) {
    p = {
      depth: new WebGLRenderTarget(RES, RES, { ...linear }),
      scratch: new WebGLRenderTarget(RES, RES, { ...linear, depthBuffer: false }),
      spare: new WebGLRenderTarget(RES, RES, { ...linear, depthBuffer: false }),
    }
    pools.set(r, p)
  }
  return p
}

export interface BakedShadow {
  plane: Group
  /** [combined contact shadow, wide soft silhouette] and the square span (m) they cover */
  textures: Texture[]
  span: number
  dispose: () => void
}

const bakeCompiled = new WeakMap<WebGLRenderer, Promise<unknown>>()
/**
 * Compile the bake's own shaders asynchronously (parallel compile), bound to a
 * render target exactly like the real bake, so the first bake never stalls.
 */
export function prepareBake(r: WebGLRenderer) {
  const cached = bakeCompiled.get(r)
  if (cached) return cached
  const rt = new WebGLRenderTarget(4, 4, { type: HalfFloatType })
  const scene = new Scene()
  const g = new PlaneGeometry(1, 1)
  // Shader programs are keyed on the geometry's attributes too: the full-screen blur
  // pass draws a triangle with position + uv only (no normals), so warm it the same way.
  const tri = new BufferGeometry()
  tri.setAttribute('position', new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3))
  tri.setAttribute('uv', new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2))
  scene.add(new Mesh(g, depthMat), new Mesh(tri, hBlur), new Mesh(tri, vBlur), new Mesh(tri, combineMat))
  const cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const prev = r.getRenderTarget()
  r.setRenderTarget(rt)
  const pBake = r.compileAsync(scene, cam)
  r.setRenderTarget(prev)
  // the floor planes that display the result render to the screen
  const planes = new Scene()
  planes.add(new Mesh(g, new MeshBasicMaterial({ map: rt.texture, transparent: true, depthWrite: false, color: 0x000000 })))
  const all = Promise.all([pBake, r.compileAsync(planes, cam)]).then(() => {
    const primer = new Mesh(new PlaneGeometry(0.2, 0.2), depthMat)
    primer.rotation.x = -Math.PI / 2
    primer.position.y = 0.01
    const b = ptime('bake:prime', () => bakeContactShadow(r, primer))
    b.dispose()
  })
  bakeCompiled.set(r, all)
  return all
}

export function bakeContactShadow(r: WebGLRenderer, obj: Object3D, opts: { opacity?: number } = {}): BakedShadow {
  const res = RES
  const box = new Box3().setFromObject(obj)
  const size = new Vector3()
  box.getSize(size)
  const span = Math.max(size.x, size.z) * 1.25 + 0.25
  const scene = new Scene()
  const parent = obj.parent
  scene.add(obj)
  scene.overrideMaterial = depthMat
  const cam = new OrthographicCamera(-span / 2, span / 2, span / 2, -span / 2, 0, 1)
  cam.rotation.x = Math.PI / 2
  cam.position.y = -0.0005

  const layers: { far: number; blurs: number[]; falloff: number; strength: number; opacity: number }[] = [
    { far: 0.12, blurs: [1.2, 0.6], falloff: 2.2, strength: 1.0, opacity: 0.85 },
    { far: Math.min(size.y, 0.8), blurs: [5, 3.2, 1.6], falloff: 0.9, strength: 1.0, opacity: 0.5 },
  ]
  const group = new Group()
  const P = pool(r)
  const prevTarget = r.getRenderTarget()
  const prevScissor = r.getScissorTest()
  r.setScissorTest(false)
  const prevClear = r.getClearAlpha()
  const depthPass = (L: (typeof layers)[number]) => {
    cam.far = L.far
    cam.updateProjectionMatrix()
    depthMat.uniforms.falloff.value = L.falloff
    depthMat.uniforms.strength.value = L.strength
    r.setRenderTarget(P.depth)
    r.setClearColor(0x000000, 0)
    r.clear(true, true, false)
    ptime('bake.depth', () => r.render(scene, cam))
  }
  // wide soft layer → kept (the hero projects it as a floor silhouette)
  const wide = new WebGLRenderTarget(res, res, { ...linear, depthBuffer: false })
  depthPass(layers[1])
  ptime('bake.blur', () => {
    const [b1, b2, b3] = layers[1].blurs
    blurInto(r, P.depth, wide, P.scratch, b1, res / 2.4)
    blurInto(r, wide, P.spare, P.scratch, b2, res / 2.4)
    blurInto(r, P.spare, wide, P.scratch, b3, res / 2.4)
  })
  // tight contact layer → pooled
  depthPass(layers[0])
  ptime('bake.blur', () => {
    const [b1, b2] = layers[0].blurs
    blurInto(r, P.depth, P.spare, P.scratch, b1, res / 2.4)
    blurInto(r, P.spare, P.depth, P.scratch, b2, res / 2.4)
  })
  // one texture, one blended quad per chair (instead of two) — half the fill-rate
  const combined = new WebGLRenderTarget(res, res, { ...linear, depthBuffer: false })
  combineMat.uniforms.tA.value = P.depth.texture
  combineMat.uniforms.tB.value = wide.texture
  combineMat.uniforms.oA.value = layers[0].opacity
  combineMat.uniforms.oB.value = layers[1].opacity
  quad.material = combineMat
  r.setRenderTarget(combined)
  quad.render(r)
  const plane = new Mesh(new PlaneGeometry(span, span), new MeshBasicMaterial({ map: combined.texture, transparent: true, depthWrite: false, opacity: opts.opacity ?? 1, color: 0x000000 }))
  plane.rotation.x = -Math.PI / 2
  plane.scale.y = -1
  plane.position.y = 0.0015
  plane.renderOrder = -1
  group.add(plane)
  r.setRenderTarget(prevTarget)
  r.setScissorTest(prevScissor)
  r.setClearColor(0x000000, prevClear)
  scene.overrideMaterial = null
  scene.remove(obj)
  if (parent) parent.add(obj)
  group.userData.isShadow = true
  return { plane: group, textures: [combined.texture, wide.texture], span, dispose: () => { combined.dispose(); wide.dispose() } }
}
