import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

type Dir = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade'

const offsets: Record<Dir, Record<string, number>> = {
  up: { y: 28 },
  down: { y: -28 },
  left: { x: -32 },
  right: { x: 32 },
  scale: { scale: 0.96 },
  fade: {},
}

/**
 * Directional scroll reveal. Direction follows hierarchy:
 * up = headlines/cards, left/right = editorial storytelling, scale = 3D & imagery.
 */
export function Reveal({ children, dir = 'up', delay = 0, duration = 0.7, amount = 0.25, as = 'div', ...rest }:
  { children: ReactNode; dir?: Dir; delay?: number; duration?: number; amount?: number; as?: 'div' | 'section' | 'li' | 'p' | 'h2' | 'figure' } & Omit<HTMLMotionProps<'div'>, 'children'>) {
  const reduced = useReducedMotion()
  const M = motion[as] as typeof motion.div
  if (reduced) return <M {...rest}>{children}</M>
  return (
    <M
      initial={{ opacity: 0, ...offsets[dir] }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </M>
  )
}
