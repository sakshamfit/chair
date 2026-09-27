import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cartSubtotal, unitPrice, useShop, type Order } from '../store'
import { bySlug, formatPrice } from '../data/products'
import { ProductThumb } from '../components/ui/ProductThumb'
import { Icon } from '../components/ui/Icon'
import { Logo } from '../components/layout/Logo'
import { useTitle } from '../hooks/useTitle'

const STEPS = ['Information', 'Shipping', 'Payment', 'Review'] as const
const SHIPPING = [
  { id: 'standard', name: 'Standard delivery', eta: '3–5 working days', price: 0 },
  { id: 'express', name: 'Express delivery', eta: '1–2 working days', price: 49 },
  { id: 'whiteglove', name: 'White-glove delivery', eta: 'Scheduled slot · unpacked & placed', price: 120 },
]
const COUNTRIES = ['Austria', 'Belgium', 'Denmark', 'Finland', 'France', 'Germany', 'Ireland', 'Italy', 'Netherlands', 'Norway', 'Portugal', 'Spain', 'Sweden', 'Switzerland', 'United Kingdom']
const VAT = 0.21

type Info = { email: string; firstName: string; lastName: string; address: string; city: string; postcode: string; country: string; phone: string }
type Pay = { method: 'card' | 'invoice'; name: string; number: string; expiry: string; cvc: string; company: string; vat: string }

export function luhn(num: string) {
  const d = num.replace(/\D/g, '')
  if (d.length < 13 || d.length > 19) return false
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i])
    if (i % 2) { n *= 2; if (n > 9) n -= 9 }
    sum += n
  }
  return sum % 10 === 0
}

function validExpiry(v: string) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(v)
  if (!m) return false
  const month = Number(m[1]), year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return false
  const now = new Date()
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
}

