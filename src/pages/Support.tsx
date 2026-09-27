import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { faqs } from '../data/content'
import { Icon } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { useShop } from '../store'
import { formatPrice } from '../data/products'
import { useTitle } from '../hooks/useTitle'

export default function Support() {
  useTitle('Support')
  const [open, setOpen] = useState<number | null>(0)
  const [form, setForm] = useState({ name: '', email: '', topic: 'Product advice', message: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const orders = useShop((s) => s.orders)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const x: Record<string, string> = {}
    if (!form.name.trim()) x.name = 'Please enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) x.email = 'Enter a valid email address.'
    if (form.message.trim().length < 10) x.message = 'Tell us a little more (10+ characters).'
    setErr(x)
    if (!Object.keys(x).length) setSent(true)
  }
  return (
    <div className="page container support">
      <Breadcrumb items={[['Home', '/'], ['Support']]} />
      <header className="catalogue__head">
        <Reveal><h1 className="display">Support</h1></Reveal>
        <Reveal delay={0.06}><p className="lead">Delivery, returns, warranty and product advice. Our team replies within one working day.</p></Reveal>
      </header>
      <div className="support__grid">
        <section aria-labelledby="faq-title">
          <h2 id="faq-title" className="h3" style={{ marginBottom: 16 }}>Frequently asked</h2>
          <ul className="accordion">
            {faqs.map((f, i) => (
              <li key={f.q} id={i === 0 ? 'delivery' : i === 2 ? 'warranty' : undefined}>
                <button className="accordion__q" aria-expanded={open === i} aria-controls={`faq-${i}`} onClick={() => setOpen(open === i ? null : i)}>
                  <span>{f.q}</span>
                  <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.25 }} style={{ display: 'grid' }}><Icon name="plus" className="icon sm" /></motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div id={`faq-${i}`} className="accordion__a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}>
                      <p className="body small">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
          {orders.length > 0 && (
            <div className="support__orders">
              <h2 className="h3">Your recent orders</h2>
              <ul>
                {orders.map((o) => (
                  <li key={o.number} className="sum-row small"><span>{o.number} · {new Date(o.date).toLocaleDateString('en-GB')}</span><span className="tabular">{formatPrice(o.total)}</span></li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <section className="support__contact" aria-labelledby="contact-title">
          <h2 id="contact-title" className="h3">Contact us</h2>
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="ok" className="stack" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <p className="h3"><Icon name="checkCircle" /> Thank you, {form.name.split(' ')[0]}.</p>
                <p className="body small">Your message has been prepared for our team. (Demo store: messages are not sent.)</p>
                <button className="btn btn-secondary btn-sm" style={{ justifySelf: 'start' }} onClick={() => { setSent(false); setForm({ ...form, message: '' }) }}>Send another</button>
              </motion.div>
            ) : (
              <motion.form key="form" className="stack" onSubmit={submit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" className="input" value={form.name} aria-invalid={!!err.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />{err.name && <span className="field-error">{err.name}</span>}</div>
                <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" className="input" value={form.email} aria-invalid={!!err.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />{err.email && <span className="field-error">{err.email}</span>}</div>
                <div className="field"><label htmlFor="c-topic">Topic</label>
                  <select id="c-topic" className="select" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                    {['Product advice', 'Order & delivery', 'Returns', 'Warranty & repair', 'Projects & offices'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" className="textarea" value={form.message} aria-invalid={!!err.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />{err.message && <span className="field-error">{err.message}</span>}</div>
                <button className="btn btn-primary" style={{ justifySelf: 'start' }}>Send message <span className="arrow">→</span></button>
              </motion.form>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  )
}
