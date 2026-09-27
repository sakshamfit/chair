import type { Category } from './products'

export const BRAND = { name: 'Chesselle', legal: 'Chesselle by Swastik Plastics', tagline: 'Smart. Strong. Modern Designs.' }

export interface Designer {
  slug: string
  name: string
  studio: string
  city: string
  born: string
  bio: string
  philosophy: string
  quote: string
}

export const designers: Designer[] = [
  {
    slug: 'chesselle-studio', name: 'Chesselle Studio', studio: 'Swastik Plastics', city: 'Gida, India', born: '2026',
    bio: 'Chesselle is the in-house design studio of Swastik Plastics, a manufacturer of moulded polypropylene seating for homes, cafés, offices and hospitality spaces across India. The studio works shoulder to shoulder with the factory floor — every curve of a shell is drawn with the mould, the material and the daily life of the chair in mind.',
    philosophy: 'A chair should be smart in how it is made, strong in how it lasts, and modern in how it looks. Durable moulded seating, signature perforated details and colours for every space.',
    quote: 'Smart. Strong. Modern Designs.',
  },
]

export const designerBySlug = (s: string) => designers.find((d) => d.slug === s)

export interface Collection {
  slug: string
  title: string
  category?: Category
  eyebrow: string
  intro: string
  story: { title: string; body: string }[]
  hero: string
  productSlugs?: string[]
}

export const collections: Collection[] = [
  {
    slug: 'dining-chairs', title: 'Dining & Café Chairs', category: 'conference', eyebrow: 'Collection 01', hero: 'nova',
    intro: 'Light, stackable and easy to live with — side chairs for dining rooms, cafés and every table where people gather.',
    story: [
      { title: 'Moulded for daily life', body: 'Premium polypropylene shells shrug off spills, scuffs and busy service. A wipe with a damp cloth and they look new again — ideal for dining areas, cafés and semi-outdoor seating.' },
      { title: 'The perforated back', body: 'Our signature perforation is more than a detail: it ventilates the backrest, lightens the chair and gives every silhouette its unmistakable Chesselle character.' },
    ],
  },
  {
    slug: 'bar-counter-stools', title: 'Bar & Counter Stools', category: 'stool', eyebrow: 'Collection 02', hero: 'elevate',
    intro: 'Sculpted high seating for kitchen islands, bars and counters — in heights that fit your space.',
    story: [
      { title: 'Elevated comfort', body: 'Elevate is built for the counter: an ergonomically contoured seat, a stable base and a clean architectural profile that looks composed from across the room.' },
      { title: 'Two heights, one language', body: 'Choose bar or counter height and keep the same design language across your space — from the breakfast island to the café counter.' },
    ],
  },
  {
    slug: 'lounge-sofas', title: 'Lounge & Sofas', category: 'lounge', eyebrow: 'Collection 03', hero: 'onyx',
    intro: 'Two- and three-seaters with generous room to relax — for waiting lounges, homes and hospitality spaces.',
    story: [
      { title: 'A little more room', body: 'Clova and Onyx bring sculpted moulded seating to the sofa: clean lines, armrest support and contoured comfort that holds up to everyday use.' },
      { title: 'Made for shared moments', body: 'Reception areas, cafés, offices and homes — these are seats designed for conversation, and for the people waiting to have one.' },
    ],
  },
  {
    slug: 'office-study', title: 'Office & Study', category: 'task', eyebrow: 'Collection 04', hero: 'jara',
    intro: 'Focused seating for schools, colleges, study corners and workspaces that need to stay comfortable all day.',
    story: [
      { title: 'A smarter seat', body: 'Jara pairs an ergonomic, arm-supported seat with a sleek silhouette — designed with contemporary schools and colleges in mind, equally at home at a study desk.' },
      { title: 'Quietly durable', body: 'Moulded polypropylene takes years of daily use in its stride, without fabric to fray or foam to flatten.' },
    ],
  },
  {
    slug: 'the-colour-edit', title: 'The Colour Edit', eyebrow: 'Featured collection', hero: 'loft',
    intro: 'Black, gray, orange and white — one confident palette across every seat in the Chesselle range.',
    productSlugs: ['nova', 'loft', 'vera', 'jara', 'elevate', 'clova', 'onyx'],
    story: [
      { title: 'Colour as a tool', body: 'A row of orange shells around a pale table brings energy to a room; white recedes into daylight; black grounds the scheme. Mix freely — the palette always holds together.' },
      { title: 'Colour that lasts', body: 'The colour runs through the entire moulded material, so scuffs and scratches stay the same hue. These chairs age gracefully rather than chip.' },
    ],
  },
]

export const collectionBySlug = (s: string) => collections.find((c) => c.slug === s)

export interface Article {
  slug: string
  title: string
  category: string
  date: string
  readTime: string
  excerpt: string
  productSlug: string
  body: { h?: string; p: string }[]
}

