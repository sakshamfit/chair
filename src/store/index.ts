import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { bySlug, priceFor } from '../data/products'

export interface CartLine { id: string; slug: string; color: string; frame: string; config: string; qty: number }
export interface Order {
  number: string
  date: string
  lines: (CartLine & { unit: number })[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  customer: { email: string; firstName: string; lastName: string; address: string; city: string; postcode: string; country: string; phone?: string }
  shippingMethod: string
  payment: string
}

const lineId = (l: Omit<CartLine, 'id' | 'qty'>) => `${l.slug}|${l.color}|${l.frame}|${l.config}`
export const MAX_QTY = 20

interface ShopState {
  cart: CartLine[]
  wishlist: string[]
  orders: Order[]
  add: (l: Omit<CartLine, 'id' | 'qty'>, qty?: number) => void
  setQty: (id: string, qty: number) => void
  remove: (id: string) => void
  clearCart: () => void
  toggleWish: (slug: string) => void
  placeOrder: (o: Omit<Order, 'number' | 'date'>) => Order
}

export const useShop = create<ShopState>()(
  persist(
    (set) => ({
      cart: [],
      wishlist: [],
      orders: [],
      add: (l, qty = 1) => set((s) => {
        const id = lineId(l)
        const ex = s.cart.find((c) => c.id === id)
        if (ex) return { cart: s.cart.map((c) => (c.id === id ? { ...c, qty: Math.min(MAX_QTY, c.qty + qty) } : c)) }
        return { cart: [...s.cart, { ...l, id, qty: Math.min(MAX_QTY, qty) }] }
      }),
      setQty: (id, qty) => set((s) => ({ cart: qty <= 0 ? s.cart.filter((c) => c.id !== id) : s.cart.map((c) => (c.id === id ? { ...c, qty: Math.min(MAX_QTY, qty) } : c)) })),
      remove: (id) => set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),
      clearCart: () => set({ cart: [] }),
      toggleWish: (slug) => set((s) => ({ wishlist: s.wishlist.includes(slug) ? s.wishlist.filter((w) => w !== slug) : [...s.wishlist, slug] })),
      placeOrder: (o) => {
        const order: Order = { ...o, number: 'SD-' + Math.floor(100000 + Math.random() * 900000), date: new Date().toISOString() }
        set((s) => ({ orders: [order, ...s.orders].slice(0, 10), cart: [] }))
        return order
      },
    }),
    { name: 'chesselle-shop', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
)

export const unitPrice = (l: Pick<CartLine, 'slug' | 'frame' | 'config'>) => {
  const p = bySlug(l.slug)
  return p ? priceFor(p, l.frame, l.config) : 0
}

export const cartCount = (cart: CartLine[]) => cart.reduce((n, l) => n + l.qty, 0)
export const cartSubtotal = (cart: CartLine[]) => cart.reduce((n, l) => n + unitPrice(l) * l.qty, 0)

/* --------------------------------- UI --------------------------------- */

interface UIState {
  menu: boolean
  search: boolean
  cart: boolean
  toast: { id: number; text: string; href?: string } | null
  open: (k: 'menu' | 'search' | 'cart') => void
  close: (k?: 'menu' | 'search' | 'cart') => void
  notify: (text: string, href?: string) => void
}

export const useUI = create<UIState>()((set) => ({
  menu: false,
  search: false,
  cart: false,
  toast: null,
  open: (k) => set({ menu: false, search: false, cart: false, [k]: true }),
  close: (k) => set(k ? { [k]: false } as Partial<UIState> : { menu: false, search: false, cart: false }),
  notify: (text, href) => set({ toast: { id: Date.now(), text, href } }),
}))
