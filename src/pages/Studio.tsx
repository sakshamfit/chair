import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DirectionalLight, FloatType, Group, HemisphereLight, NearestFilter, NeutralToneMapping, PerspectiveCamera, PMREMGenerator, Scene, ShaderMaterial,
  SRGBColorSpace, WebGLRenderer, WebGLRenderTarget,
} from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { products, shapeFor, specFor } from '../data/products'
import { ChairStage } from '../components/three/ChairStage'
import { chairCenter, chairSize, createChair, ensureTemplate } from '../three/chairs'
import { bakeContactShadow } from '../three/contactShadow'
import { variantSuffix } from '../lib/renders'
import { texturesSettled } from '../three/textures'

/**
 * Internal studio.
 *  /studio                → QA grid of every model (high LOD)
 *  /studio?p=slug&a=0.1   → single chair, large
 *  /studio?render=1       → renders every product/colour/configuration to public/renders (dev server only)
 *  /studio?render=1&variants=1 → only the non-default configuration renders (e.g. armless)
 *  /studio?env=1          → pre-computes the reflection environment to public/env (dev server only)
 */
export default function Studio() {
  const [sp] = useSearchParams()
  if (sp.get('env')) return <BakeEnvironment />
  if (sp.get('render')) return <RenderAll size={Number(sp.get('size') ?? 1200)} only={sp.get('only')} variantsOnly={!!sp.get('variants')} />
  const one = products.find((p) => p.slug === sp.get('p'))
  if (one) {
    return (
      <main style={{ height: '100vh' }}>
        <ChairStage product={one} lod="high" period={1e9} phase={Number(sp.get('a') ?? 0.1)} margin={Number(sp.get('m') ?? 1.25)} elevation={Number(sp.get('e') ?? 9)} color={sp.get('c') ?? undefined} config={sp.get('cfg') ?? undefined} />
      </main>
    )
  }
  return (
    <main style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
      {products.map((p, i) => (
        <figure key={p.slug} style={{ border: '1px solid #eee', margin: 0 }}>
          <div style={{ height: 340 }}><ChairStage product={p} lod="high" period={30} phase={i * 0.13} interactive /></div>
          <figcaption style={{ padding: 8, fontSize: 13 }}>{p.name} — {p.type}</figcaption>
        </figure>
      ))}
    </main>
  )
}

const VIEWS = { hero: -0.62, front: 0, side: Math.PI / 2, back: Math.PI } as const

function RenderAll({ size, only, variantsOnly }: { size: number; only: string | null; variantsOnly: boolean }) {
  const [log, setLog] = useState<string[]>([])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const r = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
      r.setPixelRatio(1)
      r.setSize(size, size, false)
      r.outputColorSpace = SRGBColorSpace
      r.toneMapping = NeutralToneMapping
      r.toneMappingExposure = 0.9
      r.setClearColor(0x000000, 0)
      const env = new PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.035).texture
      const jobs: { slug: string; color: string; view: keyof typeof VIEWS; config?: string }[] = []
      for (const p of products) {
        if (only && p.slug !== only) continue
        // configurations whose geometry differs from the default (e.g. without armrests)
        const variants = p.configs.filter((cfg) => variantSuffix(p.slug, cfg.id) !== '')
        p.colors.forEach((c, i) => {
          if (!variantsOnly) {
            jobs.push({ slug: p.slug, color: c.id, view: 'hero' })
            if (i === 0) (['front', 'side', 'back'] as const).forEach((v) => jobs.push({ slug: p.slug, color: c.id, view: v }))
          }
          variants.forEach((cfg) => jobs.push({ slug: p.slug, color: c.id, view: 'hero', config: cfg.id }))
        })
      }
      for (const j of jobs) {
        if (cancelled) return
        const p = products.find((x) => x.slug === j.slug)!
        const shape = shapeFor(p, j.config)
        await ensureTemplate(shape, 'high')
        await ensureTemplate(shape, 'low')
        const scene = new Scene()
        scene.environment = env
        scene.environmentIntensity = 0.5
        scene.add(new HemisphereLight('#ffffff', '#d8d4cc', 0.4))
        const key = new DirectionalLight('#ffffff', 1.35); key.position.set(-2.2, 4, 3); scene.add(key)
        const fill = new DirectionalLight('#f3f5ff', 0.45); fill.position.set(3, 1.5, 2); scene.add(fill)
        const rim = new DirectionalLight('#ffffff', 0.9); rim.position.set(0.5, 2.5, -3.5); scene.add(rim)
        const chair = createChair(shape, specFor(p, j.color), 'high')
        const inner = chair.userData.chair as Group
        inner.add(bakeContactShadow(r, createChair(shape, specFor(p, j.color), 'low')).plane)
        chair.rotation.y = VIEWS[j.view]
        await texturesSettled()
        scene.add(chair)
        const s = chairSize(shape), c = chairCenter(shape)
        const cam = new PerspectiveCamera(24, 1, 0.05, 40)
        const radius = Math.hypot(s.x, s.z) / 2
        const D = (Math.max(s.y, radius * 2) * 1.3) / (2 * Math.tan((24 * Math.PI) / 360))
        const el = (8 * Math.PI) / 180
        cam.position.set(0, c.y + Math.sin(el) * D, Math.cos(el) * D)
        cam.lookAt(0, c.y - s.y * 0.03, 0)
        r.setRenderTarget(null)
        r.setViewport(0, 0, size, size)
        r.clear()
        r.render(scene, cam)
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/webp', 0.9))
        const name = `${j.slug}--${j.color}${variantSuffix(j.slug, j.config)}--${j.view}.webp`
        await fetch(`/__save-render?name=${name}`, { method: 'POST', body: blob })
        setLog((l) => [...l, `${name} ${(blob.size / 1024).toFixed(0)}kB`])
      }
      setLog((l) => [...l, 'DONE'])
    })()
    return () => { cancelled = true }
  }, [size, only])
  return <pre style={{ padding: 20, fontSize: 12 }} id="render-log">{log.join('\n')}</pre>
}

