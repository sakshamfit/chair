import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { bySlug } from '../data/products'
import { ChairStage } from '../components/three/ChairStage'
import { Reveal } from '../components/ui/Reveal'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { SURFACE } from '../components/ui/ProductCard'
import { useTitle } from '../hooks/useTitle'

const PRINCIPLES = [
  { t: 'Moulded for real life', b: 'Every Chesselle chair is moulded from high-quality polypropylene — light to move, strong enough for daily service, and easy to wipe clean. Durable seating that shrugs off real life.', slug: 'loft' },
  { t: 'Smart. Strong. Modern.', b: 'We design seating around how people actually sit: ergonomic contours, supportive armrests and ventilated perforated backs, in silhouettes that stay contemporary for years.', slug: 'jara' },
  { t: 'Colour for every space', b: 'Black, gray, orange and white — one confident palette across dining, bar, lounge and study. The colour runs through the material, so it ages gracefully rather than chips.', slug: 'vera' },
]

const NUMBERS = [['7', 'Chairs in the collection'], ['4', 'Signature colours'], ['7 days', 'Standard delivery'], ['1 yr', 'Warranty on every chair']]

export default function About() {
  useTitle('About')
  return (
    <div className="page about">
      <div className="container">
        <Breadcrumb items={[['Home', '/'], ['About']]} />
        <header className="about__head">
          <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>About Chesselle</motion.p>
          <motion.h1 className="display" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            Smart, strong, modern seating — for homes, cafés, offices and the spaces in between.
          </motion.h1>
        </header>
      </div>
      <section className="section about__numbers">
        <ul className="container numbers">
          {NUMBERS.map(([n, l], i) => (
            <Reveal as="li" key={l} delay={i * 0.06}><span className="display tabular">{n}</span><span className="small muted">{l}</span></Reveal>
          ))}
        </ul>
      </section>
      {PRINCIPLES.map((p, i) => {
        const prod = bySlug(p.slug)!
        return (
          <section className="section" key={p.t}>
            <div className={`container about__row ${i % 2 ? 'is-rev' : ''}`}>
              <Reveal dir="scale" className="about__stage"><ChairStage product={prod} surface={SURFACE} period={32} phase={i * 0.21} margin={1.25} /></Reveal>
              <div className="stack">
                <Reveal dir={i % 2 ? 'right' : 'left'}><span className="tabular muted xs">{String(i + 1).padStart(2, '0')}</span></Reveal>
                <Reveal dir={i % 2 ? 'right' : 'left'} delay={0.05}><h2 className="h1">{p.t}</h2></Reveal>
                <Reveal dir={i % 2 ? 'right' : 'left'} delay={0.1}><p className="body">{p.b}</p></Reveal>
                <Reveal dir={i % 2 ? 'right' : 'left'} delay={0.14}><Link to={`/products/${prod.slug}`} className="btn-text small">See {prod.name} <span className="arrow">→</span></Link></Reveal>
              </div>
            </div>
          </section>
        )
      })}
      <section className="section about__cta">
        <div className="container stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <Reveal><h2 className="h1">Not sure where to start?</h2></Reveal>
          <Reveal delay={0.06}><p className="lead">Four questions. A showroom that rearranges itself around you.</p></Reveal>
          <Reveal delay={0.12}><Link to="/finder" className="btn btn-primary btn-lg">Open the Chair Finder <span className="arrow">→</span></Link></Reveal>
        </div>
      </section>
    </div>
  )
}
