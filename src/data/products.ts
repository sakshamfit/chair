import type { ChairType } from '../three/chairs'
import type { Finish, Upholstery } from '../three/materials'

export type Category = 'task' | 'executive' | 'conference' | 'lounge' | 'stool'
export type Use = 'task' | 'executive' | 'meeting' | 'lounge'
export type Priority = 'comfort' | 'support' | 'adjustability' | 'design'
export type Style = 'minimal' | 'classic' | 'executive' | 'contemporary'

export interface ColorOption { id: string; name: string; hex: string; upholstery: Upholstery; shell?: string; mesh?: string }
export interface FrameOption { id: Finish; name: string; priceDelta: number }
export interface ConfigOption { id: string; name: string; arms: boolean; priceDelta: number; note?: string }

export interface Product {
  slug: string
  name: string
  designer: string
  year: string
  category: Category
  type: ChairType
  price: number
  tagline: string
  description: string
  highlights: string[]
  colors: ColorOption[]
  frames: FrameOption[]
  configs: ConfigOption[]
  materials: { upholstery: string; frame: string; other: string }
  dimensions: { width: number; depth: number; height: string; seatHeight: string; seatDepth: number; weight: number }
  sustainability: string
  warranty: number
  leadTime: string
  finder: { use: Use[]; sitting: [number, number, number]; priorities: Record<Priority, number>; style: Style[] }
  isNew?: boolean
  /** Real product photography, keyed by color id. When present it takes precedence over the pre-rendered fallbacks. */
  images?: Record<string, string>
  /** Optional real GLB/GLTF model. When present it replaces the procedural model. */
  modelUrl?: string
}

/* Chesselle's shared four-colour palette: Black, Gray, Orange, White. */
const black: ColorOption = { id: 'black', name: 'Black', hex: '#26272b', upholstery: 'plastic', shell: '#26272b' }
const gray: ColorOption = { id: 'gray', name: 'Gray', hex: '#9aa0a4', upholstery: 'plastic', shell: '#9aa0a4' }
const orange: ColorOption = { id: 'orange', name: 'Orange', hex: '#e0732e', upholstery: 'plastic', shell: '#e0732e' }
const white: ColorOption = { id: 'white', name: 'White', hex: '#eceae5', upholstery: 'plastic', shell: '#eceae5' }
const palette = [black, gray, orange, white]

const matteBlack: FrameOption = { id: 'black', name: 'Matte black', priceDelta: 0 }
const softWhite: FrameOption = { id: 'white', name: 'Soft white', priceDelta: 0 }

const UPLOADS = 'https://chesselleindia.com/wp-content/uploads/2026'

