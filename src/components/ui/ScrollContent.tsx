'use client'

import { useEffect } from 'react'
import { beats } from '@/lib/chapters'
import { scrollToBeat } from '@/lib/scroll'
import { Reveal } from './Reveal'
import { BlockContent } from './BlockContent'

/**
 * The HTML half of the film. Every beat owns a slice of the document; the
 * scroll height of the slices *is* the timeline the camera reads.
 */
export function ScrollContent() {
  useEffect(() => {
    const handler = (event: Event) => scrollToBeat((event as CustomEvent<string>).detail)
    window.addEventListener('rudra:navigate', handler)
    return () => window.removeEventListener('rudra:navigate', handler)
  }, [])

  return (
    <div className="scroll-layer">
      {beats.map((beat) => (
        <section
          key={beat.id}
          id={`beat-${beat.id}`}
          className="beat"
          style={{ height: `${beat.span}vh` }}
          aria-label={beat.label}
        >
          {(beat.blocks ?? []).map((block, index) => (
            <div
              key={`${beat.id}-${index}`}
              className={`block block--${block.align ?? 'left'} ${block.slot ? `block--${block.slot}` : ''}`}
              style={{ flexGrow: block.weight ?? 1, flexBasis: 0, minHeight: 0 }}
            >
              <div className="block__inner">
                <Reveal>
                  <BlockContent block={block} />
                </Reveal>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
