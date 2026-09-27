import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { articleBySlug, articles } from '../data/content'
import { bySlug } from '../data/products'
import { ChairStage } from '../components/three/ChairStage'
import { ProductCard, SURFACE } from '../components/ui/ProductCard'
import { Reveal } from '../components/ui/Reveal'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { ArticleCard } from '../components/home/Sections'
import { useTitle } from '../hooks/useTitle'
import NotFound from './NotFound'

export default function ArticlePage() {
  const { slug = '' } = useParams()
  const a = articleBySlug(slug)
  useTitle(a?.title ?? 'Journal')
  if (!a) return <NotFound />
  const p = bySlug(a.productSlug)!
  const more = articles.filter((x) => x.slug !== a.slug).slice(0, 3)
  const date = new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <article className="page article" key={a.slug}>
      <div className="container article__narrow">
        <Breadcrumb items={[['Home', '/'], ['Journal', '/journal'], [a.category]]} />
        <header className="article__head">
          <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{a.category} · {a.readTime} read · <time dateTime={a.date}>{date}</time></motion.p>
          <motion.h1 className="h1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>{a.title}</motion.h1>
          <motion.p className="lead" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>{a.excerpt}</motion.p>
        </header>
      </div>
      <div className="container">
        <motion.div className="article__stage" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.1 }}>
          <ChairStage product={p} surface={SURFACE} lod="high" period={30} phase={0.1} interactive margin={1.1} elevation={8} />
        </motion.div>
      </div>
      <div className="container article__narrow article__body">
        {a.body.map((b, i) => (
          <Reveal key={i} amount={0.4}>
            {b.h && <h2 className="h3">{b.h}</h2>}
            <p className="body">{b.p}</p>
          </Reveal>
        ))}
        <aside className="article__product">
          <p className="eyebrow">Featured in this story</p>
          <div style={{ maxWidth: 360 }}><ProductCard p={p} /></div>
        </aside>
      </div>
      <section className="section">
        <div className="container">
          <div className="section-head"><div><p className="eyebrow">Keep reading</p><h2 className="h2">More from the journal</h2></div><Link to="/journal" className="btn-text small">All stories <span className="arrow">→</span></Link></div>
          <ul className="article-grid">{more.map((m) => <li key={m.slug}><ArticleCard slug={m.slug} /></li>)}</ul>
        </div>
      </section>
    </article>
  )
}
