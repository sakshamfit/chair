import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '../ui/Icon'
import { cartCount, useShop, useUI } from '../../store'
import { Logo } from './Logo'

const NAV = [
  { to: '/products', label: 'Products' },
  { to: '/collections', label: 'Collections' },
  { to: '/designers', label: 'Designers' },
  { to: '/about', label: 'About' },
]

export function Header() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const last = useRef(0)
  const open = useUI((s) => s.open)
  const menuOpen = useUI((s) => s.menu)
  const count = useShop((s) => cartCount(s.cart))
  const wish = useShop((s) => s.wishlist.length)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      if (Math.abs(y - last.current) > 6) {
        setHidden(y > last.current && y > 240)
        last.current = y
      }
    }
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [pathname])

  const isHidden = hidden && !menuOpen
  useEffect(() => {
    if (isHidden) document.documentElement.dataset.headerHidden = ''
    else delete document.documentElement.dataset.headerHidden
  }, [isHidden])

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''} ${hidden && !menuOpen ? 'is-hidden' : ''}`}>
      <div className="site-header__inner container">
        <Link to="/" className="site-header__logo" aria-label="Chesselle — home"><Logo /></Link>
        <nav className="site-header__nav" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="site-header__actions">
          <button className="icon-btn" aria-label="Search" onClick={() => open('search')}><Icon name="search" /></button>
          <Link to="/wishlist" className="icon-btn hide-sm" aria-label={`Wishlist, ${wish} items`}>
            <Icon name="heart" />
            <CountBadge n={wish} />
          </Link>
          <button className="icon-btn" aria-label={`Cart, ${count} items`} onClick={() => open('cart')}>
            <Icon name="bag" />
            <CountBadge n={count} />
          </button>
          <button className="icon-btn" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => open('menu')}><Icon name="menu" /></button>
        </div>
      </div>
    </header>
  )
}

function CountBadge({ n }: { n: number }) {
  return (
    <AnimatePresence initial={false}>
      {n > 0 && (
        <motion.span
          key={n}
          className="count-badge tabular"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          aria-hidden="true"
        >
          {n}
        </motion.span>
      )}
    </AnimatePresence>
  )
}
