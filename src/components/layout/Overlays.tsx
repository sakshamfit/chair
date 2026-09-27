import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '../ui/Icon'
import { cartSubtotal, unitPrice, useShop, useUI, MAX_QTY } from '../../store'
import { bySlug, categoryLabel, formatPrice, products } from '../../data/products'
import { designerBySlug } from '../../data/content'
import { ProductThumb } from '../ui/ProductThumb'
import { ChairStage } from '../three/ChairStage'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { Logo } from './Logo'

const EASE_OUT = [0.16, 1, 0.3, 1] as const
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const

/** Close overlays on route change + lock scroll while open. */
export function OverlayManager() {
  const { pathname } = useLocation()
  const close = useUI((s) => s.close)
  const anyOpen = useUI((s) => s.menu || s.search || s.cart)
  useEffect(() => { close() }, [pathname, close])
  useEffect(() => {
    if (!anyOpen) return
    const sw = window.innerWidth - document.documentElement.clientWidth
    document.documentElement.style.overflow = 'hidden'
    document.body.style.paddingRight = sw + 'px'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.paddingRight = ''
      removeEventListener('keydown', onKey)
    }
  }, [anyOpen, close])
  return (
    <>
      <Menu />
      <Search />
      <CartDrawer />
      <Toast />
    </>
  )
}

/* -------------------------------- MENU -------------------------------- */

const MENU_LINKS = [
  { to: '/products', label: 'Products', note: '16 chairs' },
  { to: '/collections', label: 'Collections', note: 'Task · Executive · Lounge' },
  { to: '/finder', label: 'Chair Finder', note: '4 questions' },
  { to: '/designers', label: 'Designers', note: '5 studios' },
  { to: '/about', label: 'About' },
  { to: '/journal', label: 'Journal' },
  { to: '/support', label: 'Support' },
]

function Menu() {
  const open = useUI((s) => s.menu)
  const close = useUI((s) => s.close)
  const openK = useUI((s) => s.open)
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, open)
  const featured = bySlug('nova')!
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className="menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)', transition: { duration: 0.75, ease: EASE_IN_OUT } }}
          exit={{ clipPath: 'inset(0 0 100% 0)', transition: { duration: 0.5, ease: EASE_IN_OUT, delay: 0.08 } }}
        >
          <div className="menu-overlay__bar container">
            <Link to="/" className="site-header__logo" onClick={() => close()}><Logo /></Link>
            <div className="site-header__actions">
              <button className="icon-btn" aria-label="Search" onClick={() => openK('search')}><Icon name="search" /></button>
              <Link to="/wishlist" className="icon-btn" aria-label="Wishlist"><Icon name="heart" /></Link>
              <button className="icon-btn" aria-label="Cart" onClick={() => openK('cart')}><Icon name="bag" /></button>
              <button className="icon-btn" aria-label="Close menu" onClick={() => close()} autoFocus><Icon name="close" /></button>
            </div>
          </div>
          <div className="menu-overlay__body container">
            <nav aria-label="Menu">
              <ul className="menu-links">
                {MENU_LINKS.map((l, i) => (
                  <motion.li
                    key={l.to}
                    initial={{ y: 28, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, transition: { delay: 0.28 + i * 0.06, duration: 0.6, ease: EASE_OUT } }}
                    exit={{ y: -12, opacity: 0, transition: { duration: 0.25, delay: (MENU_LINKS.length - i) * 0.02 } }}
                  >
                    <Link to={l.to} className="menu-link">
                      <span className="menu-link__index tabular">{String(i + 1).padStart(2, '0')}</span>
                      <span className="menu-link__label">{l.label}</span>
                      {l.note && <span className="menu-link__note">{l.note}</span>}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <motion.aside
              className="menu-feature"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.5, duration: 0.7, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              <Link to={`/products/${featured.slug}`} className="menu-feature__link">
                <div className="menu-feature__stage">
                  <ChairStage product={featured} layer="top" period={26} phase={0.12} lod="high" elevation={10} />
                </div>
                <p className="eyebrow">Featured</p>
                <p className="h3">{featured.name} <span className="muted">— {designerBySlug(featured.designer)?.name}</span></p>
                <span className="btn-text small">Discover <span className="arrow">→</span></span>
              </Link>
            </motion.aside>
          </div>
          <motion.div className="menu-overlay__foot container small muted" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.7 } }} exit={{ opacity: 0 }}>
            <span>Free delivery across the EU & UK · 14-day returns</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------- SEARCH ------------------------------- */

