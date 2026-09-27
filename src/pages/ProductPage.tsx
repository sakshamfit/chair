import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { bySlug, categoryLabel, formatPrice, priceFor, products, type Product } from '../data/products'
import { designerBySlug } from '../data/content'
import { ChairStage, type ChairStageHandle } from '../components/three/ChairStage'
import { ProductCard, WishButton } from '../components/ui/ProductCard'
import { ProductThumb } from '../components/ui/ProductThumb'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Icon } from '../components/ui/Icon'
import { useShop, useUI, MAX_QTY } from '../store'
import { useTitle } from '../hooks/useTitle'
import { useFocusTrap } from '../hooks/useFocusTrap'
import NotFound from './NotFound'

const EASE = [0.16, 1, 0.3, 1] as const
const VIEWS = [
  { id: 'hero', label: '3D', angle: -0.62, tilt: 0, zoom: 1 },
  { id: 'front', label: 'Front', angle: 0, tilt: 0, zoom: 1 },
  { id: 'side', label: 'Side', angle: Math.PI / 2, tilt: 0, zoom: 1 },
  { id: 'back', label: 'Rear', angle: Math.PI, tilt: 0, zoom: 1 },
] as const

export default function ProductPage() {
  const { slug = '' } = useParams()
  const p = bySlug(slug)
  if (!p) return <NotFound />
  return <ProductView key={p.slug} p={p} />
}