export const products: Product[] = [
  {
    slug: 'nova',
    name: 'Nova',
    designer: 'chesselle-studio',
    year: '2026',
    category: 'conference',
    type: 'conf-shell',
    price: 2199,
    tagline: 'Compact comfort for every table.',
    description:
      'Nova is a sleek, contemporary armless dining chair made for compact spaces. Its clean silhouette and perforated back blend seamlessly with modern interiors, while the premium moulded polypropylene body stays lightweight, strong and easy to clean — a practical, stylish choice for dining areas, cafés, study spaces and office meeting zones.',
    highlights: ['Premium moulded polypropylene (PP) body', 'Ventilated perforated backrest', 'Armless ergonomic design', 'Compact footprint for small spaces', 'Easy-to-clean matte finish', 'Indoor & semi-outdoor ready'],
    colors: palette,
    frames: [matteBlack, softWhite],
    configs: [{ id: 'standard', name: 'Armless', arms: false, priceDelta: 0 }],
    materials: { upholstery: 'Moulded polypropylene (PP) shell', frame: 'Integrated PP legs with floor glides', other: 'Textured matte finish' },
    dimensions: { width: 42, depth: 53, height: '81', seatHeight: '45', seatDepth: 37, weight: 4.2 },
    sustainability: 'Moulded from recyclable polypropylene in a single material family — built to last, easy to wipe clean and simple to recycle at end of life.',
    warranty: 1,
    leadTime: 'In stock · delivered within 7 working days',
    finder: { use: ['meeting'], sitting: [2, 3, 1], priorities: { comfort: 3, support: 2, adjustability: 1, design: 4 }, style: ['minimal', 'contemporary'] },
    images: {
      black: `${UPLOADS}/03/IMG_2615.jpg`,
      gray: `${UPLOADS}/03/WhatsApp-Image-2026-03-14-at-6.33.17-PM.jpeg`,
      orange: `${UPLOADS}/03/WhatsApp-Image-2026-03-14-at-6.33.18-PM-2.jpeg`,
      white: `${UPLOADS}/03/WhatsApp-Image-2026-03-14-at-6.33.20-PM-1.jpeg`,
    },
  },
  {
    slug: 'loft',
    name: 'Loft',
    designer: 'chesselle-studio',
    year: '2026',
    category: 'conference',
    type: 'meeting-cantilever',
    price: 2449,
    tagline: 'A clean, perforated classic for dining and cafés.',
    description:
      'Loft is a modern, minimal polypropylene chair for indoor and semi-outdoor use. Its perforated back provides ventilation while creating a contemporary look, and the strong moulded structure with ergonomic support makes it a perfect fit for dining areas, cafés, balconies and office breakout zones — at home in both residential and commercial settings.',
    highlights: ['Premium moulded polypropylene (PP) body', 'Ventilated perforated backrest', 'Strong moulded structure', 'Sleek profile, matte finish', 'Easy to clean & low maintenance', 'Stackable, space-saving design'],
    colors: palette,
    frames: [matteBlack, softWhite],
    configs: [{ id: 'standard', name: 'Armless', arms: false, priceDelta: 0 }],
    materials: { upholstery: 'Moulded polypropylene (PP) shell', frame: 'Integrated PP legs with floor glides', other: 'Textured matte finish' },
    dimensions: { width: 44, depth: 52, height: '82', seatHeight: '45', seatDepth: 38, weight: 4.4 },
    sustainability: 'A single recyclable material, no mixed parts — durable moulding that shrugs off daily wear and needs nothing but a wipe.',
    warranty: 1,
    leadTime: 'In stock · delivered within 7 working days',
    finder: { use: ['meeting'], sitting: [2, 3, 1], priorities: { comfort: 3, support: 2, adjustability: 1, design: 5 }, style: ['minimal', 'contemporary'] },
    images: {
      black: `${UPLOADS}/03/loft-black-updated.webp`,
      gray: `${UPLOADS}/03/loft-black-updated.webp`,
      orange: `${UPLOADS}/03/loft-orange-updated.webp`,
      white: `${UPLOADS}/03/loft-black-updated.webp`,
    },
  },
  {
    slug: 'jara',
    name: 'Jara',
    designer: 'chesselle-studio',
    year: '2026',
    category: 'task',
    type: 'task-light',
    price: 2999,
    tagline: 'A smarter seat for focused days.',
    description:
      'Jara is a modern seating solution designed to complement contemporary schools, colleges and study spaces. Its sleek silhouette and elegant matte finish deliver a refined aesthetic for both minimalist and stylish interiors. Crafted from high-quality moulded polypropylene, it balances durability with light weight, while the ergonomically shaped seat and supportive armrests keep long sessions comfortable.',
    highlights: ['Premium moulded polypropylene (PP) body', 'Ergonomic seating with armrest support', 'Modern sculpted design, clean lines', 'Strong and stable base structure', 'Smooth matte finish', 'Writing-pad ready for study spaces'],
    colors: palette,
    frames: [matteBlack, softWhite],
    configs: [{ id: 'arms', name: 'With armrests', arms: true, priceDelta: 0 }],
    materials: { upholstery: 'Moulded polypropylene (PP) shell', frame: 'Reinforced PP base structure', other: 'Textured matte finish' },
    dimensions: { width: 58, depth: 58, height: '86', seatHeight: '46', seatDepth: 42, weight: 7.5 },
    sustainability: 'Moulded to last through years of daily use — fully recyclable polypropylene with no fabric to wear out.',
    warranty: 1,
    leadTime: 'In stock · delivered within 7 working days',
    finder: { use: ['task', 'executive'], sitting: [4, 4, 2], priorities: { comfort: 4, support: 3, adjustability: 2, design: 3 }, style: ['minimal', 'contemporary'] },
    images: {
      black: `${UPLOADS}/03/jara-chair-black-color-updated-new.png`,
      gray: `${UPLOADS}/03/jara-chair-white-color-updated-new.png`,
      orange: `${UPLOADS}/03/Jara-latest-orange-color-chair.png`,
      white: `${UPLOADS}/03/jara-chair-white-color-updated-new.png`,
    },
  },
  {
    slug: 'vera',
    name: 'Vera',
    designer: 'chesselle-studio',
    year: '2026',
    category: 'conference',
    type: 'conf-shell',
    price: 3349,
    tagline: 'Comfort for long conversations.',
    description:
      'Vera is a modern, minimal polypropylene armchair for both indoor and semi-outdoor use. Its perforated back design ensures proper ventilation while giving the chair a contemporary look. With a strong moulded structure and ergonomic arm support, it is a perfect choice for dining areas, cafés, balconies, terraces and office breakout zones — lightweight, sturdy and durable for daily use.',
    highlights: ['Premium moulded polypropylene body', 'Ventilated perforated backrest', 'Comfortable arm support', 'Stackable, space-saving design', 'Lightweight yet highly sturdy', 'Indoor & semi-outdoor friendly'],
    colors: palette,
    frames: [matteBlack, softWhite],
    configs: [{ id: 'arms', name: 'With armrests', arms: true, priceDelta: 0 }],
    materials: { upholstery: 'Moulded polypropylene (PP) shell', frame: 'Integrated PP legs with floor glides', other: 'Textured matte finish' },
    dimensions: { width: 56, depth: 55, height: '80', seatHeight: '45', seatDepth: 40, weight: 5.6 },
    sustainability: 'One material, endlessly recyclable — no foam, no fabric, nothing to landfill early.',
    warranty: 1,
    leadTime: 'In stock · delivered within 7 working days',
    finder: { use: ['meeting', 'lounge'], sitting: [3, 3, 2], priorities: { comfort: 4, support: 2, adjustability: 1, design: 4 }, style: ['contemporary', 'classic'] },
    images: {
      black: `${UPLOADS}/03/Vera-Black-Updated.png`,
      gray: `${UPLOADS}/03/Vera-Black-Updated.png`,
      orange: `${UPLOADS}/03/Vera-Black-Updated.png`,
      white: `${UPLOADS}/03/vera-chair-white-color-dark-bg.png`,
    },
  },
  {
    slug: 'elevate',
    name: 'Elevate',
    designer: 'chesselle-studio',
    year: '2026',
    category: 'stool',
    type: 'stool-drafting',
    price: 3699,
    tagline: 'Sculpted seating for elevated counters.',
    description:
      'Elevate is a sophisticated high chair crafted for contemporary homes, bars, cafés, offices and hospitality environments. Its clean architectural lines and smooth matte finish create a high-end look for any counter. Manufactured from durable moulded polypropylene, it is lightweight yet structurally strong, and the ergonomically contoured seat stays comfortable through extended seating.',
    highlights: ['Premium moulded polypropylene (PP) seat', 'High chair for elevated seating', 'Contemporary sculpted design', 'Strong, stable base structure', 'Matte finish for a refined look', 'Bar & counter heights'],
    colors: palette,
    frames: [matteBlack, softWhite],
    configs: [
      { id: 'bar', name: 'Bar height', arms: false, priceDelta: 0, note: 'For 100–110 cm counters' },
      { id: 'counter', name: 'Counter height', arms: false, priceDelta: 0, note: 'For 85–95 cm counters' },
    ],
    materials: { upholstery: 'Moulded polypropylene (PP) seat', frame: 'Powder-coated steel pedestal with footrest', other: 'Textured matte finish' },
    dimensions: { width: 42, depth: 44, height: '105–115', seatHeight: '65–75', seatDepth: 38, weight: 6.8 },
    sustainability: 'Built from recyclable PP and steel — parts that can be separated and recycled, in a stool made to take years of busy service.',
    warranty: 1,
    leadTime: 'In stock · delivered within 7 working days',
    finder: { use: ['meeting', 'lounge'], sitting: [2, 2, 1], priorities: { comfort: 3, support: 2, adjustability: 1, design: 5 }, style: ['contemporary'] },
    images: {
      black: `${UPLOADS}/03/elevate-latest-black-color.png`,
      gray: `${UPLOADS}/03/IMG_2627.jpg`,
      orange: `${UPLOADS}/03/IMG_2627.jpg`,
      white: `${UPLOADS}/03/IMG_2627.jpg`,
    },
  },
  {
    slug: 'clova',
    name: 'Clova 2-Seater',
    designer: 'chesselle-studio',
    year: '2026',
    category: 'lounge',
    type: 'lounge-club',
    price: 5699,
    tagline: 'Made for shared moments.',
    description:
      'Clova is a contemporary two-seater designed to enhance bars, restaurants, cafés and shared spaces. With its refined silhouette and smooth matte finish, it adds a sophisticated touch to both minimalist and professional interiors. Crafted from high-quality moulded polypropylene, Clova is lightweight yet exceptionally durable, and its ergonomically contoured seating keeps everyday use comfortable.',
    highlights: ['Two-seat moulded polypropylene (PP) body', 'Contemporary sculpted design', 'Strong and stable structure', 'Smooth matte finish', 'Easy to clean, low maintenance', 'Indoor & semi-outdoor ready'],
    colors: palette,
    frames: [matteBlack, softWhite],
    configs: [{ id: 'arms', name: 'With armrests', arms: true, priceDelta: 0 }],
    materials: { upholstery: 'Moulded polypropylene (PP) shells', frame: 'Integrated PP bench structure', other: 'Textured matte finish' },
    dimensions: { width: 120, depth: 62, height: '78', seatHeight: '42', seatDepth: 46, weight: 11 },
    sustainability: 'Mono-material moulding with no foam or fabric to replace — wipe clean and fully recyclable at end of life.',
    warranty: 1,
    leadTime: 'In stock · delivered within 7 working days',
    finder: { use: ['lounge', 'meeting'], sitting: [3, 4, 1], priorities: { comfort: 5, support: 2, adjustability: 1, design: 4 }, style: ['contemporary', 'classic'] },
    images: {
      black: `${UPLOADS}/03/set-of-2-chair-white.png`,
      gray: `${UPLOADS}/03/set-of-2-chair-gray-color.png`,
      orange: `${UPLOADS}/03/set-of-2-chair-orange-color.png`,
      white: `${UPLOADS}/03/set-of-2-chair-white.png`,
    },
  },
  {
    slug: 'onyx',
    name: 'Onyx 3-Seater',
    designer: 'chesselle-studio',
    year: '2026',
    category: 'lounge',
    type: 'lounge-club',
    price: 7699,
    tagline: 'A little more room to relax.',
    description:
      'Onyx is a contemporary three-seater for modern homes, offices, waiting areas and hospitality environments. Its refined silhouette and smooth matte finish complement both minimalist and professional interiors. Manufactured from high-quality moulded polypropylene, it is lightweight yet exceptionally durable, with ergonomically contoured seating and armrest support for daily comfort.',
    highlights: ['Three-seat moulded polypropylene (PP) body', 'Ergonomically contoured seating', 'Armrest support', 'Strong, stable structure', 'Smooth matte finish', 'Easy to clean, low maintenance'],
    colors: palette,
    frames: [matteBlack, softWhite],
    configs: [{ id: 'arms', name: 'With armrests', arms: true, priceDelta: 0 }],
    materials: { upholstery: 'Moulded polypropylene (PP) shells', frame: 'Integrated PP bench structure', other: 'Textured matte finish' },
    dimensions: { width: 165, depth: 62, height: '80', seatHeight: '43', seatDepth: 47, weight: 15 },
    sustainability: 'Mono-material moulding with no foam or fabric to replace — wipe clean and fully recyclable at end of life.',
    warranty: 1,
    leadTime: 'In stock · delivered within 7 working days',
    finder: { use: ['lounge'], sitting: [3, 4, 1], priorities: { comfort: 5, support: 3, adjustability: 1, design: 4 }, style: ['contemporary', 'executive'] },
    images: {
      black: `${UPLOADS}/03/Onyx-Official-Chair-3-black-new-improved.png`,
      gray: `${UPLOADS}/03/Onyx-Official-Chair-3-black-new-improved.png`,
      orange: `${UPLOADS}/03/Onyx-official-chair-3-white-new-update.png`,
      white: `${UPLOADS}/03/Onyx-official-chair-3-white-new-update.png`,
    },
  },
]