export const articles: Article[] = [
  {
    slug: 'choosing-cafe-seating', title: 'Choosing café seating that lasts', category: 'Guides', date: '2026-08-18', readTime: '5 min', productSlug: 'loft',
    excerpt: 'Weight, stackability, finish and clean-up — the four things that matter more than any spec sheet when chairs work for a living.',
    body: [
      { p: 'Café chairs live hard lives. They move between tables, wait out monsoon humidity on a covered terrace, and meet hundreds of guests a week. The right chair makes that look effortless.' },
      { h: 'Start with the material', p: 'Moulded polypropylene is light enough to lift with one hand, strong enough for daily service, and completely unfazed by spills. A matte texture hides fingerprints and scuffs better than a gloss finish.' },
      { h: 'Stack it, store it, rearrange it', p: 'Floor plans change. Chairs that stack and slide under tables give a small café room to breathe — and make closing time faster.' },
      { h: 'Choose colour deliberately', p: 'One confident colour creates rhythm in a room; neutrals keep the architecture calm. With a shared palette across models, you can mix side chairs, armchairs and stools without visual noise.' },
    ],
  },
  {
    slug: 'the-perforated-back', title: 'The perforated back, explained', category: 'Craft', date: '2026-06-05', readTime: '4 min', productSlug: 'vera',
    excerpt: 'Why every Chesselle backrest breathes — and how a pattern of holes makes a chair lighter, cooler and unmistakably itself.',
    body: [
      { p: 'Look closely at a Chesselle backrest and you will find our signature: a precise grid of perforations that ventilates the shell and gives the chair its character.' },
      { h: 'Comfort you can feel', p: 'In a warm room or a busy café, a solid plastic back traps heat against your body. The perforated grid keeps air moving, so long conversations stay comfortable.' },
      { h: 'Lighter, and just as strong', p: 'Removing material where it is not needed is good engineering. The shell stays strong where it takes your weight, and the chair stays light enough to rearrange with one hand.' },
    ],
  },
  {
    slug: 'four-colours-every-space', title: 'Four colours, every space', category: 'Interiors', date: '2026-04-22', readTime: '5 min', productSlug: 'clova',
    excerpt: 'Black, gray, orange and white — how to build a room around one confident palette.',
    body: [
      { p: 'Chesselle chairs come in the same four colours across the whole range: Black, Gray, Orange and White. It is a small palette with a large range of moods.' },
      { h: 'Rhythm, not decoration', p: 'A set of orange shells around a pale table creates energy and rhythm while the architecture stays calm. White disappears into daylight; black grounds a scheme; gray does the quiet work in between.' },
      { h: 'Dyed through the material', p: 'Because the colour runs through the entire moulded material, scuffs stay the same hue. The chairs age gracefully rather than chip to a different colour underneath.' },
    ],
  },
  {
    slug: 'seating-for-small-spaces', title: 'Seating for small spaces', category: 'Designers', date: '2026-02-10', readTime: '6 min', productSlug: 'nova',
    excerpt: 'Compact footprints, light weights and honest materials — how to seat a lot of life in a few square metres.',
    body: [
      { p: 'A small dining nook, a study corner, a two-table café — compact spaces punish careless furniture and reward chairs that were drawn for them.' },
      { h: 'The footprint test', p: 'A chair should tuck fully under the table when not in use, and leave room to walk behind it when it is. Nova was drawn around this test: a compact footprint with a full-size seat.' },
      { h: 'Light enough to move', p: 'When a chair weighs barely four kilograms, the room can change every day. Pull it to the balcony, add it to the balcony table, tuck it away again.' },
    ],
  },
]

export const articleBySlug = (s: string) => articles.find((a) => a.slug === s)

export const faqs: { q: string; a: string }[] = [
  { q: 'How long does delivery take?', a: 'Standard delivery is within 7 working days across India. Your order is dispatched from our facility at Gida, and we will share tracking details as soon as it ships.' },
  { q: 'What if my chair arrives damaged?', a: 'In the unlikely event of transit damage, contact us within 48 hours with photographs at swastikplastics.india@gmail.com or on +91 91961 89155, and we will arrange a replacement.' },
  { q: 'What does the warranty cover?', a: 'Every Chesselle chair is covered against manufacturing defects for one year from delivery. The moulded polypropylene body, base structure and joints are all included.' },
  { q: 'Do the chairs need assembly?', a: 'Almost all Chesselle chairs arrive ready to use. Where any part needs fitting, it takes under five minutes and no tools are required.' },
  { q: 'How do I care for moulded polypropylene?', a: 'Wipe with a soft damp cloth and mild soap. Avoid harsh solvents and abrasive pads. Our matte finishes are designed to shrug off daily scuffs and spills.' },
  { q: 'Do you take bulk and distributorship orders?', a: 'Yes — bulk, project and distributorship enquiries are welcome. Call +91 91961 89155 or write to swastikplastics.india@gmail.com for quotes and territory availability.' },
]
