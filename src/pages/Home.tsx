import { Hero } from '../components/home/Hero'
import { Finder } from '../components/finder/Finder'
import { CategoryStrip, Craft, DesignersTeaser, Featured, JournalTeaser, NewArrivals, ServiceBar } from '../components/home/Sections'
import { useTitle } from '../hooks/useTitle'

export function Home() {
  useTitle('')
  return (
    <>
      <Hero />
      <Finder />
      <CategoryStrip />
      <Featured />
      <ServiceBar />
      <Craft />
      <NewArrivals />
      <DesignersTeaser />
      <JournalTeaser />
    </>
  )
}
