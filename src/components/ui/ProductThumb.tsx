import { useState } from 'react'
import { fallbackSrc } from '../../lib/renders'

/** Static high-res render (used where live 3D would be wasteful: search, cart, checkout). */
export function ProductThumb({ slug, color, config, alt, view = 'hero', className = '' }: { slug: string; color: string; config?: string; alt: string; view?: 'hero' | 'front' | 'side' | 'back'; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={`thumb ${className}`}>
      {!failed ? (
        <img src={fallbackSrc(slug, color, view, config)} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <span className="thumb__placeholder" aria-hidden="true" />
      )}
    </span>
  )
}
