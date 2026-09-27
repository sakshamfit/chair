import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { designerBySlug, designers } from '../data/content'
import { products } from '../data/products'
import { ChairStage } from '../components/three/ChairStage'
import { ProductCard } from '../components/ui/ProductCard'
import { Reveal } from '../components/ui/Reveal'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { useTitle } from '../hooks/useTitle'
import NotFound from './NotFound'

export default function DesignerPage() {
  const { slug = '' } = useParams()
  const d = designerBySlug(slug)
  useTitle(d?.name ?? 'Designer')
  if (!d) return <NotFound />
  const works = products.filter((p) => p.designer === d.slug)
  const others = designers.filter((x) => x.slug !== d.slug)
  const E = [0.16, 1, 0.3, 1] as const
  return (
    <div className="page designer-page" key={d.slug}>
      <div className="container">
        <Breadcrumb items={[['Home', '/'], ['Designers', '/designers'], [d.name]]} />
        <section className="coll-hero">
          <div className="coll-hero__copy">
            <motion.p className="eyebrow" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>{d.studio} · {d.city} · b. {d.born}</motion.p>
            <motion.h1 className="display" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.06, ease: E }}>{d.name}</motion.h1>
            <motion.p className="lead" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.14, ease: E }}>{d.bio}</motion.p>
          </div>
          <motion.div className="coll-hero__stage" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: E }}>
            <ChairStage product={works[0]} lod="high" period={28} phase={0.05} interactive elevation={8} margin={1.12} />
          </motion.div>
        </section>
      </div>
      <section className="section">
        <div className="container quote-block">
          <Reveal><p className="eyebrow">Philosophy</p></Reveal>
          <Reveal delay={0.06}><blockquote className="display quote-block__q">“{d.quote}”</blockquote></Reveal>
          <Reveal delay={0.12}><p className="lead">{d.philosophy}</p></Reveal>
        </div>
      </section>
      <section className="section" aria-labelledby="works">
        <div className="container">
          <div className="section-head"><div><p className="eyebrow">Work</p><h2 id="works" className="h2">Chairs by {d.name}</h2></div></div>
          <ul className="product-grid">
            {works.map((p, i) => <Reveal as="li" key={p.slug} delay={i * 0.07}><ProductCard p={p} phase={i * 0.23} /></Reveal>)}
          </ul>
        </div>
      </section>
      <section className="section coll-story">
        <div className="container">
          <p className="eyebrow">Other designers</p>
          <ul className="inline-links">
            {others.map((o) => <li key={o.slug}><Link to={`/designers/${o.slug}`} className="h3 u-link-quiet">{o.name}</Link></li>)}
          </ul>
        </div>
      </section>
    </div>
  )
}
