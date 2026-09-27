import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FinderField } from '../../three/finderField'
import { firstScreenDone } from '../../three/firstScreen'
import { useEngineStatus } from '../three/useEngineStatus'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { Icon } from '../ui/Icon'
import { ProductCard } from '../ui/ProductCard'
import { ProductThumb } from '../ui/ProductThumb'
import { STEPS, hoursLabel, matchCount, rank, score, MATCH_THRESHOLD, type Answers } from '../../lib/finder'
import { formatPrice, products, bySlug, type Product } from '../../data/products'

const FIELD_SURFACE: string | null = null
const EASE = [0.65, 0, 0.35, 1] as const

export function Finder({ standalone = false }: { standalone?: boolean }) {
  const [answers, setAnswers] = useState<Answers>({})
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [view, setView] = useState<'field' | 'results'>('field')
  const reduced = useReducedMotion()
  const headRef = useRef<HTMLDivElement>(null)

  const go = (to: number) => { setDir(to > step ? 1 : -1); setStep(Math.max(0, Math.min(STEPS.length - 1, to))) }
  const set = (patch: Answers, advance = true) => {
    setAnswers((a) => ({ ...a, ...patch }))
    if (advance && step < STEPS.length - 1) setTimeout(() => go(step + 1), reduced ? 0 : 260)
  }
  const count = matchCount(answers)
  const showResults = () => {
    setView('results')
    headRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }
  const restart = () => { setAnswers({}); setStep(0); setDir(-1); setView('field') }

  return (
    <section id="finder" className={`finder ${standalone ? 'finder--page' : ''}`} aria-labelledby="finder-title">
      <div className="container finder__head" ref={headRef}>
        <p className="eyebrow">Chair Finder</p>
        <h2 id="finder-title" className="h2">{view === 'field' ? 'Find the chair that’s right for you' : 'Your recommendations'}</h2>
        <p className="muted small finder__sub">
          {view === 'field' ? 'Answer four short questions. The showroom rearranges itself as you go — the chairs that suit you step forward.' : 'Ranked by how well each chair fits your answers. Every chair can be inspected in 3D.'}
        </p>
      </div>
      <AnimatePresence mode="wait" initial={false} custom={view}>
        {view === 'field' ? (
          <motion.div key="field" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.55, ease: EASE }}>
            <Field answers={answers}>
              <FinderCard step={step} dir={dir} answers={answers} go={go} set={set} count={count} onResults={showResults} />
            </Field>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }} transition={{ duration: 0.55, ease: EASE }}>
            <Results answers={answers} onRefine={() => { setView('field'); setStep(STEPS.length - 1) }} onRestart={restart} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ------------------------------ FIELD ------------------------------ */

