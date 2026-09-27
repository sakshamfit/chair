import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useShop } from '../store'
import { bySlug, formatPrice } from '../data/products'
import { ChairStage } from '../components/three/ChairStage'
import { Icon } from '../components/ui/Icon'
import { useTitle } from '../hooks/useTitle'

export default function Confirmation() {
  useTitle('Order confirmed')
  const [sp] = useSearchParams()
  const order = useShop((s) => s.orders.find((o) => o.number === sp.get('order')))
  if (!order) {
    return (
      <div className="page container checkout-empty">
        <h1 className="h1">Order not found.</h1>
        <p className="muted">This confirmation link has expired or is incomplete.</p>
        <Link to="/" className="btn btn-primary">Back to the showroom</Link>
      </div>
    )
  }
  const first = bySlug(order.lines[0].slug)!
  const E = [0.16, 1, 0.3, 1] as const
  return (
    <div className="page confirmation">
      <div className="container confirmation__grid">
        <div className="confirmation__stage">
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: E }} style={{ position: 'absolute', inset: 0 }}>
            <ChairStage product={first} color={order.lines[0].color} frame={order.lines[0].frame} config={order.lines[0].config} lod="high" period={28} phase={0.9} elevation={8} />
          </motion.div>
        </div>
        <div className="confirmation__copy">
          <motion.span className="confirmation__check" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 18 }}><Icon name="check" /></motion.span>
          <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>Order {order.number}</motion.p>
          <motion.h1 className="h1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.6, ease: E }}>Thank you, {order.customer.firstName}.</motion.h1>
          <motion.p className="lead" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
            Your order is confirmed. A summary has been prepared for {order.customer.email}. (Demo store: no email is sent and no payment was taken.)
          </motion.p>
          <motion.div className="confirmation__box" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}>
            <ul className="summary-lines">
              {order.lines.map((l) => {
                const p = bySlug(l.slug)!
                return <li key={l.id} className="sum-row small"><span>{l.qty} × {p.name} <span className="muted">· {p.colors.find((c) => c.id === l.color)?.name}</span></span><span className="tabular">{formatPrice(l.unit * l.qty)}</span></li>
              })}
            </ul>
            <div className="sum-row small muted"><span>{order.shippingMethod}</span><span className="tabular">{order.shipping ? formatPrice(order.shipping) : 'Free'}</span></div>
            <div className="sum-row total"><span>Order total</span><span className="tabular">{formatPrice(order.total)}</span></div>
            <dl className="confirmation__meta small">
              <div><dt className="muted">Delivery</dt><dd>{order.customer.address}, {order.customer.postcode} {order.customer.city}, {order.customer.country}</dd></div>
              <div><dt className="muted">Payment</dt><dd>{order.payment}</dd></div>
            </dl>
          </motion.div>
          <div className="chip-row">
            <Link to="/products" className="btn btn-primary">Continue shopping</Link>
            <Link to="/journal" className="btn btn-secondary">Read the journal</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
