import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'

const Finder = lazy(() => import('./pages/FinderPage'))
const Catalogue = lazy(() => import('./pages/Catalogue'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const Collections = lazy(() => import('./pages/Collections'))
const CollectionPage = lazy(() => import('./pages/CollectionPage'))
const Designers = lazy(() => import('./pages/Designers'))
const DesignerPage = lazy(() => import('./pages/DesignerPage'))
const About = lazy(() => import('./pages/About'))
const Journal = lazy(() => import('./pages/Journal'))
const ArticlePage = lazy(() => import('./pages/ArticlePage'))
const Support = lazy(() => import('./pages/Support'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Confirmation = lazy(() => import('./pages/Confirmation'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Studio = lazy(() => import('./pages/Studio'))

const S = (el: ReactNode) => <Suspense fallback={<div className="page-loading" aria-busy="true" />}>{el}</Suspense>

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="finder" element={S(<Finder />)} />
          <Route path="products" element={S(<Catalogue />)} />
          <Route path="products/:slug" element={S(<ProductPage />)} />
          <Route path="collections" element={S(<Collections />)} />
          <Route path="collections/:slug" element={S(<CollectionPage />)} />
          <Route path="designers" element={S(<Designers />)} />
          <Route path="designers/:slug" element={S(<DesignerPage />)} />
          <Route path="about" element={S(<About />)} />
          <Route path="journal" element={S(<Journal />)} />
          <Route path="journal/:slug" element={S(<ArticlePage />)} />
          <Route path="support" element={S(<Support />)} />
          <Route path="wishlist" element={S(<Wishlist />)} />
          <Route path="checkout" element={S(<Checkout />)} />
          <Route path="checkout/confirmation" element={S(<Confirmation />)} />
          <Route path="*" element={S(<NotFound />)} />
        </Route>
        {import.meta.env.DEV && <Route path="studio" element={S(<Studio />)} />}
      </Routes>
    </BrowserRouter>
  )
}
