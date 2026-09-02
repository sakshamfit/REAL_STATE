'use client'

import { useEffect, useState } from 'react'
import { navigation } from '@/data/company'
import { useExperience } from '@/lib/store'
import { useScrollLock } from '@/lib/scroll'

const TARGETS: Record<string, string> = {
  WORK: 'build',
  SERVICES: 'services-intro',
  PRESENCE: 'india',
  CONTACT: 'contact',
}

export function Navigation() {
  const [solid, setSolid] = useState(false)
  const menuOpen = useExperience((state) => state.menuOpen)
  const setMenuOpen = useExperience((state) => state.setMenuOpen)
  const activeBeat = useExperience((state) => state.activeBeat)

  useScrollLock(menuOpen)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (label: string) => {
    setMenuOpen(false)
    window.dispatchEvent(new CustomEvent('rudra:navigate', { detail: TARGETS[label] }))
  }

  return (
    <>
      <header className={`nav ${solid ? 'nav--solid' : ''}`}>
        <button
          type="button"
          className="nav__brand"
          onClick={() => window.dispatchEvent(new CustomEvent('rudra:navigate', { detail: 'ground' }))}
        >
          RUDRA
          <small>CONSTRUCTIONS &amp; SUPPLIERS</small>
        </button>

        <nav className="nav__links" aria-label="Primary">
          {navigation.map((item) => (
            <button
              key={item.label}
              type="button"
              className="nav__link"
              data-active={isActive(activeBeat, TARGETS[item.label])}
              onClick={() => go(item.label)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" className="nav__menu" onClick={() => setMenuOpen(true)}>
          Menu
        </button>
      </header>

      <div className="menu" data-open={menuOpen} role="dialog" aria-modal="true" aria-label="Menu">
        <button type="button" className="menu__close" onClick={() => setMenuOpen(false)}>
          CLOSE ✕
        </button>
        {navigation.map((item, index) => (
          <button key={item.label} type="button" className="menu__item" onClick={() => go(item.label)}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}

function isActive(activeBeat: string, target: string) {
  if (activeBeat === target) return true
  const groups: Record<string, string[]> = {
    'services-intro': ['services-intro', 'service-civil', 'service-residential', 'service-infrastructure', 'service-solar', 'service-renovation', 'service-materials'],
    india: ['india'],
    contact: ['contact', 'future'],
  }
  return Boolean(groups[target]?.includes(activeBeat))
}
