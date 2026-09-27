# Chesselle — Smart. Strong. Modern Designs.

The Chesselle showroom: a white, editorial furniture store where every chair is a real, slowly
rotating 3D object. The catalogue, brand and content live in `src/data/` — this project is the
[Sedile](https://github.com/gireeshkumarreddy/Sedile) 3D showroom with its data replaced by the
Chesselle range (Nova, Loft, Jara, Vera, Elevate, Clova and Onyx).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
```

For GitHub Pages deploys, copy the workflow from the upstream Sedile repo
(`.github/workflows/deploy.yml`) — it builds with `BASE_PATH=/<repo>/` and copies `index.html`
to `404.html` so deep links load the app. (It is not included here because the push token used
for this branch lacks the `workflows` scope.)

## Where the data lives

| Data | Where |
| --- | --- |
| Products — names, prices (₹), colours, dimensions, descriptions, photography | `src/data/products.ts` |
| Brand, collections, journal articles, FAQs | `src/data/content.ts` |
| Static product imagery | `images` map per product (real photos from chesselleindia.com) |
| 3D chair shapes / colours | `type: ChairType` in `src/three/chairs/families.ts` |

## What's inside

| Area | Where |
| --- | --- |
| Hero — radial 3D chair composition, staggered entrance, drag-to-spin, soft floor shadows | `src/three/heroScene.ts`, `src/components/home/Hero.tsx` |
| Chair Finder — 4 questions; the 3D showroom floor rescales chairs live by match score | `src/three/finderField.ts`, `src/components/finder/Finder.tsx`, `src/lib/finder.ts` |
| Product page — interactive 3D (drag, tilt, zoom, keyboard), live colour/configuration options | `src/pages/ProductPage.tsx` |
| Catalogue — search, category/price/designer filters, sort (URL-driven) | `src/pages/Catalogue.tsx` |
| Commerce — persistent cart & wishlist, cart drawer, 4-step checkout, confirmation | `src/store/index.ts`, `src/pages/Checkout.tsx` |
| Editorial — collections, designers, about, journal, support | `src/pages/*` |

## 3D system

* **One WebGL context for the whole site** (`src/three/engine.ts`). A fixed transparent canvas sits behind the DOM;
  opaque header/drawers/menus naturally cover it.
* **Procedural chair families** (`src/three/chairs/`) — geometry is built in a worker, cached and merged.
* **Pre-rendered fallbacks** — when WebGL is unavailable, static product photography is shown instead
  (`src/lib/renders.ts`).

Based on the Sedile showroom architecture by Gireesh Kumar Reddy.