/**
 * Pre-computes the studio reflection environment (a PMREM "cube-UV" atlas of a
 * softbox room) and saves it RGBE-encoded. At runtime the site loads this image
 * directly instead of generating it — which would compile ~1 s of heavy
 * filtering shaders on the visitor's GPU.
 */
function BakeEnvironment() {
  const [msg, setMsg] = useState('baking…')
  useEffect(() => {
    const canvas = document.createElement('canvas')
    const r = new WebGLRenderer({ canvas })
    const pm = new PMREMGenerator(r)
    const atlas = pm.fromScene(new RoomEnvironment(), 0.035)
    const w = atlas.width, h = atlas.height
    // copy the half-float atlas into a float target so it can be read back exactly
    const f32 = new WebGLRenderTarget(w, h, { type: FloatType, minFilter: NearestFilter, magFilter: NearestFilter, generateMipmaps: false })
    const copy = new ShaderMaterial({
      uniforms: { t: { value: atlas.texture } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.0); }',
      toneMapped: false,
    })
    const quad = new FullScreenQuad(copy)
    r.setRenderTarget(f32)
    quad.render(r)
    const px = new Float32Array(w * h * 4)
    r.readRenderTargetPixels(f32, 0, 0, w, h, px)
    // RGBE: shared exponent in alpha
    const out = new Uint8Array(w * h * 4)
    let maxV = 0
    for (let i = 0; i < w * h; i++) {
      const R = px[i * 4], G = px[i * 4 + 1], B = px[i * 4 + 2]
      const m = Math.max(R, G, B)
      maxV = Math.max(maxV, m)
      if (m < 1e-32) continue
      const e = Math.floor(Math.log2(m)) + 1
      const scale = 256 / Math.pow(2, e)
      out[i * 4] = Math.min(255, Math.floor(R * scale))
      out[i * 4 + 1] = Math.min(255, Math.floor(G * scale))
      out[i * 4 + 2] = Math.min(255, Math.floor(B * scale))
      out[i * 4 + 3] = e + 128
    }
    fetch(`/__save-env?w=${w}&h=${h}`, { method: 'POST', body: out })
      .then((res) => res.text())
      .then((bytes) => setMsg(`saved public/env/studio.rgbe.png — ${w}×${h}, ${(Number(bytes) / 1024).toFixed(0)} kB, peak ${maxV.toFixed(2)} DONE`))
    r.dispose()
  }, [])
  return <pre style={{ padding: 20 }} id="env-log">{msg}</pre>
}
