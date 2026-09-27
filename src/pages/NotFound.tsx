import { Link } from 'react-router-dom'
import { ChairStage } from '../components/three/ChairStage'
import { bySlug } from '../data/products'
import { useTitle } from '../hooks/useTitle'

export default function NotFound() {
  useTitle('Page not found')
  const p = bySlug('nova')!
  return (
    <div className="page container notfound">
      <div className="notfound__stage"><ChairStage product={p} period={20} phase={0.3} elevation={10} /></div>
      <div className="notfound__copy">
        <p className="eyebrow">Error 404</p>
        <h1 className="h1">This seat is empty.</h1>
        <p className="lead">The page you are looking for has moved or never existed. Let’s find you somewhere comfortable.</p>
        <div className="chip-row">
          <Link to="/" className="btn btn-primary">Back to the showroom</Link>
          <Link to="/products" className="btn btn-secondary">Browse chairs</Link>
        </div>
      </div>
    </div>
  )
}