export default function Checkout() {
  useTitle('Checkout')
  const cart = useShop((s) => s.cart)
  const placeOrder = useShop((s) => s.placeOrder)
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [info, setInfo] = useState<Info>({ email: '', firstName: '', lastName: '', address: '', city: '', postcode: '', country: 'Germany', phone: '' })
  const [ship, setShip] = useState('standard')
  const [pay, setPay] = useState<Pay>({ method: 'card', name: '', number: '', expiry: '', cvc: '', company: '', vat: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [placing, setPlacing] = useState(false)
  const [agree, setAgree] = useState(false)

  const subtotal = cartSubtotal(cart)
  const shipping = SHIPPING.find((s) => s.id === ship)!
  const total = subtotal + shipping.price
  const tax = useMemo(() => Math.round((total - total / (1 + VAT)) * 100) / 100, [total])

  if (!cart.length && !placing) {
    return (
      <div className="page container checkout-empty">
        <p className="eyebrow">Checkout</p>
        <h1 className="h1">Your cart is empty.</h1>
        <p className="muted">Add a chair to your cart to check out.</p>
        <div className="chip-row"><Link to="/products" className="btn btn-primary">Browse chairs</Link><Link to="/finder" className="btn btn-secondary">Chair Finder</Link></div>
      </div>
    )
  }

  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!/^\S+@\S+\.\S+$/.test(info.email)) e.email = 'Enter a valid email address.'
      if (!info.firstName.trim()) e.firstName = 'Required.'
      if (!info.lastName.trim()) e.lastName = 'Required.'
      if (info.address.trim().length < 4) e.address = 'Enter your street address.'
      if (!info.city.trim()) e.city = 'Required.'
      if (!/^[A-Za-z0-9 -]{3,10}$/.test(info.postcode.trim())) e.postcode = 'Enter a valid postcode.'
    }
    if (s === 2) {
      if (pay.method === 'card') {
        if (!pay.name.trim()) e.name = 'Enter the name on the card.'
        if (!luhn(pay.number)) e.number = 'Enter a valid card number.'
        if (!validExpiry(pay.expiry)) e.expiry = 'Use MM / YY, not in the past.'
        if (!/^\d{3,4}$/.test(pay.cvc)) e.cvc = '3 or 4 digits.'
      } else {
        if (!pay.company.trim()) e.company = 'Enter your company name.'
      }
    }
    if (s === 3 && !agree) e.agree = 'Please accept the terms to continue.'
    setErrors(e)
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return false
    }
    return true
  }
  const next = () => { if (validate(step)) { setDir(1); setStep((s) => s + 1); scrollTo({ top: 0, behavior: 'smooth' }) } }
  const back = () => { setErrors({}); setDir(-1); setStep((s) => s - 1) }
  const submit = () => {
    if (!validate(3)) return
    setPlacing(true)
    setTimeout(() => {
      const order = placeOrder({
        lines: cart.map((l) => ({ ...l, unit: unitPrice(l) })),
        subtotal, shipping: shipping.price, tax, total,
        customer: { email: info.email, firstName: info.firstName, lastName: info.lastName, address: info.address, city: info.city, postcode: info.postcode, country: info.country, phone: info.phone },
        shippingMethod: shipping.name,
        payment: pay.method === 'card' ? `Card ending ${pay.number.replace(/\D/g, '').slice(-4)}` : `Invoice — ${pay.company}`,
      } satisfies Omit<Order, 'number' | 'date'>)
      nav(`/checkout/confirmation?order=${order.number}`, { replace: true })
    }, 1100)
  }

  const f = (k: keyof Info, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field">
      <label htmlFor={`f-${k}`}>{label}</label>
      <input id={`f-${k}`} className="input" value={info[k]} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `e-${k}` : undefined}
        onChange={(e) => { setInfo({ ...info, [k]: e.target.value }); if (errors[k]) setErrors(({ [k]: _, ...rest }) => rest) }} {...props} />
      {errors[k] && <span id={`e-${k}`} className="field-error">{errors[k]}</span>}
    </div>
  )
  const pf = (k: keyof Pay, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, fmt?: (v: string) => string) => (
    <div className="field">
      <label htmlFor={`p-${k}`}>{label}</label>
      <input id={`p-${k}`} className="input" value={pay[k]} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `pe-${k}` : undefined}
        onChange={(e) => { setPay({ ...pay, [k]: fmt ? fmt(e.target.value) : e.target.value }); if (errors[k]) setErrors(({ [k]: _, ...rest }) => rest) }} {...props} />
      {errors[k] && <span id={`pe-${k}`} className="field-error">{errors[k]}</span>}
    </div>
  )

  return (
    <div className="page checkout">
      <div className="container checkout__grid">
        <div className="checkout__main">
          <ol className="checkout-steps" aria-label="Checkout progress">
            <li className="is-done"><span>Cart</span></li>
            {STEPS.map((s, i) => (
              <li key={s} className={i === step ? 'is-active' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
                <span className="tabular">{String(i + 1).padStart(2, '0')}</span><span>{s}</span>
              </li>
            ))}
          </ol>
          <div className="checkout__panel">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.form
                key={step}
                custom={dir}
                noValidate
                onSubmit={(e) => { e.preventDefault(); if (step < 3) next(); else submit() }}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
                className="checkout-form"
              >
                {step === 0 && (
                  <>
                    <h1 className="h2">Contact & delivery address</h1>
                    <div className="form-grid">
                      <div className="span-2">{f('email', 'Email', { type: 'email', autoComplete: 'email', inputMode: 'email' })}</div>
                      {f('firstName', 'First name', { autoComplete: 'given-name' })}
                      {f('lastName', 'Last name', { autoComplete: 'family-name' })}
                      <div className="span-2">{f('address', 'Street and number', { autoComplete: 'street-address' })}</div>
                      {f('postcode', 'Postcode', { autoComplete: 'postal-code' })}
                      {f('city', 'City', { autoComplete: 'address-level2' })}
                      <div className="field">
                        <label htmlFor="f-country">Country</label>
                        <select id="f-country" className="select" value={info.country} onChange={(e) => setInfo({ ...info, country: e.target.value })} autoComplete="country-name">
                          {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      {f('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'tel' })}
                    </div>
                  </>
                )}
                {step === 1 && (
                  <>
                    <h1 className="h2">Delivery method</h1>
                    <div className="radio-cards" role="radiogroup" aria-label="Delivery method">
                      {SHIPPING.map((s) => (
                        <label key={s.id} className={`radio-card ${ship === s.id ? 'is-selected' : ''}`}>
                          <input type="radio" name="ship" value={s.id} checked={ship === s.id} onChange={() => setShip(s.id)} aria-label={`${s.name}, ${s.eta}, ${s.price ? formatPrice(s.price) : "free"}`} />
                          <span className="radio-card__body"><span className="radio-card__title">{s.name}</span><span className="xs muted">{s.eta}</span></span>
                          <span className="tabular">{s.price ? formatPrice(s.price) : 'Free'}</span>
                        </label>
                      ))}
                    </div>
                    <p className="xs muted">Delivering to {info.address}, {info.postcode} {info.city}, {info.country}. <button type="button" className="u-link" onClick={back}>Change</button></p>
                  </>
                )}
                {step === 2 && (
                  <>
                    <h1 className="h2">Payment</h1>
                    <p className="demo-note small"><Icon name="info" className="icon sm" /> This is a demonstration store. No payment is taken and no order is shipped.</p>
                    <div className="radio-cards" role="radiogroup" aria-label="Payment method">
                      <label className={`radio-card ${pay.method === 'card' ? 'is-selected' : ''}`}>
                        <input type="radio" name="pay" aria-label="Credit or debit card" checked={pay.method === 'card'} onChange={() => { setErrors({}); setPay({ ...pay, method: 'card' }) }} />
                        <span className="radio-card__body"><span className="radio-card__title">Credit or debit card</span><span className="xs muted">Visa, Mastercard, Amex</span></span>
                        <Icon name="lock" className="icon sm" />
                      </label>
                      <label className={`radio-card ${pay.method === 'invoice' ? 'is-selected' : ''}`}>
                        <input type="radio" name="pay" aria-label="Invoice" checked={pay.method === 'invoice'} onChange={() => { setErrors({}); setPay({ ...pay, method: 'invoice' }) }} />
                        <span className="radio-card__body"><span className="radio-card__title">Invoice</span><span className="xs muted">For businesses · 30 days</span></span>
                      </label>
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      {pay.method === 'card' ? (
                        <motion.div key="card" className="form-grid" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                          <div className="span-2">{pf('name', 'Name on card', { autoComplete: 'cc-name' })}</div>
                          <div className="span-2">{pf('number', 'Card number', { inputMode: 'numeric', autoComplete: 'cc-number', placeholder: '1234 1234 1234 1234' }, (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim())}</div>
                          {pf('expiry', 'Expiry (MM / YY)', { inputMode: 'numeric', autoComplete: 'cc-exp', placeholder: 'MM / YY' }, (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d })}
                          {pf('cvc', 'Security code', { inputMode: 'numeric', autoComplete: 'cc-csc', placeholder: 'CVC' }, (v) => v.replace(/\D/g, '').slice(0, 4))}
                        </motion.div>
                      ) : (
                        <motion.div key="inv" className="form-grid" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                          {pf('company', 'Company name', { autoComplete: 'organization' })}
                          {pf('vat', 'VAT number (optional)')}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
                {step === 3 && (
                  <>
                    <h1 className="h2">Review your order</h1>
                    <dl className="review-list">
                      <div><dt>Contact</dt><dd>{info.email}</dd><button type="button" className="btn-text xs" onClick={() => { setDir(-1); setStep(0) }}>Edit</button></div>
                      <div><dt>Deliver to</dt><dd>{info.firstName} {info.lastName}, {info.address}, {info.postcode} {info.city}, {info.country}</dd><button type="button" className="btn-text xs" onClick={() => { setDir(-1); setStep(0) }}>Edit</button></div>
                      <div><dt>Method</dt><dd>{shipping.name} · {shipping.eta}</dd><button type="button" className="btn-text xs" onClick={() => { setDir(-1); setStep(1) }}>Edit</button></div>
                      <div><dt>Payment</dt><dd>{pay.method === 'card' ? `Card ending ${pay.number.replace(/\D/g, '').slice(-4)}` : `Invoice — ${pay.company}`}</dd><button type="button" className="btn-text xs" onClick={() => { setDir(-1); setStep(2) }}>Edit</button></div>
                    </dl>
                    <label className="check check--terms">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-invalid={!!errors.agree} />
                      <span>I accept the terms of sale and the 14-day return policy.</span>
                    </label>
                    {errors.agree && <span className="field-error">{errors.agree}</span>}
                  </>
                )}
                <div className="checkout-form__actions">
                  {step > 0 ? <button type="button" className="btn-text small" onClick={back}><span className="arrow">←</span> Back</button> : <Link to="/products" className="btn-text small"><span className="arrow">←</span> Continue shopping</Link>}
                  <button type="submit" className="btn btn-primary btn-lg" disabled={placing}>
                    {step < 3 ? <>Continue to {STEPS[step + 1].toLowerCase()} <span className="arrow">→</span></> : placing ? <span className="spinner" aria-label="Placing order" /> : <>Place order · {formatPrice(total)}</>}
                  </button>
                </div>
              </motion.form>
            </AnimatePresence>
          </div>
        </div>

        <aside className="checkout__summary" aria-label="Order summary">
          <p className="eyebrow">Order summary</p>
          <ul className="summary-lines">
            {cart.map((l) => {
              const p = bySlug(l.slug)!
              return (
                <li key={l.id} className="summary-line">
                  <span className="summary-line__thumb"><ProductThumb slug={l.slug} color={l.color} config={l.config} alt="" /><span className="summary-line__qty tabular">{l.qty}</span></span>
                  <span className="summary-line__name"><span>{p.name}</span><span className="xs muted">{p.colors.find((c) => c.id === l.color)?.name} · {p.frames.find((x) => x.id === l.frame)?.name}</span></span>
                  <span className="tabular small">{formatPrice(unitPrice(l) * l.qty)}</span>
                </li>
              )
            })}
          </ul>
          <div className="summary-totals">
            <div className="sum-row small"><span>Subtotal</span><span className="tabular">{formatPrice(subtotal)}</span></div>
            <div className="sum-row small"><span>Delivery</span><span className="tabular">{shipping.price ? formatPrice(shipping.price) : 'Free'}</span></div>
            <div className="sum-row total"><span>Total</span><span className="tabular">{formatPrice(total)}</span></div>
            <p className="xs muted">Including {formatPrice(tax)} VAT (21%)</p>
          </div>
          <Link to="/" className="checkout__brand" aria-label="Chesselle home"><Logo /></Link>
        </aside>
      </div>
    </div>
  )
}
