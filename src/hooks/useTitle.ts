import { useEffect } from 'react'

export function useTitle(title: string) {
  useEffect(() => { document.title = title ? `${title} — Chesselle` : 'Chesselle — Smart. Strong. Modern Designs.' }, [title])
}
