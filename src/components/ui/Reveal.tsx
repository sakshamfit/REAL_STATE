'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { registerGsap } from '@/lib/scroll'

type RevealProps = {
  children: ReactNode
  className?: string
  start?: string
  id?: string
}

/**
 * Editorial reveal: display lines slide out of their own mask, supporting
 * copy floats up. Reverses when scrolling back so the film replays.
 */
export function Reveal({ children, className, start = 'top 86%', id }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    registerGsap()
    const el = ref.current
    if (!el) return

    const lines = el.querySelectorAll('.display .line > span')
    const items = el.querySelectorAll('.reveal')

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(lines, { yPercent: 0, opacity: 1 })
      gsap.set(items, { opacity: 1, y: 0 })
      return
    }

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: el, start, toggleActions: 'play none none reverse' },
      })
      if (lines.length) {
        timeline.fromTo(
          lines,
          { yPercent: 110 },
          { yPercent: 0, duration: 1.35, stagger: 0.075, ease: 'expo.out' },
          0,
        )
      }
      if (items.length) {
        timeline.to(items, { opacity: 1, y: 0, duration: 1.05, stagger: 0.085, ease: 'power3.out' }, 0.12)
      }
    }, el)

    return () => ctx.revert()
  }, [start])

  return (
    <div ref={ref} className={className} id={id}>
      {children}
    </div>
  )
}