function ProductView({ p }: { p: Product }) {
  const [sp, setSp] = useSearchParams()
  const color = p.colors.find((c) => c.id === sp.get('color'))?.id ?? p.colors[0].id
  const frame = p.frames.find((f) => f.id === sp.get('frame'))?.id ?? p.frames[0].id
  const config = p.configs.find((c) => c.id === sp.get('config'))?.id ?? p.configs[0].id
  const [qty, setQty] = useState(1)
  const [view, setView] = useState<string>('hero')
  const [full, setFull] = useState(false)
  const [added, setAdded] = useState(false)
  const stage = useRef<ChairStageHandle>(null)
  const add = useShop((s) => s.add)
  const notify = useUI((s) => s.notify)
  const d = designerBySlug(p.designer)!
  const price = priceFor(p, frame, config)
  useTitle(p.name)

  const setOpt = (k: string, v: string) => {
    const next = new URLSearchParams(sp)
    next.set(k, v)
    setSp(next, { replace: true, preventScrollReset: true })
  }
  const pickView = (v: (typeof VIEWS)[number]) => { setView(v.id); stage.current?.view(v.angle, v.tilt, v.zoom) }
  const addToCart = () => {
    add({ slug: p.slug, color, frame, config }, qty)
    setAdded(true)
    notify(`${qty} × ${p.name} added to cart`, '#cart')
    setTimeout(() => setAdded(false), 1800)
  }
  const related = products.filter((x) => x.slug !== p.slug && (x.category === p.category || x.designer === p.designer)).slice(0, 4)
  const colorObj = p.colors.find((c) => c.id === color)!

  return (
    <div className="page product-page">
      <div className="container">
        <Breadcrumb items={[['Home', '/'], ['Products', '/products'], [p.name]]} />
        <div className="pdp">
          {/* --------------------------- gallery --------------------------- */}
          <div className="pdp__gallery">
            <div className="pdp__thumbs" role="tablist" aria-label="Views">
              {VIEWS.map((v) => (
                <button key={v.id} role="tab" aria-selected={view === v.id} className={`pdp__thumb ${view === v.id ? 'is-active' : ''}`} onClick={() => pickView(v)} aria-label={`${v.label} view`}>
                  {v.id === 'hero' ? <span className="pdp__thumb-3d"><Icon name="cube" /><span className="xs">3D</span></span> : <ProductThumb slug={p.slug} color={p.colors[0].id} view={v.id} alt="" />}
                </button>
              ))}
            </div>
            <motion.div className="pdp__stage" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: EASE }}>
              <ChairStage
                ref={stage}
                product={p}
                color={color}
                frame={frame}
                config={config}
                lod="high"
                period={26}
                phase={0.9}
                interactive
                tiltable
                zoomable
                elevation={7}
                margin={1.24}
                label={`${p.name} in ${colorObj.name}. Drag to rotate; use arrow keys to turn.`}
                onInteract={() => setView('')}
              />
              <div className="pdp__stage-ui">
                <span className="xs muted pdp__hint"><Icon name="rotate" className="icon sm" /> Drag to rotate · ⌘/Ctrl + scroll to zoom</span>
                <div className="pdp__stage-btns">
                  <button className="icon-btn bordered bg" aria-label="Reset view" onClick={() => { stage.current?.reset(); setView('hero') }}><Icon name="returns" className="icon sm" /></button>
                  <button className="icon-btn bordered bg" aria-label="Inspect full screen" onClick={() => setFull(true)}><Icon name="expand" className="icon sm" /></button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ---------------------------- info ---------------------------- */}
          <div className="pdp__info">
            <motion.div className="stack-sm" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1, ease: EASE }}>
              <p className="eyebrow">{categoryLabel[p.category]}{p.isNew ? ' · New' : ''}</p>
              <h1 className="h1">{p.name}</h1>
              <p className="small muted"><Link to={`/designers/${d.slug}`} className="u-link-quiet">{d.name}</Link>, {p.year}</p>
            </motion.div>
            <motion.p className="body small pdp__desc" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2, ease: EASE }}>
              {p.description}
            </motion.p>

            <motion.div className="pdp__options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <div className="opt">
                <p className="label">Colour <span className="muted">— {colorObj.name}</span></p>
                <div className="swatches" role="radiogroup" aria-label="Colour">
                  {p.colors.map((c) => (
                    <button key={c.id} role="radio" aria-checked={c.id === color} aria-label={c.name} title={c.name} className="swatch" style={{ ['--sw' as string]: c.hex }} onClick={() => setOpt('color', c.id)} />
                  ))}
                </div>
              </div>
              {p.frames.length > 1 && (
                <div className="opt">
                  <p className="label">Base</p>
                  <div className="chip-row" role="radiogroup" aria-label="Base finish">
                    {p.frames.map((f) => (
                      <button key={f.id} role="radio" aria-checked={f.id === frame} className="chip" onClick={() => setOpt('frame', f.id)}>
                        {f.name}{f.priceDelta ? <span className="muted tabular">&nbsp;+{formatPrice(f.priceDelta)}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {p.configs.length > 1 && (
                <div className="opt">
                  <p className="label">Configuration</p>
                  <div className="chip-row" role="radiogroup" aria-label="Configuration">
                    {p.configs.map((c) => (
                      <button key={c.id} role="radio" aria-checked={c.id === config} className="chip" onClick={() => setOpt('config', c.id)}>
                        {c.name}{c.priceDelta ? <span className="muted tabular">&nbsp;{c.priceDelta > 0 ? '+' : '−'}{formatPrice(Math.abs(c.priceDelta))}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div className="pdp__buy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.4 }}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.p key={price} className="pdp__price tabular" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                  {formatPrice(price)}
                </motion.p>
              </AnimatePresence>
              <p className="xs muted">Incl. VAT · {p.leadTime === 'In stock' ? 'In stock, ships in 2–4 days' : `Made to order, ${p.leadTime}`}</p>
              <div className="pdp__buy-row">
                <div className="qty" role="group" aria-label="Quantity">
                  <button aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}><Icon name="minus" className="icon sm" /></button>
                  <output aria-live="polite">{qty}</output>
                  <button aria-label="Increase quantity" disabled={qty >= MAX_QTY} onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}><Icon name="plus" className="icon sm" /></button>
                </div>
                <button className={`btn btn-primary btn-lg pdp__add ${added ? "is-added" : ""}`} onClick={addToCart} aria-label={added ? `${p.name} added to cart` : `Add ${p.name} to cart`}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={String(added)} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.2 }} className="pdp__add-label">
                      {added ? <><Icon name="check" className="icon sm" /> Added</> : 'Add to cart'}
                    </motion.span>
                  </AnimatePresence>
                </button>
                <WishButton slug={p.slug} name={p.name} className="bordered pdp__wish" />
              </div>
              <ul className="pdp__service xs muted">
                <li><Icon name="truck" className="icon sm" /> Free delivery</li>
                <li><Icon name="returns" className="icon sm" /> 14-day returns</li>
                <li><Icon name="shield" className="icon sm" /> {p.warranty}-year warranty</li>
              </ul>
            </motion.div>
          </div>
        </div>

        <DetailTabs p={p} />
      </div>

      {related.length > 0 && (
        <section className="section related" aria-labelledby="related-title">
          <div className="container">
            <div className="section-head">
              <div><p className="eyebrow">You may also like</p><h2 id="related-title" className="h2">Related products</h2></div>
              <Link to={`/products?cat=${p.category}`} className="btn-text small">More {categoryLabel[p.category].toLowerCase()}s <span className="arrow">→</span></Link>
            </div>
            <ul className="product-grid">
              {related.map((r, i) => (
                <motion.li key={r.slug} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, delay: i * 0.07, ease: EASE }}>
                  <ProductCard p={r} phase={0.15 + i * 0.21} />
                </motion.li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <FullscreenViewer open={full} onClose={() => setFull(false)} p={p} color={color} frame={frame} config={config} />
    </div>
  )
}

/* ------------------------------- TABS -------------------------------- */

const TABS = ['Overview', 'Details', 'Dimensions', 'Materials', 'Sustainability', 'Designer'] as const

function DetailTabs({ p }: { p: Product }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')
  const d = designerBySlug(p.designer)!
  const listRef = useRef<HTMLDivElement>(null)
  const onKey = (e: React.KeyboardEvent) => {
    const i = TABS.indexOf(tab)
    const n = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : -1
    if (n < 0) return
    e.preventDefault()
    setTab(TABS[n])
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[n]?.focus()
  }
  return (
    <section className="pdp-tabs" aria-label="Product details">
      <div className="tabs" role="tablist" ref={listRef} onKeyDown={onKey}>
        {TABS.map((t) => (
          <button key={t} role="tab" id={`tab-${t}`} aria-controls={`panel-${t}`} aria-selected={tab === t} tabIndex={tab === t ? 0 : -1} className={`tab ${tab === t ? 'is-active' : ''}`} onClick={() => setTab(t)}>
            {t}
            {tab === t && <motion.span layoutId="tab-underline" className="tab__line" transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }} />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="tab-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3 }}>
          {tab === 'Overview' && (
            <div className="tab-grid">
              <div className="tab-visual"><ProductThumb slug={p.slug} color={p.colors[Math.min(1, p.colors.length - 1)].id} alt={`${p.name} in ${p.colors[Math.min(1, p.colors.length - 1)].name}`} /></div>
              <div className="stack">
                <h3 className="h3">{p.tagline}</h3>
                <p className="body small">{p.description}</p>
                <ul className="check-list">{p.highlights.map((h) => <li key={h}><Icon name="checkCircle" className="icon sm" />{h}</li>)}</ul>
              </div>
            </div>
          )}
          {tab === 'Details' && (
            <dl className="spec-list">
              <div><dt>Category</dt><dd>{categoryLabel[p.category]}</dd></div>
              <div><dt>Designer</dt><dd>{d.name}</dd></div>
              <div><dt>Year</dt><dd>{p.year}</dd></div>
              <div><dt>Configurations</dt><dd>{p.configs.map((c) => c.name).join(', ')}</dd></div>
              <div><dt>Colours</dt><dd>{p.colors.map((c) => c.name).join(', ')}</dd></div>
              <div><dt>Lead time</dt><dd>{p.leadTime}</dd></div>
              <div><dt>Warranty</dt><dd>{p.warranty} years</dd></div>
            </dl>
          )}
          {tab === 'Dimensions' && <Dimensions p={p} />}
          {tab === 'Materials' && (
            <dl className="spec-list">
              <div><dt>Upholstery / shell</dt><dd>{p.materials.upholstery}</dd></div>
              <div><dt>Frame & base</dt><dd>{p.materials.frame}</dd></div>
              <div><dt>Other</dt><dd>{p.materials.other}</dd></div>
              <div><dt>Base finishes</dt><dd>{p.frames.map((f) => f.name).join(', ')}</dd></div>
              <div><dt>Care</dt><dd>Vacuum upholstery regularly; clean frames with a soft, damp cloth.</dd></div>
            </dl>
          )}
          {tab === 'Sustainability' && (
            <div className="stack" style={{ maxWidth: 640 }}>
              <p className="body">{p.sustainability}</p>
              <p className="body small muted">Every Chesselle chair is designed for a long life: durable moulded construction, easy-care matte finishes and a warranty that has you covered.</p>
            </div>
          )}
          {tab === 'Designer' && (
            <div className="tab-grid">
              <div className="stack-sm"><p className="eyebrow">{d.studio} · {d.city}</p><h3 className="h2">{d.name}</h3></div>
              <div className="stack">
                <p className="body">{d.bio}</p>
                <p className="h3">“{d.quote}”</p>
                <Link to={`/designers/${d.slug}`} className="btn-text small">More from {d.name} <span className="arrow">→</span></Link>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

function Dimensions({ p }: { p: Product }) {
  const dm = p.dimensions
  return (
    <div className="tab-grid">
      <figure className="dim-figure">
        <ProductThumb slug={p.slug} color={p.colors[0].id} view="side" alt={`${p.name} side elevation`} />
        <span className="dim-h xs tabular" aria-hidden="true">{dm.height} cm</span>
        <span className="dim-w xs tabular" aria-hidden="true">{dm.depth} cm</span>
      </figure>
      <dl className="spec-list">
        <div><dt>Overall height</dt><dd className="tabular">{dm.height} cm</dd></div>
        <div><dt>Width</dt><dd className="tabular">{dm.width} cm</dd></div>
        <div><dt>Depth</dt><dd className="tabular">{dm.depth} cm</dd></div>
        <div><dt>Seat height</dt><dd className="tabular">{dm.seatHeight} cm</dd></div>
        <div><dt>Seat depth</dt><dd className="tabular">{dm.seatDepth} cm</dd></div>
        <div><dt>Weight</dt><dd className="tabular">{dm.weight} kg</dd></div>
      </dl>
    </div>
  )
}

/* ------------------------- FULLSCREEN VIEWER ------------------------- */

function FullscreenViewer({ open, onClose, p, color, frame, config }: { open: boolean; onClose: () => void; p: Product; color: string; frame: string; config: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const stage = useRef<ChairStageHandle>(null)
  useFocusTrap(ref, open)
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.documentElement.style.overflow = 'hidden'
    addEventListener('keydown', k)
    return () => { removeEventListener('keydown', k); document.documentElement.style.overflow = '' }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div ref={ref} className="viewer" role="dialog" aria-modal="true" aria-label={`${p.name} 3D viewer`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }}>
          <div className="viewer__bar container">
            <div><p className="h3">{p.name}</p><p className="xs muted">{p.colors.find((c) => c.id === color)?.name}</p></div>
            <button className="icon-btn bordered" aria-label="Close viewer" onClick={onClose} autoFocus><Icon name="close" /></button>
          </div>
          <div className="viewer__stage">
            <ChairStage ref={stage} layer="top" product={p} color={color} frame={frame} config={config} lod="high" period={24} phase={0.9} interactive tiltable zoomable freeZoom elevation={8} margin={1.08} />
          </div>
          <div className="viewer__controls">
            <button className="icon-btn bordered" aria-label="Zoom out" onClick={() => stage.current?.zoomBy(1 / 1.3)}><Icon name="zoomOut" className="icon sm" /></button>
            <button className="btn btn-secondary btn-sm" onClick={() => stage.current?.reset()}>Reset view</button>
            <button className="icon-btn bordered" aria-label="Zoom in" onClick={() => stage.current?.zoomBy(1.3)}><Icon name="zoomIn" className="icon sm" /></button>
          </div>
          <p className="viewer__hint xs muted">Drag to rotate and tilt · scroll to zoom · arrow keys to turn</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