function Field({ answers, children }: { answers: Answers; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<FinderField | null>(null)
  const ok = useEngineStatus()
  const reduced = useReducedMotion()
  const nav = useNavigate()
  const [tip, setTip] = useState<{ p: Product; x: number; y: number } | null>(null)
  const scores = useMemo(() => new Map(products.map((p) => [p.slug, score(p, answers)])), [answers])
  // the showroom floor is built only as it approaches the viewport — the first
  // screen (hero) gets the machine to itself while it loads
  const [near, setNear] = useState(false)
  useEffect(() => {
    if (near || !ref.current) return
    let io: IntersectionObserver | null = null
    let cancelled = false
    firstScreenDone.then(() => {
      if (cancelled || !ref.current) return
      io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io?.disconnect() } }, { rootMargin: '900px 0px' })
      io.observe(ref.current)
    })
    return () => { cancelled = true; io?.disconnect() }
  }, [near, ok])

  useEffect(() => {
    if (!ok || !near || !ref.current) return
    const f = new FinderField(ref.current, { reduced, surface: FIELD_SURFACE })
    f.onHover = (p, x, y) => setTip(p ? { p, x, y } : null)
    f.onPick = (p) => nav(`/products/${p.slug}`)
    if (!f.mount()) return
    fieldRef.current = f
    return () => { f.dispose(); fieldRef.current = null }
  }, [ok, reduced, nav, near])

  useEffect(() => { fieldRef.current?.setScores(scores) }, [scores])

  if (!ok) {
    const ranked = [...products].sort((a, b) => (scores.get(b.slug) ?? 0) - (scores.get(a.slug) ?? 0))
    return (
      <div className="finder-field finder-field--static">
        <div className="finder-field__grid">
          {ranked.slice(0, 12).map((p) => (
            <Link key={p.slug} to={`/products/${p.slug}`} style={{ transform: `scale(${0.6 + 0.5 * (scores.get(p.slug) ?? 0.5)})` }}>
              <ProductThumb slug={p.slug} color={p.colors[0].id} alt={p.name} />
            </Link>
          ))}
        </div>
        <div className="finder-field__card-slot">{children}</div>
      </div>
    )
  }
  return (
    <div className="finder-field" ref={ref} role="group" aria-label="Chair showroom. Chairs matching your answers appear larger. Click a chair to open it.">
      <AnimatePresence>
        {tip && (
          <motion.div
            className="field-tip"
            style={{ left: tip.x, top: tip.y }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            key={tip.p.slug}
          >
            <strong>{tip.p.name}</strong>
            <span className="tabular">{formatPrice(tip.p.price)} · {Math.round((scores.get(tip.p.slug) ?? 0.5) * 100)}%</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="finder-field__card-slot" data-no-pick>{children}</div>
    </div>
  )
}

/* ------------------------------- CARD ------------------------------ */

function FinderCard({ step, dir, answers, go, set, count, onResults }: {
  step: number; dir: number; answers: Answers; go: (n: number) => void; set: (a: Answers, adv?: boolean) => void; count: number; onResults: () => void
}) {
  const s = STEPS[step]
  const answered = (i: number) => answers[STEPS[i].id] != null
  const hours = answers.hours ?? 6
  return (
    <div className="finder-card" data-no-pick>
      <div className="finder-card__nav">
        <button className="icon-btn" onClick={() => go(step - 1)} disabled={step === 0} aria-label="Previous question"><Icon name="chevronLeft" /></button>
        <div className="finder-card__steps" role="tablist" aria-label="Questions">
          {STEPS.map((st, i) => (
            <button key={st.id} role="tab" aria-selected={i === step} className={`finder-step ${i === step ? 'is-active' : ''} ${answered(i) ? 'is-done' : ''}`} onClick={() => go(i)}>
              <span className="tabular">{String(i + 1).padStart(2, '0')}</span>
              <span className="finder-step__label">{st.short}</span>
            </button>
          ))}
        </div>
        <button className="icon-btn" onClick={() => go(step + 1)} disabled={step === STEPS.length - 1} aria-label="Next question"><Icon name="chevronRight" /></button>
      </div>
      <div className="finder-card__viewport">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={s.id}
            className="finder-q"
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 70, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -70, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: EASE }}
          >
            <p className="finder-q__title" id={`q-${s.id}`}>{s.title}</p>
            {s.kind === 'slider' ? (
              <div className="finder-slider">
                <output className="finder-slider__value" htmlFor="hours">{hours >= 12 ? '12h+' : `${hours}h`} · <span className="muted">{hoursLabel(hours)}</span></output>
                <input
                  id="hours"
                  type="range"
                  min={1}
                  max={12}
                  step={1}
                  value={hours}
                  aria-labelledby={`q-${s.id}`}
                  aria-valuetext={`${hours} hours, ${hoursLabel(hours)}`}
                  onChange={(e) => set({ hours: Number(e.target.value) }, false)}
                  style={{ ['--p' as string]: `${((hours - 1) / 11) * 100}%` }}
                />
                <div className="finder-slider__scale xs muted"><span>1h</span><span>6h</span><span>12h+</span></div>
                {answers.hours == null && <button className="btn-text xs" onClick={() => set({ hours: 6 })}>Use 6 hours <span className="arrow">→</span></button>}
                {answers.hours != null && <button className="btn-text xs" onClick={() => go(step + 1)}>Next question <span className="arrow">→</span></button>}
              </div>
            ) : (
              <div className="finder-options" role="radiogroup" aria-labelledby={`q-${s.id}`}>
                {s.options!.map((o) => {
                  const sel = answers[s.id] === o.v
                  const sample = o.sample ? bySlug(o.sample) : null
                  return (
                    <button key={o.v} role="radio" aria-checked={sel} className={`finder-opt ${sel ? 'is-selected' : ''}`} onClick={() => set({ [s.id]: o.v } as Answers)}>
                      {sample && <ProductThumb slug={sample.slug} color={sample.colors[0].id} alt="" className="finder-opt__img" />}
                      <span className="finder-opt__label">{o.label}</span>
                      <span className="finder-opt__desc">{o.desc}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <button className="finder-card__cta" onClick={onResults}>
        See results <span className="tabular">({count})</span> <span className="arrow" aria-hidden="true">→</span>
      </button>
    </div>
  )
}

/* ------------------------------ RESULTS ---------------------------- */

function Results({ answers, onRefine, onRestart }: { answers: Answers; onRefine: () => void; onRestart: () => void }) {
  const ranked = useMemo(() => rank(answers), [answers])
  const top = ranked.slice(0, 3)
  const more = ranked.slice(3, 7).filter((r) => r.s >= MATCH_THRESHOLD - 0.12)
  const summary = STEPS.map((s) => {
    const v = answers[s.id]
    if (v == null) return null
    if (s.id === 'hours') return `${v}h a day`
    return s.options?.find((o) => o.v === v)?.label
  }).filter(Boolean)
  return (
    <div className="container finder-results">
      <div className="finder-results__bar">
        <div className="chip-row" aria-label="Your answers">
          {summary.length ? summary.map((t) => <span key={t} className="chip is-static">{t}</span>) : <span className="muted small">No answers yet — showing our most versatile chairs.</span>}
        </div>
        <div className="finder-results__actions">
          <button className="btn btn-secondary btn-sm" onClick={onRefine}><Icon name="arrowLeft" className="icon sm" /> Refine</button>
          <button className="btn-text small" onClick={onRestart}>Start over</button>
        </div>
      </div>
      <ol className="results-grid">
        {top.map((r, i) => (
          <motion.li key={r.p.slug} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.09, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <span className="results-rank tabular">{String(i + 1).padStart(2, '0')}</span>
            <ProductCard p={r.p} phase={i * 0.21} match={r.s} size="lg" />
          </motion.li>
        ))}
      </ol>
      {more.length > 0 && (
        <motion.div className="results-more" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }}>
          <p className="eyebrow">Also worth a look</p>
          <ul className="results-more__list">
            {more.map((r) => (
              <li key={r.p.slug}>
                <Link to={`/products/${r.p.slug}`} className="search-item">
                  <ProductThumb slug={r.p.slug} color={r.p.colors[0].id} alt="" />
                  <span>
                    <span className="search-item__name">{r.p.name}</span>
                    <span className="search-item__meta tabular">{Math.round(r.s * 100)}% match · {formatPrice(r.p.price)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  )
}
