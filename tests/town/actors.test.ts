import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CHARACTER_LIST } from '../../src/library'
import { DEPTH, bodyParts } from '../../town/src/scene/actors'

describe('3D bodies', () => {
  it('extrudes every character into a solid, upright block standing on the ground', () => {
    for (const c of CHARACTER_LIST) {
      const p = bodyParts(c)
      for (const [name, g] of Object.entries({ shell: p.shell, shellFront: p.shellFront, plate: p.plate, plateFront: p.plateFront })) {
        expect(g.getAttribute('position').count, `${c.id} ${name}`).toBeGreaterThan(30)
      }
      p.shell.computeBoundingBox()
      const bb = p.shell.boundingBox!
      expect(bb.min.y, c.id).toBeGreaterThan(-0.12)
      expect(bb.max.y, c.id).toBeGreaterThan(0.5)
      expect(bb.max.y, c.id).toBeLessThan(1.9)
      expect(bb.max.z - bb.min.z, c.id).toBeCloseTo(DEPTH, 1)
      expect(p.height, c.id).toBeGreaterThan(0.5)
      // the textured front sits just in front of the body
      p.shellFront.computeBoundingBox()
      expect(p.shellFront.boundingBox!.min.z, c.id).toBeGreaterThan(DEPTH / 2 - 0.01)
      // face UVs land inside the art
      const uv = p.plateFront.getAttribute('uv') as THREE.BufferAttribute
      for (let i = 0; i < uv.count; i += 1) {
        expect(uv.getX(i)).toBeGreaterThan(-0.05)
        expect(uv.getX(i)).toBeLessThan(1.05)
        expect(uv.getY(i)).toBeGreaterThan(-0.05)
        expect(uv.getY(i)).toBeLessThan(1.05)
      }
    }
  })
})
