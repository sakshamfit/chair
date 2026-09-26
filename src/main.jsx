import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, CornerUpLeft, Menu, Search, ShoppingBag, X } from 'lucide-react';
import './styles.css';

const site = 'https://chesselleindia.com';
const images = {
  logo: '/images/chesselle/logo.png',
  hero: '/images/chesselle/elevate-room.png',
  nova: 'https://chesselleindia.com/wp-content/uploads/2026/03/Dinning.webp',
  elevate: 'https://chesselleindia.com/wp-content/uploads/2026/03/Bar2.webp',
  onyx: 'https://chesselleindia.com/wp-content/uploads/2026/03/Onyx-official-chair-3-white-new-update.png',
  clova: 'https://chesselleindia.com/wp-content/uploads/2026/03/set-of-2-chair-orange-color.png',
  vera: 'https://chesselleindia.com/wp-content/uploads/2026/03/Vera-Black-Updated.png',
  counter: 'https://chesselleindia.com/wp-content/uploads/2026/03/elevate-latest-black-color.png',
  jara: 'https://chesselleindia.com/wp-content/uploads/2026/03/jara-chair-black-color-updated-new.png',
  lounge: '/images/chesselle/onyx-card.png',
  featured: '/images/chesselle/nova-card.png',
};

const navLinks = [
  { label: 'About', href: `${site}/about-us/` },
  { label: 'Shop', href: `${site}/shop/` },
  { label: 'Collections', href: `${site}/product-category/chairs/` },
  { label: 'Contact', href: `${site}/contact-us/` },
];

