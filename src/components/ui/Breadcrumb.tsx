import { Fragment } from 'react'
import { Link } from 'react-router-dom'

export function Breadcrumb({ items }: { items: [string, string?][] }) {
  return (
    <nav className="breadcrumb xs" aria-label="Breadcrumb">
      <ol>
        {items.map(([label, to], i) => (
          <Fragment key={label}>
            <li>{to ? <Link to={to}>{label}</Link> : <span aria-current="page">{label}</span>}</li>
            {i < items.length - 1 && <li aria-hidden="true" className="breadcrumb__sep">/</li>}
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
