import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { collectionBySlug, collections, designerBySlug } from '../data/content'
import { bySlug, formatPrice, products } from '../data/products'
import { ChairStage } from '../components/three/ChairStage'
import { ProductCard } from '../components/ui/ProductCard'
import { Reveal } from '../components/ui/Reveal'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { useTitle } from '../hooks/useTitle'
import NotFound from './NotFound'

export default function CollectionPage() {
  const { slug = '' } = useParams()
  const c = collectionBySlug(slug)
  useTitle(c?.title ?? 'Collection')
  if (!c) return <NotFound />
  const hero = bySlug(c.hero)!
  const list = c.productSlugs ? c.productSlugs.map(bySlug).filter((p): p is NonNullable<typeof p> => !!p) : products.filter((p) => p.category === c.category)
  const d = designerBySlug(hero.designer)!
  const idx = collections.findIndex((x) => x.slug === c.slug)
  const nextC = collections[(idx + 1) % collections.length]
  return (
    <div className="page collection" key={c.slug}>
      <div className="container">
        <Breadcrumb items={[['Home', '/'], ['Collections', '/collections'], [c.title]]} />
        <section className="coll-hero">
          <div className="coll-hero__copy">
            <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>{c.eyebrow}</motion.p>
            <motion.h1 className="display" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}>{c.title}</motion.h1>
            <motion.p className="lead" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.18 }}>{c.intro}</motion.p>
            <motion.p className="small muted tabular" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>{list.length} chairs · from {formatPrice(Math.min(...list.map((p) => p.price)))}</motion.p>
          </div>
          <motion.div className="coll-hero__stage" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
            <ChairStage product={hero} lod="high" period={28} phase={0.05} interactive elevation={8} margin={1.12} />
            <Link to={`/products/${hero.slug}`} className="coll-hero__tag small">
              <span>{hero.name}</span><span className="muted">{d.name}</span><span className="arrow">→</span>
            </Link>
          </motion.div>
        </section>
      </div>
      <section className="section coll-products" aria-label={`${c.title} products`}>
        <div className="container">
          <ul className="product-grid">
            {list.map((p, i) => (
              <Reveal as="li" key={p.slug} delay={(i % 4) * 0.07}><ProductCard p={p} phase={(i * 0.19) % 1} /></Reveal>
            ))}
          </ul>
        </div>
      </section>
      <section className="section coll-story">
        <div className="container coll-story__grid">
          {c.story.map((s, i) => (
            <Reveal key={s.title} dir={i % 2 ? 'right' : 'left'} className="coll-story__item">
              <span className="tabular muted xs">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="h2">{s.title}</h2>
              <p className="body">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="coll-next">
        <Link to={`/collections/${nextC.slug}`} className="container coll-next__link">
          <span className="eyebrow">Next collection</span>
          <span className="display">{nextC.title} <span className="arrow">→</span></span>
        </Link>
      </section>
    </div>
  )
}
