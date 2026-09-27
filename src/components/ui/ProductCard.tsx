import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChairStage } from '../three/ChairStage'
import { Icon } from './Icon'
import { categoryLabel, defaultVariant, formatPrice, type Product } from '../../data/products'
import { designerBySlug } from '../../data/content'
import { useShop, useUI } from '../../store'

/** Stage backgrounds are the page itself: pure white, no painted panels. */
export const SURFACE: string | null = null

export function WishButton({ slug, name, className = '' }: { slug: string; name: string; className?: string }) {
  const on = useShop((s) => s.wishlist.includes(slug))
  const toggle = useShop((s) => s.toggleWish)
  return (
    <button
      className={`icon-btn wish-btn ${on ? 'is-on' : ''} ${className}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      onClick={(e) => { e.preventDefault(); toggle(slug) }}
    >
      <motion.span key={String(on)} initial={{ scale: on ? 0.6 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} style={{ display: 'grid' }}>
        <Icon name="heart" filled={on} />
      </motion.span>
    </button>
  )
}

export function ProductCard({ p, phase = 0, match, color, clipEl, size = 'md' }: { p: Product; phase?: number; match?: number; color?: string; clipEl?: HTMLElement | null; size?: 'md' | 'lg' }) {
  const [hover, setHover] = useState(false)
  const add = useShop((s) => s.add)
  const notify = useUI((s) => s.notify)
  const designer = designerBySlug(p.designer)
  return (
    <article className={`pcard pcard--${size}`} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <Link to={`/products/${p.slug}`} className="pcard__media" aria-label={`${p.name} by ${designer?.name}`}>
        <ChairStage product={p} color={color} period={38} phase={phase} surface={SURFACE} hovered={hover} margin={1.3} elevation={8} clipEl={clipEl} />
        {p.isNew && <span className="badge pcard__badge">New</span>}
        {match != null && <span className="pcard__match tabular">{Math.round(match * 100)}% match</span>}
      </Link>
      <WishButton slug={p.slug} name={p.name} className="pcard__wish" />
      <div className="pcard__info">
        <div>
          <h3 className="pcard__name"><Link to={`/products/${p.slug}`}>{p.name}</Link></h3>
          <p className="pcard__meta">{designer?.name} · {categoryLabel[p.category]}</p>
          <p className="pcard__price tabular">{formatPrice(p.price)}</p>
        </div>
        <button
          className="pcard__add"
          aria-label={`Add ${p.name} to cart`}
          onClick={() => { add({ slug: p.slug, ...defaultVariant(p) }); notify(`${p.name} added to cart`, '#cart') }}
        >
          <Icon name="bag" className="icon sm" />
        </button>
      </div>
    </article>
  )
}