export function searchProducts(q: string) {
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean).map((t) => t.replace(/s$/, ''))
  if (!terms.length) return []
  return products
    .map((p) => {
      const hay = [p.name, categoryLabel[p.category], p.category, designerBySlug(p.designer)?.name, p.tagline, p.type.replace('-', ' '), ...p.colors.map((c) => c.name), p.materials.upholstery]
        .join(' ').toLowerCase()
      let score = 0
      for (const t of terms) {
        if (!hay.includes(t)) return { p, score: -1 }
        score += p.name.toLowerCase().includes(t) ? 3 : categoryLabel[p.category].toLowerCase().includes(t) ? 2 : 1
      }
      return { p, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.p)
}

const SUGGESTIONS = ['Task chair', 'Leather', 'Lounge', 'Mesh', 'Stool', 'Conference']

function Search() {
  const open = useUI((s) => s.search)
  const close = useUI((s) => s.close)
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, open)
  const results = useMemo(() => searchProducts(q), [q])
  useEffect(() => { if (!open) setQ('') }, [open])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="backdrop" onClick={() => close()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} />
          <motion.div
            ref={ref}
            className="search-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Search products"
            initial={{ y: '-100%' }}
            animate={{ y: 0, transition: { duration: 0.45, ease: EASE_OUT } }}
            exit={{ y: '-100%', transition: { duration: 0.35, ease: EASE_IN_OUT } }}
          >
            <div className="container">
              <form
                className="search-form"
                role="search"
                onSubmit={(e) => { e.preventDefault(); if (q.trim()) { nav(`/products?q=${encodeURIComponent(q.trim())}`); close() } }}
              >
                <Icon name="search" />
                <input
                  autoFocus
                  className="search-input"
                  placeholder="Search chairs, designers, materials…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search"
                  aria-controls="search-results"
                />
                <button type="button" className="icon-btn" aria-label="Close search" onClick={() => close()}><Icon name="close" /></button>
              </form>
              <div id="search-results" className="search-results" aria-live="polite">
                {!q.trim() && (
                  <div className="search-suggest">
                    <p className="eyebrow">Popular searches</p>
                    <div className="chip-row">
                      {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => setQ(s)}>{s}</button>)}
                    </div>
                  </div>
                )}
                {q.trim() && results.length === 0 && (
                  <div className="search-empty">
                    <p className="h3">No chairs match “{q}”.</p>
                    <p className="muted small">Try a category like “lounge”, a material like “leather”, or let the <Link to="/finder" className="u-link">Chair Finder</Link> help.</p>
                  </div>
                )}
                {results.length > 0 && (
                  <>
                    <p className="eyebrow">{results.length} {results.length === 1 ? 'result' : 'results'}</p>
                    <ul className="search-grid">
                      {results.slice(0, 8).map((p, i) => (
                        <motion.li key={p.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.3 } }}>
                          <Link to={`/products/${p.slug}`} className="search-item">
                            <ProductThumb slug={p.slug} color={p.colors[0].id} alt="" />
                            <span>
                              <span className="search-item__name">{p.name}</span>
                              <span className="search-item__meta">{categoryLabel[p.category]} · {formatPrice(p.price)}</span>
                            </span>
                          </Link>
                        </motion.li>
                      ))}
                    </ul>
                    {results.length > 8 && <Link to={`/products?q=${encodeURIComponent(q)}`} className="btn-text small">View all {results.length} results <span className="arrow">→</span></Link>}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* -------------------------------- CART -------------------------------- */

