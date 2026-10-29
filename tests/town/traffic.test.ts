import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { Mats } from '../../town/src/scene/kit'
import { buildNav } from '../../town/src/scene/layout'
import { Traffic } from '../../town/src/scene/traffic'
import { railPath } from '../../town/src/scene/world/buildings'

const stubMats = { color: () => new THREE.MeshStandardMaterial(), signal: new THREE.MeshStandardMaterial() } as unknown as Mats

type CarProbe = { x: number; z: number; g: THREE.Group; state: string }

describe('traffic', () => {
  it('keeps every car moving for ten minutes without two cars ever sitting inside each other', () => {
    const scene = new THREE.Scene()
    const traffic = new Traffic(scene, stubMats, railPath())
    const cars = (traffic as unknown as { cars: CarProbe[] }).cars
    expect(cars.length).toBeGreaterThan(10)
    const travelled = cars.map(() => 0)
    const last = cars.map((c) => [c.x, c.z])
    let closest = Infinity
    const dt = 1 / 30
    for (let step = 0; step < 30 * 600; step += 1) {
      traffic.update(step * dt, dt, 0)
      cars.forEach((c, i) => {
        travelled[i] += Math.hypot(c.x - last[i][0], c.z - last[i][1])
        last[i] = [c.x, c.z]
      })
      for (let i = 0; i < cars.length; i += 1) for (let j = i + 1; j < cars.length; j += 1) {
        closest = Math.min(closest, Math.hypot(cars[i].x - cars[j].x, cars[i].z - cars[j].z))
      }
    }
    // no gridlock: everyone covered real distance
    for (const d of travelled) expect(d).toBeGreaterThan(300)
    expect(closest).toBeGreaterThan(1.2)
  })

  it('stops for someone on a zebra crossing', () => {
    const scene = new THREE.Scene()
    const traffic = new Traffic(scene, stubMats, railPath())
    const cars = (traffic as unknown as { cars: CarProbe[] }).cars
    const nav = buildNav()
    const crossings = [...nav.edges.values()].filter((c): c is NonNullable<typeof c> => !!c)
    const dt = 1 / 30
    let nearest = Infinity
    // someone dawdles on a different crossing every 20 seconds
    for (let step = 0; step < 30 * 400; step += 1) {
      const c = crossings[Math.floor(step / 600) % crossings.length]
      const p = { x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2, crossing: c }
      traffic.peds = [p]
      traffic.update(step * dt, dt, 0)
      for (const car of cars) nearest = Math.min(nearest, Math.hypot(car.x - p.x, car.z - p.z))
    }
    expect(nearest).toBeGreaterThan(1.4)
  })
})
