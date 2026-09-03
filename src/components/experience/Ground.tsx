'use client'

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { stoneMaterial, terrainMaterial } from '@/lib/materials'
import { buildTerrain, prng, scatter, terrainHeight } from '@/lib/terrain'

/**
 * THE GROUND.
 *
 * A displaced terrain with drainage swales, a grass skin where grass actually
 * wins, scattered stones and construction debris. Objects do not float on a
 * clean plane: the verge is dusty, the shoulder is gravel, the swale carries
 * water away from the carriageway.
 */

export function Ground({ quality }: { quality: QualitySettings }) {
  const cell = quality.tier === 'high' ? 4.5 : quality.tier === 'mid' ? 6.5 : 9

  const { soil, grass } = useMemo(
    () =>
      buildTerrain({
        width: 460,
        length: 1180,
        centerZ: -450,
        cell,
      }),
    [cell],
  )

  const soilMaterialInstance = useMemo(() => terrainMaterial('soil', quality.textureSize), [quality.textureSize])
  const grassMaterialInstance = useMemo(() => terrainMaterial('grass', quality.textureSize), [quality.textureSize])

  const debris = useMemo(() => {
    // stones, brick bats and concrete offcuts lying on the ground
    const random = prng(211)
    const count = quality.tier === 'low' ? 90 : quality.tier === 'mid' ? 260 : 520
    const items = scatter(313, {
      count,
      xRange: [-60, 60],
      zRange: [-940, 40],
      minDistance: 1.6,
      avoid: (x) => Math.abs(x) < 6.4,
    })
    const dummy = new THREE.Object3D()
    const stoneGeometry = new THREE.DodecahedronGeometry(1, 0)
    const stone = new THREE.InstancedMesh(stoneGeometry, stoneMaterial(quality.textureSize, false), items.length)
    stone.castShadow = quality.shadows
    stone.receiveShadow = true
    items.forEach((item, index) => {
      const scale = 0.07 + random() * 0.26
      dummy.position.set(item.x, terrainHeight(item.x, item.z) + scale * 0.4, item.z)
      dummy.rotation.set(random() * 3, random() * 3, random() * 3)
      dummy.scale.set(scale * (0.8 + random() * 0.9), scale * (0.5 + random() * 0.4), scale * (0.8 + random() * 0.9))
      dummy.updateMatrix()
      stone.setMatrixAt(index, dummy.matrix)
    })
    stone.instanceMatrix.needsUpdate = true
    return stone
  }, [quality.tier, quality.textureSize, quality.shadows])

  useEffect(
    () => () => {
      soil.dispose()
      grass.dispose()
      debris.geometry.dispose()
    },
    [soil, grass, debris],
  )

  return (
    <group>
      <mesh geometry={soil} material={soilMaterialInstance} receiveShadow />
      <mesh geometry={grass} material={grassMaterialInstance} receiveShadow />
      <primitive object={debris} />
    </group>
  )
}
