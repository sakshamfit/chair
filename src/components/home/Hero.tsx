import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { HeroScene } from '../../three/heroScene'
import { useEngineStatus } from '../three/useEngineStatus'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { bySlug } from '../../data/products'
import { fallbackSrc } from '../../lib/renders'

const EASE = [0.16, 1, 0.3, 1] as const

/** Static fallback composition (no WebGL): same radial layout with renders. */
const FALLBACK = [
  ['onyx', 'white', 12, 8, 12, -18], ['elevate', 'black', 78, 6, 13, 14], ['vera', 'orange', 4, 42, 14, 10],
  ['clova', 'gray', 86, 44, 11, -12], ['nova', 'white', 10, 74, 15, 8], ['jara', 'orange', 80, 72, 15, -10],
  ['loft', 'orange', 55, 84, 12, 16], ['nova', 'black', 32, 2, 11, 20],
] as const

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const ok = useEngineStatus()
  const reduced = useReducedMotion()
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (!ok || !ref.current) return
    ;(window as unknown as { __perf?: { mark: (n: string) => void } }).__perf?.mark('hero:effect')
    const hs = new HeroScene(ref.current, { reduced })
    hs.avoidEl = ref.current.querySelector('.hero__content')
    hs.onHover = (slug) => setHint(slug)
    if (!hs.mount()) return
    return () => hs.dispose()
  }, [ok, reduced])

  const d = reduced ? 0 : 1
  const hovered = hint ? bySlug(hint) : null

  return (
    <section ref={ref} className="hero" aria-labelledby="hero-title">
      {!ok && (
        <div className="hero__fallback" aria-hidden="true">
          {FALLBACK.map(([slug, color, x, y, w, r]) => (
            <img key={slug} src={fallbackSrc(slug, color)} alt="" style={{ left: `${x}%`, top: `${y}%`, width: `${w}vw`, transform: `rotate(${r}deg)` }} />
          ))}
        </div>
      )}
      <div className="hero__content">
        <motion.p className="eyebrow" initial={{ opacity: 0, y: 14 * d }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 * d, duration: 0.5, ease: EASE }}>
          Design your space
        </motion.p>
        <h1 id="hero-title" className="display hero__title">
          <motion.span className="line" initial={{ opacity: 0, y: 26 * d }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 * d, duration: 0.7, ease: EASE }}>Welcome to the</motion.span>
          <motion.span className="line" initial={{ opacity: 0, y: 26 * d }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 * d, duration: 0.7, ease: EASE }}>Chair Finder</motion.span>
        </h1>
        <motion.p className="lead hero__lead" initial={{ opacity: 0, y: 16 * d }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 * d, duration: 0.55, ease: EASE }}>
          Explore our collection and find the chair that fits your space.
        </motion.p>
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.62 * d, duration: 0.5, ease: EASE }}>
          <a href="#finder" className="btn btn-primary btn-lg hero__cta" onClick={(e) => { e.preventDefault(); document.getElementById('finder')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }) }}>
            Start <span className="arrow" aria-hidden="true">→</span>
          </a>
        </motion.div>
      </div>
      <motion.div className="hero__foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 * d, duration: 0.6 }}>
        {ok && <span className="hero__hint xs" aria-live="polite">
          {hovered ? <>{hovered.name} · <span className="muted">drag to rotate</span></> : <span className="muted">Drag any chair to turn it</span>}
        </span>}
        <span className="hero__scroll" aria-hidden="true"><span /></span>
      </motion.div>
    </section>
  )
}