const categories = [
  { name: 'Dining', model: 'NOVA · SIDE CHAIR', detail: 'Compact comfort · from ₹2,199', image: images.nova, href: `${site}/product/nova/` },
  { name: 'Bar', model: 'ELEVATE · BAR STOOL', detail: 'Sculpted seating · from ₹3,699', image: images.elevate, href: `${site}/product/elevate/` },
  { name: 'Lounge', model: 'ONYX · 3-SEATER', detail: 'A little more room to relax', image: images.onyx, href: `${site}/product/official-chair/` },
  { name: 'Cafe', model: 'CLOVA · 2-SEATER', detail: 'Made for shared moments', image: images.clova, href: `${site}/product/clova-official-2-seater-chair/` },
  { name: 'Meeting', model: 'VÉRA · ARMCHAIR', detail: 'Comfort for long conversations', image: images.vera, href: `${site}/product/vera/` },
  { name: 'Counter', model: 'ELEVATE · COUNTER', detail: 'A modern profile, made to last', image: images.counter, href: `${site}/product/elevate/` },
  { name: 'Study', model: 'JARA · WRITING PAD', detail: 'A smarter seat for focused days', image: images.jara, href: `${site}/product/jara/` },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    return () => document.body.classList.remove('menu-open');
  }, [menuOpen]);

  return (
    <>
      <nav className="site-nav animate-fade-in" aria-label="Main navigation">
        <a className="brand animate-slide-left delay-200" href={site} aria-label="Chesselle home">
          <img src={images.logo} alt="Chesselle — Smart, Strong. Modern Designs" />
        </a>
        <div className="desktop-links animate-fade-in delay-400">
          {navLinks.map(({ label, href }) => <a href={href} key={label}>{label}</a>)}
        </div>
        <div className="nav-actions animate-slide-right delay-300">
          <a className="icon-button" href={`${site}/?s=chair&post_type=product`} aria-label="Search chairs"><Search /></a>
          <a className="icon-button" href={`${site}/cart/`} aria-label="Shopping cart"><ShoppingBag /></a>
          <a className="icon-button return-button" href={`${site}/product-category/chairs/`} aria-label="Explore chairs"><CornerUpLeft /></a>
          <a className="prepaid-badge" href={`${site}/shop/`}>10% OFF</a>
          <button className="menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>
      <div className={`mobile-menu ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <button className="mobile-menu-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X /></button>
        <div className="mobile-menu-links">
          {navLinks.map(({ label, href }, index) => (
            <a href={href} key={label} style={{ animationDelay: `${index * 90}ms` }} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
        </div>
        <a className="menu-note" href={`${site}/shop/`}>10% instant discount on prepaid orders <ArrowUpRight /></a>
      </div>
    </>
  );
}

function Word({ text, tone = 'bright', delay = 300 }) {
  return <span className={`word-clip ${tone === 'muted' ? 'word-muted' : ''}`}><span className="word-inner" style={{ animationDelay: `${delay}ms` }}>{text}</span></span>;
}

function Headline() {
  return (
    <h1 className="hero-title" aria-label="The right seat for every space">
      <span className="headline-line"><Word text="The" delay={300} /><Word text="Right" delay={400} /><Word text="Seat" delay={500} /></span>
      <span className="headline-line"><Word text="For" tone="muted" delay={600} /><Word text="Every" delay={700} /></span>
      <span className="headline-line last-line"><Word text="Space." delay={800} />
        <img className="inline-chair-photo animate-scale-in delay-1000" src={images.featured} alt="Chesselle's perforated dining chair" />
      </span>
    </h1>
  );
}

function CategoryCarousel() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % categories.length), 3500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="feature-panel animate-fade-up delay-1000" id="collections" aria-label="Explore Chesselle chair collections">
      <div className="feature-stage" aria-live="polite">
        {categories.map((category, index) => (
          <a className={`feature-card ${index === active ? 'active' : ''}`} key={category.name} href={category.href} aria-hidden={index !== active} tabIndex={index === active ? 0 : -1}>
            <img className="feature-product-image" src={category.image} alt="" />
            <span className="feature-copy">
              <span className="feature-model">{category.name} <i>·</i> {category.model.split('·').at(-1)?.trim()}</span>
              <strong>{category.detail}</strong>
              <span className="feature-link">Discover <ArrowUpRight aria-hidden="true" /></span>
            </span>
          </a>
        ))}
      </div>
      <div className="carousel-dots" role="tablist" aria-label="Chair categories">
        {categories.map((category, index) => <button key={category.name} className={index === active ? 'selected' : ''} role="tab" aria-label={`Show ${category.name} chairs`} aria-selected={index === active} onClick={() => setActive(index)} />)}
      </div>
    </section>
  );
}

function FooterPanels() {
  return (
    <footer className="bottom-panels">
      <section className="assessment-panel animate-fade-up delay-900" id="about">
        <div className="assessment-copy">
          <span className="eyebrow">A little welcome from us</span>
          <h2>10% off your first order</h2>
          <p>Get 10% instant discount on prepaid orders.</p>
          <a href={`${site}/shop/`}>Shop the collection <ArrowUpRight aria-hidden="true" /></a>
        </div>
        <img className="panel-photo" src={images.featured} alt="A Chesselle dining chair in a modern workspace" />
      </section>
      <CategoryCarousel />
      <section className="community-panel animate-fade-up delay-1100" id="contact">
        <img className="featured-chair-image" src={images.lounge} alt="Chesselle Onyx seating" />
        <div className="community-copy">
          <span className="eyebrow">Thoughtful by design</span>
          <strong>Smart. Strong. Modern.</strong>
          <p>Durable molded seating, signature perforated details and colors for every space.</p>
          <a href="tel:+919196189155">+91 91961 89155 <ArrowUpRight aria-hidden="true" /></a>
          <a className="email-link" href="mailto:swastikplastics.india@gmail.com">swastikplastics.india@gmail.com <ArrowUpRight aria-hidden="true" /></a>
          <small>Standard delivery within 7 working days · Bulk & distributor enquiries welcome.</small>
        </div>
      </section>
    </footer>
  );
}

function App() {
  return (
    <main className="landing" id="top">
      <div className="backdrop" aria-hidden="true" />
      <Header />
      <section className="hero-content" id="products">
        <div className="hero-copy">
          <span className="hero-kicker animate-fade-in delay-400">Contemporary seating · Made for real life</span>
          <Headline />
          <div className="cta-row animate-fade-up delay-600">
            <a className="primary-cta" href={`${site}/shop/`}>Explore Chairs <ArrowUpRight aria-hidden="true" /></a>
            <p>Smart, strong, modern designs for homes, cafés, offices and the spaces in between.</p>
          </div>
          <div className="hero-note animate-fade-in delay-700"><span className="note-dot" />Free your space to do more <span className="note-divider">/</span> 10% off prepaid orders</div>
        </div>
      </section>
      <FooterPanels />
      <a className="catalog-link" href={`${site}/#`}>Download the Chesselle catalogue <ArrowUpRight aria-hidden="true" /></a>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
