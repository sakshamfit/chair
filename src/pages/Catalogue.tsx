import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { AnimatePresence, motion } from 'framer-motion'
import { products, categoryLabel, type Category } from '../data/products'
import { designers } from '../data/content'
import { ProductCard } from '../components/ui/ProductCard'
import { Icon } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'
import { searchProducts } from '../components/layout/Overlays'
import { useTitle } from '../hooks/useTitle'

const SORTS = { featured: 'Featured', new: 'Newest', 'price-asc': 'Price: low to high', 'price-desc': 'Price: high to low', name: 'Name A–Z' } as const
const PRICES = [
  { id: 'u3000', label: 'Under ₹3,000', test: (n: number) => n < 3000 },
  { id: '3000-6000', label: '₹3,000 – ₹6,000', test: (n: number) => n >= 3000 && n <= 6000 },
  { id: 'o6000', label: 'Over ₹6,000', test: (n: number) => n > 6000 },
]
const CATS = Object.keys(categoryLabel) as Category[]
const MATERIALS = [
  { id: 'fabric', label: 'Fabric' }, { id: 'leather', label: 'Leather' }, { id: 'mesh', label: 'Mesh' }, { id: 'plastic', label: 'Moulded shell' }, { id: 'boucle', label: 'Bouclé' },
]

export default function Catalogue() {
  const [sp, setSp] = useSearchParams()
  const [open, setOpen] = useState(false)
  useTitle('All chairs')
  const q = sp.get('q') ?? ''
  const cats = sp.getAll('cat') as Category[]
  const des = sp.getAll('designer')
  const price = sp.get('price')
  const mats = sp.getAll('mat')
  const sort = (sp.get('sort') ?? 'featured') as keyof typeof SORTS

  const toggle = (key: string, val: string) => {
    const next = new URLSearchParams(sp)
    const cur = next.getAll(key)
    next.delete(key)
    ;(cur.includes(val) ? cur.filter((c) => c !== val) : [...cur, val]).forEach((v) => next.append(key, v))
    setSp(next, { replace: true })
  }
  const setOne = (key: string, val: string | null) => {
    const next = new URLSearchParams(sp)
    if (val == null || val === '') next.delete(key)
    else next.set(key, val)
    setSp(next, { replace: true })
  }
  const clear = () => setSp(q ? { q } : {}, { replace: true })

  const list = useMemo(() => {
    let l = q ? searchProducts(q) : [...products]
    if (cats.length) l = l.filter((p) => cats.includes(p.category))
    if (des.length) l = l.filter((p) => des.includes(p.designer))
    if (price) { const pr = PRICES.find((x) => x.id === price); if (pr) l = l.filter((p) => pr.test(p.price)) }
    if (mats.length) l = l.filter((p) => mats.some((m) => (m === 'mesh' ? p.type === 'task-mesh' : p.colors.some((c) => c.upholstery === m))))
    if (sort === 'price-asc') l.sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') l.sort((a, b) => b.price - a.price)
    else if (sort === 'name') l.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'new') l.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew) || b.year.localeCompare(a.year))
    return l
  }, [q, cats.join(), des.join(), price, mats.join(), sort])
  const activeCount = cats.length + des.length + (price ? 1 : 0) + mats.length

  const filters = (
    <div className="filters">
      <fieldset className="filter-group">
        <legend className="eyebrow">Category</legend>
        {CATS.map((c) => (
          <label key={c} className="check">
            <input type="checkbox" checked={cats.includes(c)} onChange={() => toggle('cat', c)} />
            <span>{categoryLabel[c]}s</span>
            <span className="xs muted tabular">{products.filter((p) => p.category === c).length}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="filter-group">
        <legend className="eyebrow">Material</legend>
        {MATERIALS.map((m) => (
          <label key={m.id} className="check">
            <input type="checkbox" checked={mats.includes(m.id)} onChange={() => toggle('mat', m.id)} />
            <span>{m.label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="filter-group">
        <legend className="eyebrow">Price</legend>
        {PRICES.map((pr) => (
          <label key={pr.id} className="check">
            <input type="radio" name="price" checked={price === pr.id} onChange={() => setOne('price', pr.id)} />
            <span>{pr.label}</span>
          </label>
        ))}
        {price && <button className="btn-text xs muted" onClick={() => setOne('price', null)}>Any price</button>}
      </fieldset>
      <fieldset className="filter-group">
        <legend className="eyebrow">Designer</legend>
        {designers.map((d) => (
          <label key={d.slug} className="check">
            <input type="checkbox" checked={des.includes(d.slug)} onChange={() => toggle('designer', d.slug)} />
            <span>{d.name}</span>
          </label>
        ))}
      </fieldset>
      {activeCount > 0 && <button className="btn btn-secondary btn-sm" onClick={clear}>Clear filters ({activeCount})</button>}
    </div>
  )

  return (
    <div className="page catalogue">
      <div className="container">
        <Breadcrumb items={[['Home', '/'], ['Products']]} />
        <header className="catalogue__head">
          <Reveal><h1 className="h1">{q ? <>Results for “{q}”</> : 'All chairs'}</h1></Reveal>
          <Reveal delay={0.06}><p className="lead">Sixteen chairs, each one inspectable in 3D. Filter by how you work, what you like, and what you want to spend.</p></Reveal>
        </header>
        <div className="catalogue__bar">
          <div className="catalogue__search">
            <Icon name="search" className="icon sm" />
            <input className="input-bare" placeholder="Search the collection" value={q} onChange={(e) => setOne('q', e.target.value)} aria-label="Search products" />
            {q && <button className="icon-btn" aria-label="Clear search" onClick={() => setOne('q', null)}><Icon name="close" className="icon sm" /></button>}
          </div>
          <div className="catalogue__tools">
            <span className="small muted tabular" aria-live="polite">{list.length} {list.length === 1 ? 'chair' : 'chairs'}</span>
            <button className="btn btn-secondary btn-sm filters-toggle" onClick={() => setOpen(true)} aria-expanded={open}><Icon name="filter" className="icon sm" /> Filters{activeCount ? ` (${activeCount})` : ''}</button>
            <label className="sort">
              <span className="visually-hidden">Sort by</span>
              <select className="select select-sm" value={sort} onChange={(e) => setOne('sort', e.target.value === 'featured' ? null : e.target.value)}>
                {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="catalogue__body">
          <aside className="catalogue__aside" aria-label="Filters">{filters}</aside>
          <div>
            {list.length === 0 ? (
              <div className="empty-state">
                <p className="h3">No chairs match these filters.</p>
                <p className="muted small">Try removing a filter, or let the Chair Finder recommend something.</p>
                <div className="chip-row"><button className="btn btn-primary btn-sm" onClick={() => setSp({}, { replace: true })}>Reset all</button><Link to="/finder" className="btn btn-secondary btn-sm">Chair Finder</Link></div>
              </div>
            ) : (
              <motion.ul className="product-grid product-grid--3">
                <AnimatePresence initial={false}>
                  {list.map((p, i) => (
                    <motion.li key={p.slug} layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: Math.min(i, 8) * 0.05, ease: [0.16, 1, 0.3, 1] } }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                      <ProductCard p={p} phase={(i * 0.137) % 1} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="backdrop" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="filter-sheet" role="dialog" aria-modal="true" aria-label="Filters" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
              <div className="filter-sheet__head"><p className="h3">Filters</p><button className="icon-btn" aria-label="Close filters" onClick={() => setOpen(false)} autoFocus><Icon name="close" /></button></div>
              {filters}
              <button className="btn btn-primary btn-block" onClick={() => setOpen(false)}>Show {list.length} chairs</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
