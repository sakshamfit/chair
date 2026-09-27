import { useState } from 'react'
import { articles } from '../data/content'
import { ArticleCard } from '../components/home/Sections'
import { Reveal } from '../components/ui/Reveal'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { useTitle } from '../hooks/useTitle'

export default function Journal() {
  useTitle('Journal')
  const cats = ['All', ...new Set(articles.map((a) => a.category))]
  const [cat, setCat] = useState('All')
  const list = cat === 'All' ? articles : articles.filter((a) => a.category === cat)
  return (
    <div className="page container">
      <Breadcrumb items={[['Home', '/'], ['Journal']]} />
      <header className="catalogue__head">
        <Reveal><h1 className="display">Journal</h1></Reveal>
        <Reveal delay={0.06}><p className="lead">Stories on design, craft, ergonomics and the people behind the chairs.</p></Reveal>
        <div className="chip-row" role="group" aria-label="Filter stories">
          {cats.map((c) => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      </header>
      <ul className="article-grid article-grid--page">
        {list.map((a, i) => <Reveal as="li" key={a.slug} delay={(i % 3) * 0.07}><ArticleCard slug={a.slug} /></Reveal>)}
      </ul>
    </div>
  )
}
