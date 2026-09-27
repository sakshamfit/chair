import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChairStage, type ChairStageHandle } from '../three/ChairStage'
import { ProductCard, SURFACE } from '../ui/ProductCard'
import { ProductThumb } from '../ui/ProductThumb'
import { Reveal } from '../ui/Reveal'
import { Icon } from '../ui/Icon'
import { bySlug, categoryLabel, formatPrice, products } from '../../data/products'
import { articles, collections, designers, designerBySlug } from '../../data/content'

/* --------------------------- CATEGORIES --------------------------- */

export function CategoryStrip() {
  const cats = collections.filter((c) => c.category)
  return (
    <section className="section cat-strip" aria-labelledby="cat-title">
      <div className="container">
        <Reveal className="section-head">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2 id="cat-title" className="h2">Every kind of sitting</h2>
          </div>
          <Link to="/products" className="btn-text small">All chairs <span className="arrow">→</span></Link>
        </Reveal>
        <ul className="cat-grid">
          {cats.map((c, i) => {
            const p = bySlug(c.hero)!
            return (
              <Reveal as="li" key={c.slug} delay={i * 0.07} dir="up">
                <CatCard to={`/collections/${c.slug}`} title={c.title} slug={p.slug} phase={i * 0.19} count={products.filter((x) => x.category === c.category).length} />
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function CatCard({ to, title, slug, phase, count }: { to: string; title: string; slug: string; phase: number; count: number }) {
  const [h, setH] = useState(false)
  const p = bySlug(slug)!
  return (
    <Link to={to} className="cat-card" onPointerEnter={() => setH(true)} onPointerLeave={() => setH(false)}>
      <div className="cat-card__media"><ChairStage product={p} surface={SURFACE} period={40} phase={phase} hovered={h} margin={1.28} /></div>
      <div className="cat-card__foot">
        <span><span className="cat-card__title">{title}</span><span className="xs muted tabular"> {count}</span></span>
        <span className="cat-card__arrow" aria-hidden="true"><Icon name="arrowRight" className="icon sm" /></span>
      </div>
    </Link>
  )
}

/* --------------------------- FEATURED ----------------------------- */

export function Featured() {
  const p = bySlug('onyx')!
  const d = designerBySlug(p.designer)!
  return (
    <section className="section featured" aria-labelledby="featured-title">
      <div className="container featured__grid">
        <div className="featured__stage">
          <Reveal dir="scale" duration={0.9} className="featured__stage-inner">
            <ChairStage product={p} lod="high" period={30} phase={0.06} interactive elevation={7} margin={1.26} label={`${p.name}, rotate to inspect`} />
          </Reveal>
          <span className="featured__drag xs muted"><Icon name="rotate" className="icon sm" /> Drag to inspect</span>
        </div>
        <div className="featured__copy">
          <Reveal dir="left"><p className="eyebrow">Featured · {categoryLabel[p.category]}</p></Reveal>
          <Reveal dir="left" delay={0.06}><h2 id="featured-title" className="h1">{p.name}</h2></Reveal>
          <Reveal dir="left" delay={0.1}><p className="muted small">{d.name}, {p.year}</p></Reveal>
          <Reveal dir="left" delay={0.14}><p className="body">{p.description}</p></Reveal>
          <Reveal dir="left" delay={0.18}>
            <ul className="check-list">
              {p.highlights.slice(0, 4).map((h) => <li key={h}><Icon name="checkCircle" className="icon sm" />{h}</li>)}
            </ul>
          </Reveal>
          <Reveal dir="left" delay={0.22} className="featured__actions">
            <Link to={`/products/${p.slug}`} className="btn btn-primary">Discover {p.name} <span className="arrow">→</span></Link>
            <span className="tabular">{formatPrice(p.price)}</span>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------- CRAFT ------------------------------ */

const CRAFT = [
  { id: 'shell', title: 'Moulded polypropylene', body: 'High-quality PP, moulded in a single clean shell — lightweight, strong and wonderfully easy to live with.', view: [0.35, 0.3, 2.1] },
  { id: 'perforation', title: 'The perforated back', body: 'Our signature grid ventilates the backrest, lightens the chair and gives every silhouette its Chesselle character.', view: [1.35, 0.05, 1.6] },
  { id: 'finish', title: 'A matte finish', body: 'Soft, textured and easy to clean — it shrugs off daily scuffs and spills and keeps its calm look for years.', view: [0.6, 0.42, 2.3] },
] as const

export function Craft() {
  const p = bySlug('vera')!
  const [i, setI] = useState(0)
  const stage = useRef<ChairStageHandle>(null)
  const choose = (k: number) => {
    setI(k)
    const [a, t, z] = CRAFT[k].view
    stage.current?.view(a, t, z)
  }
  return (
    <section className="section craft" aria-labelledby="craft-title">
      <div className="container craft__grid">
        <div className="craft__copy">
          <Reveal dir="right"><p className="eyebrow">Craft in detail</p></Reveal>
          <Reveal dir="right" delay={0.06}><h2 id="craft-title" className="h2">Smart moulding, a perforated signature, a build that lasts.</h2></Reveal>
          <div className="craft__tabs" role="tablist" aria-label="Craft details">
            {CRAFT.map((c, k) => (
              <Reveal key={c.id} dir="right" delay={0.1 + k * 0.06}>
                <button role="tab" aria-selected={i === k} className={`craft__tab ${i === k ? 'is-active' : ''}`} onClick={() => choose(k)}>
                  <span className="tabular craft__num">{String(k + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="craft__tab-title">{c.title}</span>
                    <motion.span className="craft__tab-body" initial={false} animate={{ height: i === k ? 'auto' : 0, opacity: i === k ? 1 : 0 }} transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}>
                      <span className="small muted">{c.body}</span>
                    </motion.span>
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
          <Reveal dir="right" delay={0.3}><Link to={`/products/${p.slug}`} className="btn-text small">Explore {p.name} <span className="arrow">→</span></Link></Reveal>
        </div>
        <Reveal dir="scale" className="craft__stage" duration={0.9}>
          <ChairStage ref={stage} product={p} lod="high" period={34} phase={0.05} interactive tiltable elevation={10} margin={1.1} onInteract={() => undefined} />
        </Reveal>
      </div>
    </section>
  )
}

/* --------------------------- NEW ARRIVALS ------------------------- */

export function NewArrivals() {
  const list = products.filter((p) => p.isNew).slice(0, 4)
  return (
    <section className="section" aria-labelledby="new-title">
      <div className="container">
        <Reveal className="section-head">
          <div>
            <p className="eyebrow">New this season</p>
            <h2 id="new-title" className="h2">New arrivals</h2>
          </div>
          <Link to="/products?sort=new" className="btn-text small">View all <span className="arrow">→</span></Link>
        </Reveal>
        <ul className="product-grid">
          {list.map((p, i) => <Reveal as="li" key={p.slug} delay={i * 0.08}><ProductCard p={p} phase={0.1 + i * 0.23} /></Reveal>)}
        </ul>
      </div>
    </section>
  )
}

/* ---------------------------- DESIGNERS --------------------------- */

export function DesignersTeaser() {
  const [active, setActive] = useState(0)
  const d = designers[active]
  const p = products.find((x) => x.designer === d.slug)!
  return (
    <section className="section designers-teaser" aria-labelledby="des-title">
      <div className="container designers-teaser__grid">
        <div>
          <Reveal><p className="eyebrow">Designers</p></Reveal>
          <Reveal delay={0.05}><h2 id="des-title" className="h2">The people behind the chairs</h2></Reveal>
          <ul className="designer-list">
            {designers.map((x, i) => (
              <Reveal as="li" key={x.slug} delay={0.08 + i * 0.05} dir="left">
                <Link to={`/designers/${x.slug}`} className={`designer-row ${i === active ? 'is-active' : ''}`} onPointerEnter={() => setActive(i)} onFocus={() => setActive(i)}>
                  <span className="designer-row__name">{x.name}</span>
                  <span className="designer-row__city xs muted">{x.city}</span>
                  <Icon name="arrowRight" className="icon sm" />
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
        <Reveal dir="scale" className="designers-teaser__aside">
          <div className="designers-teaser__stage"><ChairStage product={p} period={30} phase={0.1} elevation={8} margin={1.2} /></div>
          <motion.blockquote key={d.slug} className="designers-teaser__quote" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="h3">“{d.quote}”</p>
            <footer className="small muted">— {d.name}, {p.name}</footer>
          </motion.blockquote>
        </Reveal>
      </div>
    </section>
  )
}

/* ----------------------------- JOURNAL ---------------------------- */

export function JournalTeaser() {
  return (
    <section className="section journal-teaser" aria-labelledby="jr-title">
      <div className="container">
        <Reveal className="section-head">
          <div>
            <p className="eyebrow">Journal</p>
            <h2 id="jr-title" className="h2">Stories on design, craft and work</h2>
          </div>
          <Link to="/journal" className="btn-text small">All stories <span className="arrow">→</span></Link>
        </Reveal>
        <ul className="article-grid">
          {articles.slice(0, 3).map((a, i) => (
            <Reveal as="li" key={a.slug} delay={i * 0.08}>
              <ArticleCard slug={a.slug} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function ArticleCard({ slug }: { slug: string }) {
  const a = articles.find((x) => x.slug === slug)!
  const p = bySlug(a.productSlug)!
  return (
    <Link to={`/journal/${a.slug}`} className="article-card">
      <span className="article-card__media"><ProductThumb slug={p.slug} color={p.colors[0].id} alt="" /></span>
      <span className="xs muted">{a.category} · {a.readTime}</span>
      <span className="article-card__title">{a.title}</span>
      <span className="small muted">{a.excerpt}</span>
    </Link>
  )
}

/* ---------------------------- SERVICE ----------------------------- */

export function ServiceBar() {
  const items = [
    { icon: 'truck', t: 'Standard delivery', d: 'Within 7 working days across India' },
    { icon: 'returns', t: 'Replacement support', d: 'Transit damage replaced' },
    { icon: 'shield', t: '1-year warranty', d: 'On every chair' },
    { icon: 'cube', t: 'Inspect in 3D', d: 'Every chair, every angle' },
  ] as const
  return (
    <section className="service-bar" aria-label="Our service">
      <ul className="container service-bar__list">
        {items.map((x, i) => (
          <Reveal as="li" key={x.t} delay={i * 0.05} className="service-item">
            <Icon name={x.icon} />
            <span><span className="service-item__t">{x.t}</span><span className="xs muted">{x.d}</span></span>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}
