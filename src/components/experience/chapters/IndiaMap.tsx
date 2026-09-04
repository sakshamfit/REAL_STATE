'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { INDIA_MAP } from '@/lib/world'
import { buildIndiaMeshes, buildSurveyRings, disposeMeshes, type StateMeshData } from '@/lib/geometry'
import { clamp, damp } from '@/lib/math'
import { focusMap, mapCamera, OVERVIEW, resetMapView } from '@/lib/map-camera'
import { runtime, useExperience } from '@/lib/store'
import { useIndiaFeatures } from '@/lib/use-india'
import { isPresenceState, locationsForState, stateId } from '@/data/presence'
import type { PresenceLocation } from '@/data/presence'
import type { QualitySettings } from '@/lib/quality'
import { concreteMaterial, metalMaterial, stateBaseMaterial } from '@/lib/materials'
import { latLngToXZ } from '@/lib/projection'
import { useChapterVisibility } from '../hooks'

const COLOR_BASE = new THREE.Color('#47517a')
const COLOR_PRESENCE = new THREE.Color('#5f86f7')
const COLOR_ACTIVE = new THREE.Color('#c9d9ff')
const COLOR_BORDER = new THREE.Color('#7886b5')
const COLOR_BORDER_ACTIVE = new THREE.Color('#dce8ff')
const COLOR_DIM = new THREE.Color('#232c47')

type StateAnim = {
  lift: number
  targetLift: number
  depth: number
  targetDepth: number
  glow: number
  targetGlow: number
  dim: number
  targetDim: number
}

const noRaycast = () => null
const meshRaycast = THREE.Mesh.prototype.raycast
let dragDistance = 0

/**
 * THE PRESENCE MAP.
 *
 * Real state boundaries (GeoJSON -> THREE.Shape -> ExtrudeGeometry), one mesh
 * per state, independently selectable. Hover lifts, click flies the camera in,
 * markers rise and the HTML information layer follows.
 */
