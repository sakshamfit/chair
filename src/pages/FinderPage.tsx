import { Finder } from '../components/finder/Finder'
import { useTitle } from '../hooks/useTitle'

export default function FinderPage() {
  useTitle('Chair Finder')
  return <Finder standalone />
}
