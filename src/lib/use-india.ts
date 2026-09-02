'use client'

import { useEffect, useState } from 'react'
import { loadIndiaData, type StateFeature } from './map-data'
import { presenceStates, stateId } from '@/data/presence'

/** All state features, presence states first — used by the map and its UI. */
export function useIndiaFeatures() {
  const [features, setFeatures] = useState<StateFeature[]>([])

  useEffect(() => {
    let alive = true
    loadIndiaData()
      .then((data) => {
        if (!alive) return
        const presenceIds = presenceStates.map((state) => stateId(state.name))
        const ordered = [...data.features].sort((a, b) => {
          const ai = presenceIds.indexOf(a.properties.id)
          const bi = presenceIds.indexOf(b.properties.id)
          if (ai !== -1 || bi !== -1) {
            if (ai === -1) return 1
            if (bi === -1) return -1
            return ai - bi
          }
          return a.properties.name.localeCompare(b.properties.name)
        })
        setFeatures(ordered)
      })
      .catch(() => setFeatures([]))
    return () => {
      alive = false
    }
  }, [])

  return features
}