export function IndiaMap({ quality }: { quality: QualitySettings }) {
  const features = useIndiaFeatures()
  const gl = useThree((state) => state.gl)

  const groupRef = useRef<THREE.Group>(null)
  const markersRef = useRef<THREE.Group>(null)
  const stateRefs = useRef<(THREE.Group | null)[]>([])

  const engaged = useExperience((state) => state.mapEngaged)
  const selected = useExperience((state) => state.selectedState)
  const hovered = useExperience((state) => state.hoveredState)
  const selectState = useExperience((state) => state.selectState)
  const hoverState = useExperience((state) => state.hoverState)
  const reducedMotion = useExperience((state) => state.reducedMotion)

  const [hoverLabel, setHoverLabel] = useState<{ name: string; x: number; z: number } | null>(null)

  const meshes = useMemo(() => buildIndiaMeshes(features, INDIA_MAP.depth), [features])
  useEffect(() => () => disposeMeshes(meshes), [meshes])

  const rings = useMemo(() => buildSurveyRings(19, 4, 96), [])

  const states = useMemo(
    () =>
      meshes.map((data) => ({
        data,
        presence: isPresenceState(data.id),
        material: stateBaseMaterial(quality.textureSize).clone(),
        border: new THREE.LineBasicMaterial({
          color: COLOR_BORDER.clone(),
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        }),
        anim: {
          lift: 0,
          targetLift: 0,
          depth: INDIA_MAP.baseDepthScale,
          targetDepth: INDIA_MAP.baseDepthScale,
          glow: 0,
          targetGlow: 0,
          dim: 0,
          targetDim: 0,
        } as StateAnim,
      })),
    [meshes, quality.textureSize],
  )

  useEffect(
    () => () =>
      states.forEach((entry) => {
        entry.material.dispose()
        entry.border.dispose()
      }),
    [states],
  )

  /* ------------------------------------------------------------ selection */

  useEffect(() => {
    if (!selected) {
      resetMapView(reducedMotion ? 0.01 : 1.4)
      return
    }
    const data = meshes.find((mesh) => mesh.id === selected)
    if (!data) return
    const radius = clamp(data.area * 2.3, 9.5, 24)
    focusMap(
      { x: INDIA_MAP.x + data.center.x, y: INDIA_MAP.y + 1.1, z: INDIA_MAP.z + data.center.z },
      radius,
      1.02,
      reducedMotion ? 0.01 : 1.7,
    )
    gsap.to(mapCamera, {
      theta: clamp(data.center.x * 0.024, -0.34, 0.34),
      duration: reducedMotion ? 0.01 : 2,
      ease: 'power3.inOut',
      overwrite: 'auto',
    })
  }, [selected, meshes, reducedMotion])

  /* ------------------------------------------------------- pointer / drag */

  useEffect(() => {
    const element = gl.domElement
    let start = { x: 0, y: 0 }
    let moved = 0

    const down = (event: PointerEvent) => {
      mapCamera.dragging = true
      start = { x: event.clientX, y: event.clientY }
      moved = 0
    }
    const move = (event: PointerEvent) => {
      if (!mapCamera.dragging || !runtime.mapInteractive) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      moved += Math.abs(dx) + Math.abs(dy)
      mapCamera.drag.x += dx
      mapCamera.drag.y += dy
      start = { x: event.clientX, y: event.clientY }
    }
    const up = () => {
      mapCamera.dragging = false
      dragDistance = moved
    }

    element.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      element.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl])

  useEffect(() => {
    if (!engaged) {
      hoverState(null)
      setHoverLabel(null)
      document.body.style.cursor = ''
      if (useExperience.getState().selectedState) selectState(null)
    }
  }, [engaged, hoverState, selectState])

  /* ------------------------------------------------------------ animation */

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const group = groupRef.current
    if (!group) return

    const emergence = mapCamera.emergence
    group.visible = emergence > 0.004
    group.position.y = INDIA_MAP.y * emergence
    group.scale.y = Math.max(0.0001, emergence)

    const lambda = reducedMotion ? 16 : 7
    const selectedId = selected

    states.forEach((entry, index) => {
      const { anim, data } = entry
      const isSelected = selectedId === data.id
      const isHovered = hovered === data.id

      anim.targetLift = isSelected ? INDIA_MAP.lift : isHovered ? INDIA_MAP.hoverLift : 0
      anim.targetDepth = isSelected
        ? INDIA_MAP.activeDepthScale
        : isHovered
          ? INDIA_MAP.hoverDepthScale
          : INDIA_MAP.baseDepthScale
      anim.targetGlow = isSelected ? 1 : isHovered ? 0.45 : 0
      anim.targetDim = selectedId && !isSelected ? 1 : 0

      anim.lift = damp(anim.lift, anim.targetLift, lambda, dt)
      anim.depth = damp(anim.depth, anim.targetDepth, lambda, dt)
      anim.glow = damp(anim.glow, anim.targetGlow, lambda, dt)
      anim.dim = damp(anim.dim, anim.targetDim, 5, dt)

      const object = stateRefs.current[index]
      if (object) {
        object.position.y = anim.lift
        object.scale.y = Math.max(0.0001, anim.depth)
      }

      const material = entry.material
      const base = entry.presence ? COLOR_PRESENCE : COLOR_BASE
      material.color.copy(base).lerp(COLOR_ACTIVE, anim.glow).lerp(COLOR_DIM, anim.dim * 0.7)
      material.emissive.set('#cfe0ff')
      material.emissiveIntensity = entry.presence ? 0.06 + anim.glow * 0.08 : anim.glow * 0.06
      material.metalness = 0.14 + anim.glow * 0.06
      material.roughness = 0.84 - anim.glow * 0.1

      const border = entry.border
      border.color.copy(COLOR_BORDER).lerp(COLOR_BORDER_ACTIVE, Math.max(anim.glow, isHovered ? 0.5 : 0))
      border.opacity = 0.18 + anim.glow * 0.5 - anim.dim * 0.1
    })

    // markers ride on top of the selected state's surface
    const selectedEntry = selectedId ? states.find((entry) => entry.data.id === selectedId) : null
    if (markersRef.current && selectedEntry) {
      markersRef.current.position.y =
        selectedEntry.anim.lift + INDIA_MAP.depth * selectedEntry.anim.depth
    }
  })

  const hoveredData = hovered ? meshes.find((mesh) => mesh.id === hovered) : null
  const locations: PresenceLocation[] = selected ? locationsForState(selected) : []

  return (
    <group ref={groupRef} position={[INDIA_MAP.x, INDIA_MAP.y, INDIA_MAP.z]}>
      {/* the model sits on a real stone plinth at ground level */}
      <mesh position={[0, -0.66, 0]} receiveShadow>
        <boxGeometry args={[126, 1.2, 126]} />
        <primitive object={concreteMaterial('mid', 24, quality.textureSize)} attach="material" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[124, 124]} />
        <primitive object={concreteMaterial('light', 30, quality.textureSize)} attach="material" />
      </mesh>
      <lineSegments geometry={rings} position={[0, 0.01, 0]}>
        <lineBasicMaterial color={'#93a3cf'} transparent opacity={0.14} depthWrite={false} />
      </lineSegments>

      {states.map((entry, index) => (
        <group
          key={entry.data.id}
          ref={(object) => {
            stateRefs.current[index] = object
          }}
        >
          <mesh
            geometry={entry.data.geometry}
            material={entry.material}
            castShadow={quality.shadows}
            receiveShadow={quality.shadows}
            raycast={engaged ? meshRaycast : noRaycast}
            onPointerOver={(event) => {
              if (!engaged) return
              event.stopPropagation()
              hoverState(entry.data.id)
              setHoverLabel({ name: entry.data.name, x: entry.data.center.x, z: entry.data.center.z })
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              hoverState(null)
              setHoverLabel(null)
              document.body.style.cursor = ''
            }}
            onClick={(event) => {
              if (!engaged || dragDistance > 10) return
              event.stopPropagation()
              selectState(selected === entry.data.id ? null : entry.data.id)
            }}
          />
          <lineSegments geometry={entry.data.outline} material={entry.border} raycast={noRaycast} />
        </group>
      ))}

      {/* markers */}
      <group ref={markersRef} position={[0, 0, 0]}>
        {locations.map((location, index) => (
          <CityMarker key={`${location.city}-${index}`} location={location} index={index} reducedMotion={reducedMotion} />
        ))}
      </group>

      {/* hover label inside the scene */}
      {engaged && hoverLabel && !selected ? (
        <Html
          transform
          position={[hoverLabel.x, 2.2, hoverLabel.z]}
          distanceFactor={16}
          style={{ pointerEvents: 'none' }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.36em',
              color: "#c6d6f8",
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {hoverLabel.name}
          </span>
        </Html>
      ) : null}
    </group>
  )
}