export const bySlug = (slug: string) => products.find((p) => p.slug === slug)

export const categoryLabel: Record<Category, string> = {
  task: 'Office & Study Chair',
  executive: 'Executive Chair',
  conference: 'Dining & Side Chair',
  lounge: 'Lounge & Sofa',
  stool: 'Bar & Counter Stool',
}

export function priceFor(p: Product, frameId?: string, configId?: string) {
  const f = p.frames.find((x) => x.id === frameId) ?? p.frames[0]
  const c = p.configs.find((x) => x.id === configId) ?? p.configs[0]
  return p.price + f.priceDelta + c.priceDelta
}

export const defaultVariant = (p: Product) => ({ color: p.colors[0].id, frame: p.frames[0].id, config: p.configs[0].id })

export function specFor(p: Product, colorId?: string, frameId?: string) {
  const c = p.colors.find((x) => x.id === colorId) ?? p.colors[0]
  return { upholstery: c.upholstery, color: c.hex, frame: (frameId ?? p.frames[0].id) as Finish, shell: c.shell, mesh: c.mesh }
}

export function shapeFor(p: Product, configId?: string) {
  const c = p.configs.find((x) => x.id === configId) ?? p.configs[0]
  return { type: p.type, arms: c.arms }
}

export const formatPrice = (n: number) => '₹' + n.toLocaleString('en-IN')
