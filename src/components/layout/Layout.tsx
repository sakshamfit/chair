import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from './Header'
import { Footer } from './Footer'
import { OverlayManager } from './Overlays'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { scheduleWarmup } from '../../three/warmup'
import { markFirstScreenDone } from '../../three/firstScreen'

/** Page transition: fade + subtle upward movement (≈650ms total). */
export function Layout() {
  const location = useLocation()
  const outlet = useOutlet()
  const reduced = useReducedMotion()
  const key = location.pathname

  useLayoutEffect(() => { if ('scrollRestoration' in history) history.scrollRestoration = 'manual' }, [])
  // prepare every chair + shader in idle time so scrolling never compiles anything
  // (starts once the first screen has settled, so it never competes with the entrance)
  useEffect(() => { scheduleWarmup() }, [])
  // pages without a hero: the first screen is simply the loaded page
  useEffect(() => { if (location.pathname !== '/') { const t = setTimeout(markFirstScreenDone, 700); return () => clearTimeout(t) } }, [location.pathname])

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      <AnimatePresence mode="wait" initial={false} onExitComplete={() => {
        if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
        else window.scrollTo(0, 0)
      }}>
        <motion.main
          id="main"
          key={key}
          className="page-root"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ opacity: 0, y: reduced ? 0 : -8, transition: { duration: 0.22, ease: [0.65, 0, 0.35, 1] } }}
        >
          {outlet}
        </motion.main>
      </AnimatePresence>
      <Footer />
      <OverlayManager />
    </>
  )
}