function CartDrawer() {
  const open = useUI((s) => s.cart)
  const close = useUI((s) => s.close)
  const cart = useShop((s) => s.cart)
  const setQty = useShop((s) => s.setQty)
  const remove = useShop((s) => s.remove)
  const nav = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, open)
  const subtotal = cartSubtotal(cart)
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="backdrop" onClick={() => close()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />
          <motion.aside
            ref={ref}
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{ x: '100%' }}
            animate={{ x: 0, transition: { duration: 0.55, ease: EASE_OUT } }}
            exit={{ x: '100%', transition: { duration: 0.45, ease: EASE_IN_OUT } }}
          >
            <div className="cart-drawer__head">
              <h2 className="h3">Your cart <span className="muted tabular">({cart.reduce((n, l) => n + l.qty, 0)})</span></h2>
              <button className="icon-btn" aria-label="Close cart" onClick={() => close()} autoFocus><Icon name="close" /></button>
            </div>
            {cart.length === 0 ? (
              <div className="cart-empty">
                <p className="h3">Your cart is empty.</p>
                <p className="muted small">Explore the collection or let the finder suggest a chair.</p>
                <div className="cart-empty__actions">
                  <Link to="/products" className="btn btn-primary">Browse chairs</Link>
                  <Link to="/finder" className="btn btn-secondary">Chair Finder</Link>
                </div>
              </div>
            ) : (
              <>
                <ul className="cart-lines">
                  <AnimatePresence initial={false}>
                    {cart.map((l) => {
                      const p = bySlug(l.slug)
                      if (!p) return null
                      const color = p.colors.find((c) => c.id === l.color)
                      const frame = p.frames.find((f) => f.id === l.frame)
                      const cfg = p.configs.find((c) => c.id === l.config)
                      return (
                        <motion.li key={l.id} className="cart-line" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}>
                          <Link to={`/products/${p.slug}`} className="cart-line__thumb"><ProductThumb slug={p.slug} color={l.color} config={l.config} alt={p.name} /></Link>
                          <div className="cart-line__info">
                            <div className="cart-line__top">
                              <Link to={`/products/${p.slug}`} className="cart-line__name">{p.name}</Link>
                              <span className="tabular">{formatPrice(unitPrice(l) * l.qty)}</span>
                            </div>
                            <p className="xs muted">{color?.name} · {frame?.name}{p.configs.length > 1 ? ` · ${cfg?.name}` : ''}</p>
                            <div className="cart-line__bottom">
                              <div className="qty sm" role="group" aria-label={`Quantity for ${p.name}`}>
                                <button aria-label="Decrease quantity" onClick={() => setQty(l.id, l.qty - 1)}><Icon name="minus" className="icon sm" /></button>
                                <output aria-live="polite">{l.qty}</output>
                                <button aria-label="Increase quantity" disabled={l.qty >= MAX_QTY} onClick={() => setQty(l.id, l.qty + 1)}><Icon name="plus" className="icon sm" /></button>
                              </div>
                              <button className="btn-text xs muted remove-btn" onClick={() => remove(l.id)}>Remove</button>
                            </div>
                          </div>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
                <div className="cart-drawer__foot">
                  <div className="sum-row"><span>Subtotal</span><span className="tabular">{formatPrice(subtotal)}</span></div>
                  <div className="sum-row muted small"><span>Delivery</span><span>Free</span></div>
                  <div className="sum-row total"><span>Total</span><span className="tabular">{formatPrice(subtotal)}</span></div>
                  <p className="xs muted">Incl. VAT. Taxes calculated at checkout.</p>
                  <button className="btn btn-primary btn-lg btn-block" onClick={() => { close(); nav('/checkout') }}>Checkout <span className="arrow">→</span></button>
                  <button className="btn btn-secondary btn-block" onClick={() => close()}>Continue shopping</button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* -------------------------------- TOAST ------------------------------- */

function Toast() {
  const toast = useUI((s) => s.toast)
  const openK = useUI((s) => s.open)
  const [visible, setVisible] = useState<typeof toast>(null)
  useEffect(() => {
    if (!toast) return
    setVisible(toast)
    const t = setTimeout(() => setVisible(null), 3200)
    return () => clearTimeout(t)
  }, [toast])
  return (
    <div className="toast-region" aria-live="polite">
      <AnimatePresence>
        {visible && (
          <motion.div key={visible.id} className="toast" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
            <Icon name="checkCircle" />
            <span>{visible.text}</span>
            {visible.href === '#cart' && <button className="btn-text small" onClick={() => { setVisible(null); openK('cart') }}>View cart <span className="arrow">→</span></button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
