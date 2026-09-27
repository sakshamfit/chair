if (import.meta.env.DEV || location.search.includes('perf')) await import('./lib/perfProbe')
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/layout.css'
import './styles/pages.css'
import { App } from './App'
import { engine } from './three/engine'
import { bootEngine } from './three/boot'

// Start the 3D pipeline immediately, in parallel with React's first render.
if (location.search.includes('nogl')) engine.supported = false
else bootEngine()
;(window as unknown as { __perf?: { mark: (n: string) => void } }).__perf?.mark('app:render')
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