/** Architectural beacon: line, light, label. Never a map pin. */
function CityMarker({
  location,
  index,
  reducedMotion,
}: {
  location: PresenceLocation
  index: number
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const [x, z] = useMemo(
    () => latLngToXZ(location.coordinates.lat, location.coordinates.lng),
    [location.coordinates.lat, location.coordinates.lng],
  )

  useEffect(() => {
    const object = group.current
    if (!object) return
    object.scale.y = 0.001
    gsap.to(object.scale, {
      y: 1,
      duration: reducedMotion ? 0.01 : 0.95,
      delay: reducedMotion ? 0 : 0.18 + index * 0.14,
      ease: 'power3.out',
    })
  }, [index, reducedMotion])

  void index

  return (
    <group ref={group} position={[x, 0, z]}>
      <mesh position={[0, 1.15, 0]} castShadow material={metalMaterial('accent', 1, 256)}>
        <cylinderGeometry args={[0.045, 0.045, 2.3, 8]} />
      </mesh>
      <mesh position={[0, 2.42, 0]} castShadow material={metalMaterial('accent', 1, 256)}>
        <sphereGeometry args={[0.17, 12, 8]} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.4, 0.44, 40]} />
        <meshBasicMaterial color="#93a3cf" transparent opacity={0.36} depthWrite={false} />
      </mesh>
      <Html transform position={[0, 3.1, 0]} distanceFactor={13} style={{ pointerEvents: 'none' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.32em',
            color: "#eef4ff",
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {location.city}
        </span>
      </Html>
    </group>
  )
}

