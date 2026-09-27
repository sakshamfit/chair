import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Logo } from './Logo'

const COLS = [
  { title: 'Shop', links: [['All chairs', '/products'], ['Dining & café', '/collections/dining-chairs'], ['Bar & counter', '/collections/bar-counter-stools'], ['Lounge & sofas', '/collections/lounge-sofas'], ['Chair Finder', '/finder']] },
  { title: 'Studio', links: [['About', '/about'], ['Designers', '/designers'], ['Journal', '/journal'], ['Collections', '/collections']] },
  { title: 'Help', links: [['Support', '/support'], ['Delivery & returns', '/support#delivery'], ['Warranty', '/support#warranty'], ['Wishlist', '/wishlist']] },
]

export function Footer() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Logo className="logo--lg" />
            <p className="muted small">Smart. Strong. Modern Designs. Contemporary seating, moulded in India and built to last.</p>
          </div>
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title} className="site-footer__col">
              <p className="eyebrow">{c.title}</p>
              <ul>{c.links.map(([l, to]) => <li key={to}><Link to={to} className="u-link-quiet">{l}</Link></li>)}</ul>
            </nav>
          ))}
          <form className="site-footer__news" onSubmit={(e) => { e.preventDefault(); if (/\S+@\S+\.\S+/.test(email)) setDone(true) }}>
            <p className="eyebrow">Newsletter</p>
            {done ? (
              <p className="small"><Icon name="checkCircle" className="icon sm" /> Thank you — you’re on the list.</p>
            ) : (
              <>
                <label htmlFor="news-email" className="visually-hidden">Email address</label>
                <div className="news-field">
                  <input id="news-email" type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
                  <button className="icon-btn bordered" aria-label="Subscribe"><Icon name="arrowRight" className="icon sm" /></button>
                </div>
                <p className="xs muted">New designs and stories, a few times a year.</p>
              </>
            )}
          </form>
        </div>
        <div className="site-footer__bottom xs muted">
          <span>© {new Date().getFullYear()} Chesselle by Swastik Plastics. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
