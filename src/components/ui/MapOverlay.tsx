'use client'

import { useState } from 'react'
import { locationsForState, presenceStates, stateId } from '@/data/presence'
import { useExperience } from '@/lib/store'
import { useIndiaFeatures } from '@/lib/use-india'

/**
 * The map's information layer: an architectural panel (not a modal), an
 * accessible state list and the overview control. Everything here drives the
 * same store the 3D map reads, so keyboard, touch and pointer are equivalent.
 */
export function MapOverlay() {
  const features = useIndiaFeatures()
  const engaged = useExperience((state) => state.mapEngaged)
  const selected = useExperience((state) => state.selectedState)
  const selectState = useExperience((state) => state.selectState)
  const [expanded, setExpanded] = useState(false)

  const feature = features.find((item) => item.properties.id === selected)
  const name = feature?.properties.name ?? ''
  const locations = selected ? locationsForState(selected) : []
  const isPresence = presenceStates.some((state) => stateId(state.name) === selected)

  return (
    <div className="map-ui" data-visible={engaged}>
      <button
        type="button"
        className="map-reset"
        data-visible={Boolean(selected)}
        onClick={() => {
          selectState(null)
          setExpanded(false)
        }}
      >
        <span aria-hidden="true">←</span> INDIA OVERVIEW
      </button>

      <p className="map-hint" data-hide={Boolean(selected)}>
        SELECT A STATE · DRAG TO ORBIT · SCROLL TO CONTINUE
      </p>

      <aside className="panel" data-open={Boolean(selected)} aria-live="polite">
        <p className="panel__label">{isPresence ? 'OUR PRESENCE' : 'STATE'}</p>
        <h3 className="panel__title">{name}</h3>
        <div className="panel__rule" />

        {locations.length ? (
          <ul className="panel__cities">
            {locations.map((location) => (
              <li key={location.city}>
                {location.city}
                <span>
                  {location.coordinates.lat.toFixed(3)}°N {location.coordinates.lng.toFixed(3)}°E
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="panel__empty">
            PRESENCE INFORMATION
            <br />
            COMING SOON
          </p>
        )}

        <div className="panel__foot">
          {locations.length ? (
            <button type="button" className="panel__details" onClick={() => setExpanded((value) => !value)}>
              {expanded ? 'HIDE DETAILS' : 'VIEW DETAILS'} <span aria-hidden="true">→</span>
            </button>
          ) : (
            <span className="panel__details">REGIONAL PRESENCE</span>
          )}
        </div>

        {expanded ? (
          <div className="panel__meta">
            <span>VERIFIED STATE: {name}</span>
            <span>LOCATIONS: {locations.length ? locations.map((l) => l.city.toUpperCase()).join(' · ') : 'NONE PUBLISHED'}</span>
            <span>PROJECT DATA PUBLISHED AS VERIFIED</span>
          </div>
        ) : null}
      </aside>

      <div className="state-rail" role="group" aria-label="Select a state">
        {features.map((item) => (
          <button
            key={item.properties.id}
            type="button"
            className="state-rail__item"
            data-active={item.properties.id === selected}
            onClick={() => {
              selectState(item.properties.id === selected ? null : item.properties.id)
              setExpanded(false)
            }}
          >
            {item.properties.name}
          </button>
        ))}
      </div>
    </div>
  )
}
