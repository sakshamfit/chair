import { useEffect, useState } from 'react'
import { engine } from '../../three/engine'

/**
 * true while WebGL is usable; flips to false (image fallbacks) if the renderer
 * can't be created or the context is lost. No separate probe context is created —
 * the real renderer is booted at startup (see three/boot.ts).
 */
export function useEngineStatus() {
  const [ok, setOk] = useState(engine.supported)
  useEffect(() => engine.onStatus(setOk) as () => void, [])
  return ok
}
