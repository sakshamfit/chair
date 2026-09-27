import { useState } from 'react'
import { Link } from 'react-router-dom'
import { collections } from '../data/content'
import { bySlug, products } from '../data/products'
import { ChairStage } from '../components/three/ChairStage'
import { Reveal } from '../components/ui/Reveal'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { SURFACE } from '../components/ui/ProductCard'
import { useTitle } from '../hooks/useTitle'

export default function Collections() {
  useTitle('Collections')
  return (
    <div className="page">
      <div className="container">
        <Breadcrumb items={[['Home', '/'], ['Collections']]} />
        <header className="catalogue__head">
          <Reveal><h1 className="display">Collections</h1></Reveal>
          <Reveal delay={0.06}><p className="lead">Six ways into the showroom — by how you sit, and by the spaces you design.</p></Reveal>
        </header>
        <ul className="coll-list">
          {collections.map((c, i) => <CollectionRow key={c.slug} slug={c.slug} index={i} />)}
        </ul>
      </div>
    </div>
  )
}

function CollectionRow({ slug, index }: { slug: string; index: number }) {
  const c = collections.find((x) => x.slug === slug)!
  const p = bySlug(c.hero)!
  const [h, setH] = useState(false)
  const count = c.productSlugs?.length ?? products.filter((x) => x.category === c.category).length
  return (
    <Reveal as="li" dir={index % 2 ? 'right' : 'left'} amount={0.2}>
      <Link to={`/collections/${c.slug}`} className={`coll-row ${index % 2 ? 'is-rev' : ''}`} onPointerEnter={() => setH(true)} onPointerLeave={() => setH(false)}>
        <div className="coll-row__media"><ChairStage product={p} surface={SURFACE} period={34} phase={index * 0.17} hovered={h} margin={1.25} /></div>
        <div className="coll-row__copy">
          <p className="eyebrow">{c.eyebrow} · <span className="tabular">{count}</span> chairs</p>
          <h2 className="h1">{c.title}</h2>
          <p className="body">{c.intro}</p>
          <span className="btn-text small">Explore the collection <span className="arrow">→</span></span>
        </div>
      </Link>
    </Reveal>
  )
}
