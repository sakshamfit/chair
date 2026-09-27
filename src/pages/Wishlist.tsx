import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useShop } from '../store'
import { bySlug } from '../data/products'
import { ProductCard } from '../components/ui/ProductCard'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { useTitle } from '../hooks/useTitle'

export default function Wishlist() {
  useTitle('Wishlist')
  const list = useShop((s) => s.wishlist).map(bySlug).filter((p): p is NonNullable<typeof p> => !!p)
  return (
    <div className="page container">
      <Breadcrumb items={[['Home', '/'], ['Wishlist']]} />
      <header className="catalogue__head">
        <h1 className="h1">Wishlist</h1>
        <p className="lead">{list.length ? `${list.length} saved ${list.length === 1 ? 'chair' : 'chairs'}. Saved on this device.` : 'Chairs you save appear here.'}</p>
      </header>
      {list.length === 0 ? (
        <div className="empty-state">
          <p className="muted">Tap the heart on any chair to keep it for later.</p>
          <div className="chip-row"><Link to="/products" className="btn btn-primary">Browse chairs</Link><Link to="/finder" className="btn btn-secondary">Chair Finder</Link></div>
        </div>
      ) : (
        <ul className="product-grid" style={{ paddingBottom: 120 }}>
          <AnimatePresence>
            {list.map((p, i) => (
              <motion.li key={p.slug} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.4 }}>
                <ProductCard p={p} phase={i * 0.19} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
