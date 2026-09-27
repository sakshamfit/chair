import { products, type Priority, type Product, type Style, type Use } from '../data/products'

export interface Answers { use?: Use; hours?: number; priority?: Priority; style?: Style }

export interface Step {
  id: keyof Answers
  short: string
  title: string
  help: string
  kind: 'choice' | 'slider'
  options?: { v: string; label: string; desc: string; sample?: string }[]
}

export const STEPS: Step[] = [
  {
    id: 'use', short: 'Use', kind: 'choice', title: 'What will you use your chair for?', help: 'The main activity shapes the chair’s mechanism and posture.',
    options: [
      { v: 'task', label: 'Task', desc: 'Focused desk work', sample: 'jara' },
      { v: 'executive', label: 'Executive', desc: 'Private office, long calls', sample: 'jara' },
      { v: 'meeting', label: 'Meeting', desc: 'Conference & dining', sample: 'nova' },
      { v: 'lounge', label: 'Lounge', desc: 'Reading, receptions', sample: 'onyx' },
    ],
  },
  { id: 'hours', short: 'Sitting time', kind: 'slider', title: 'How long do you sit each day?', help: 'Longer days call for more adjustability and support.' },
  {
    id: 'priority', short: 'Priority', kind: 'choice', title: 'What matters most to you?', help: 'We’ll weight the recommendations accordingly.',
    options: [
      { v: 'comfort', label: 'Comfort', desc: 'Soft, generous padding' },
      { v: 'support', label: 'Support', desc: 'Lumbar & posture' },
      { v: 'adjustability', label: 'Adjustability', desc: 'Fine-tune everything' },
      { v: 'design', label: 'Design', desc: 'A statement piece' },
    ],
  },
  {
    id: 'style', short: 'Style', kind: 'choice', title: 'Which style suits your space?', help: 'Choose the aesthetic you feel most at home with.',
    options: [
      { v: 'minimal', label: 'Minimal', desc: 'Quiet & light', sample: 'nova' },
      { v: 'classic', label: 'Classic', desc: 'Timeless craft', sample: 'vera' },
      { v: 'executive', label: 'Executive', desc: 'Polished & professional', sample: 'onyx' },
      { v: 'contemporary', label: 'Contemporary', desc: 'Colour & form', sample: 'loft' },
    ],
  },
]

export const hoursLabel = (h: number) => (h <= 2 ? 'A short while' : h <= 4 ? 'A few hours' : h <= 7 ? 'Several hours' : h < 12 ? 'Most of the day' : 'All day and more')

/** 0..1 match score. With no answers every chair is neutral (0.5). */
export function score(p: Product, a: Answers) {
  let total = 0, max = 0
  if (a.use) { max += 40; total += p.finder.use[0] === a.use ? 40 : p.finder.use.includes(a.use) ? 26 : 0 }
  if (a.hours != null) {
    max += 25
    const b = a.hours <= 3 ? 0 : a.hours <= 6 ? 1 : 2
    total += (p.finder.sitting[b] / 5) * 25
  }
  if (a.priority) { max += 20; total += (p.finder.priorities[a.priority] / 5) * 20 }
  if (a.style) { max += 15; total += p.finder.style[0] === a.style ? 15 : p.finder.style.includes(a.style) ? 10 : 0 }
  return max ? total / max : 0.5
}

export const MATCH_THRESHOLD = 0.62

export function rank(a: Answers) {
  return products.map((p) => ({ p, s: score(p, a) })).sort((x, y) => y.s - x.s)
}

export const matchCount = (a: Answers) => (Object.values(a).some((v) => v != null) ? rank(a).filter((r) => r.s >= MATCH_THRESHOLD).length : products.length)

export function encodeAnswers(a: Answers) {
  const sp = new URLSearchParams()
  Object.entries(a).forEach(([k, v]) => v != null && sp.set(k, String(v)))
  return sp.toString()
}
