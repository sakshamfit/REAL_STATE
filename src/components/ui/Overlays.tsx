'use client'

import { useEffect, useState } from 'react'

export function Overlays() {
  const [hideHint, setHideHint] = useState(false)

  useEffect(() => {
    const onScroll = () => setHideHint(window.scrollY > window.innerHeight * 0.35)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <div className="scroll-hint" style={{ opacity: hideHint ? 0 : 1 }} aria-hidden="true">
        <i />
        EXPLORE
      </div>
    </>
  )
}
