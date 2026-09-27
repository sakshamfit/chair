import { useState } from 'react'
import { Link } from 'react-router-dom'
import { designers } from '../data/content'
import { products } from '../data/products'
import { ChairStage } from '../components/three/ChairStage'
import { Reveal } from '../components/ui/Reveal'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { SURFACE } from '../components/ui/ProductCard'
import { useTitle } from '../hooks/useTitle'

export default function Designers() {
  useTitle('Designers')
  return (
    <div className="page">
      <div className="container">
        <Breadcrumb items={[['Home', '/'], ['Designers']]} />
        <header className="catalogue__head">
          <Reveal><h1 className="display">Designers</h1></Reveal>
          <Reveal delay={0.06}><p className="lead">One studio, one clear idea of how we sit — refined across every chair we mould.</p></Reveal>
        </header>
        <ul className="designer-grid">
          {designers.map((d, i) => <DesignerCard key={d.slug} slug={d.slug} i={i} />)}
        </ul>
      </div>
    </div>
  )
}

function DesignerCard({ slug, i }: { slug: string; i: number }) {
  const d = designers.find((x) => x.slug === slug)!
  const works = products.filter((p) => p.designer === d.slug)
  const [h, setH] = useState(false)
  return (
    <Reveal as="li" delay={(i % 3) * 0.08}>
      <Link to={`/designers/${d.slug}`} className="designer-card" onPointerEnter={() => setH(true)} onPointerLeave={() => setH(false)}>
        <div className="designer-card__media"><ChairStage product={works[0]} surface={SURFACE} period={36} phase={i * 0.2} hovered={h} margin={1.3} /></div>
        <p className="eyebrow">{d.city} · {d.studio}</p>
        <h2 className="h3">{d.name}</h2>
        <p className="small muted">{d.philosophy}</p>
        <p className="xs muted">{works.map((w) => w.name).join(' · ')}</p>
      </Link>
    </Reveal>
  )
}
