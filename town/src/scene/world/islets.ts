// The three islets: 游乐岛 (ferris wheel, carousel, ice cream), 农场岛
// (windmill, barn, fields) and 港口岛 (lighthouse, docks and the Signal Gate,
// where other people's bots will one day arrive).
import * as THREE from 'three'
import { ISLETS } from '../layout'
import { Batcher, C, Frame, Mats, box, cone, cyl, rbox, slab, sphere } from '../kit'
import { makeRng } from '../../work/rng'
import { bench, cottage, door, lamp, makeSign, windowAt } from './buildings'
import type { Occupancy } from './ground'

export interface IsletAnims { tick: (t: number, dt: number, night: number) => void }

function strut(parent: THREE.Object3D, a: THREE.Vector3Tuple, b: THREE.Vector3Tuple, r: number, mat: THREE.Material) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b)
  const len = va.distanceTo(vb)
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat)
  m.position.copy(va).add(vb).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize())
  m.castShadow = true
  parent.add(m)
  return m
}

export function buildIslets(b: Batcher, occ: Occupancy, mats: Mats, scene: THREE.Object3D): IsletAnims {
  const anims: Array<(t: number, dt: number, night: number) => void> = []
  const fun = ISLETS[0], farm = ISLETS[1], harbor = ISLETS[2]

  /* ---------------- 游乐岛 ---------------- */
  {
    const cx = fun.x, cz = fun.z
    const wz = cz - 4
    b.put('tiles', slab(12, 5, 0.3, 1, 0.05), cx, 0, wz, C.walk)
    const wheel = new THREE.Group()
    wheel.position.set(cx, 11, wz)
    scene.add(wheel)
    const rimMat = mats.color(C.coral)
    const paper = mats.color(C.paper)
    for (const z of [-0.75, 0.75]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(9, 0.24, 12, 96), rimMat)
      rim.position.z = z
      rim.castShadow = true
      wheel.add(rim)
      const inner = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.12, 8, 64), paper)
      inner.position.z = z
      wheel.add(inner)
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2
        strut(wheel, [0, 0, z], [Math.cos(a) * 9, Math.sin(a) * 9, z], 0.07, paper)
      }
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 24), mats.color(C.indigo))
    hub.rotation.x = Math.PI / 2
    wheel.add(hub)
    const cabins: THREE.Object3D[] = []
    const CAB = ['#6f9fd8', '#5fc4a6', '#ffd27a', '#9a94cc', '#fe6a4a', '#ffb3a1']
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2
      const cab = new THREE.Group()
      cab.position.set(Math.cos(a) * 9, Math.sin(a) * 9, 0)
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 0.5, 6, 16), mats.color(CAB[i % CAB.length]))
      body.rotation.z = Math.PI / 2
      body.position.y = -1.6
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 1.0, 20, 1, true), mats.color('#bcdcf3', { side: THREE.DoubleSide, roughness: 0.2 }))
      glass.rotation.x = Math.PI / 2
      glass.position.y = -1.45
      const roof = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), paper)
      roof.position.y = -0.95
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), mats.color(C.indigo))
      rod.position.y = -0.45
      for (const m of [body, glass, roof, rod]) { m.castShadow = true; cab.add(m) }
      wheel.add(cab)
      cabins.push(cab)
    }
    const legMat = mats.color(C.indigo)
    for (const oz of [-1.4, 1.4]) for (const sx of [-1, 1]) strut(scene, [cx + sx * 5.2, 0.3, wz + oz], [cx, 11, wz + oz * 0.6], 0.24, legMat)
    occ.rect(cx - 6, wz - 2.6, cx + 6, wz + 2.6)
    const sign = makeSign('摩天轮', null, 2.6, { bg: C.coral })
    sign.position.set(cx + 7, 2.2, wz + 2.6)
    scene.add(sign)
    b.put('paint', cyl(0.07, 0.07, 2.0, 8), cx + 7, 1.0, wz + 2.55, C.indigo)
    anims.push((_t, dt) => {
      wheel.rotation.z += dt * 0.1
      for (const c of cabins) c.rotation.z = -wheel.rotation.z
    })

    // carousel
    const kx = cx - 21.2, kz = cz
    b.put('paint', cyl(3.9, 4.1, 0.36, 40), kx, 0.18, kz, C.paper)
    const spin = new THREE.Group()
    spin.position.set(kx, 0, kz)
    scene.add(spin)
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.55, 0.22, 40), mats.color(C.coral))
    plat.position.y = 0.47
    plat.receiveShadow = true
    spin.add(plat)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 3.6, 16), paper)
    pole.position.y = 2.2
    spin.add(pole)
    const roofMat = mats.color(C.coral)
    for (let i = 0; i < 12; i += 1) {
      const seg = new THREE.Mesh(new THREE.ConeGeometry(4.0, 1.8, 3, 1, false, (i / 12) * Math.PI * 2, (Math.PI * 2) / 12), i % 2 ? paper : roofMat)
      seg.position.y = 4.5
      seg.castShadow = true
      spin.add(seg)
    }
    const valance = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.16, 10, 48), mats.color(C.sun))
    valance.rotation.x = Math.PI / 2
    valance.position.y = 3.62
    spin.add(valance)
    const flag = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), mats.signal)
    flag.position.y = 5.6
    spin.add(flag)
    const SEAT = ['#cff0e6', '#ffd27a', '#c4bfea', '#d3e7f8', '#ffe3d8', '#b5e4d4', '#f5ebd6', '#9fd3f0']
    const seats: THREE.Object3D[] = []
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2
      const px = Math.cos(a) * 2.6, pz = Math.sin(a) * 2.6
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.1, 8), mats.color(C.sun, { metalness: 0.4, roughness: 0.3 }))
      p.position.set(px, 2.05, pz)
      spin.add(p)
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.9), mats.color(SEAT[i]))
      seat.position.set(px, 1.25, pz)
      seat.rotation.y = -a
      seat.castShadow = true
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mats.signal)
      dot.position.set(-0.28, 0.5, 0.3)
      seat.add(dot)
      spin.add(seat)
      seats.push(seat)
    }
    occ.circle(kx, kz, 4.3)
    anims.push((t, dt) => {
      spin.rotation.y += dt * 0.5
      seats.forEach((s, i) => { s.position.y = 1.25 + Math.sin(t * 2.2 + i * 1.3) * 0.35 })
    })

    // ice cream kiosk
    const ice = cottage(b, occ, { x: cx + 21.4, z: cz, ry: -Math.PI / 2, w: 3.6, d: 2.8, h: 2.4, wall: '#fff6e6', roof: C.coralSoft, rise: 1.0, chimney: false, base: 0 })
    windowAt(b, ice.f, 0, 1.45, 1.4, 2.2, 0.9, { lit: true, cross: false })
    for (let i = 0; i < 6; i += 1) ice.f.put(b, 'paint', box(0.5, 0.08, 1.0), -1.25 + i * 0.5, 2.2, 1.85, i % 2 ? C.paper : C.coralSoft, 0, 0.38)
    const icp = ice.f.at(0, 0, 0)
    b.put('paint', cone(0.85, 2.2, 20), icp[0], 4.4, icp[2], '#e2b98a', 0, Math.PI)
    b.put('paint', sphere(0.86, 20, 14), icp[0], 5.7, icp[2], C.coralSoft)
    b.put('paint', sphere(0.68, 20, 14), icp[0], 6.55, icp[2], '#b5e4d4')
    b.put('paint', sphere(0.2, 12, 10), icp[0], 7.25, icp[2], C.coral)
    for (const x of [-9, 9]) bench(b, cx + x, 0, cz + 10.2, Math.PI)
    for (const [x, z] of [[17.4, 17.4], [-17.4, 17.4], [17.4, -17.4], [-17.4, -17.4]] as const) lamp(b, cx + x, 0, cz + z)
  }

  /* ---------------- 农场岛 ---------------- */
  {
    const cx = farm.x, cz = farm.z
    const mx = cx - 21.5, mz = cz + 8.6
    b.put('plaster', cyl(1.6, 2.4, 7.8, 28), mx, 3.9, mz, '#fff6e6')
    b.put('paint', cyl(1.72, 1.72, 0.36, 28), mx, 7.7, mz, C.coral)
    b.put('roof', cone(2.2, 2.4, 28), mx, 9.1, mz, C.coral)
    const md = new Frame(mx, 0, mz, Math.PI / 2)
    door(b, md, 0, 1.95, C.indigo)
    windowAt(b, md, 0, 4.8, 1.75, 0.7, 0.75, { lit: true })
    const blades = new THREE.Group()
    blades.position.set(mx + 2.25, 7.0, mz)
    scene.add(blades)
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 12), mats.color(C.coral))
    blades.add(hub)
    for (let k = 0; k < 4; k += 1) {
      const arm = new THREE.Group()
      arm.rotation.x = (k * Math.PI) / 2
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.4, 0.18), mats.color(C.woodDark))
      bar.position.y = 2.9
      const sail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.2, 1.15), mats.color(C.paper))
      sail.position.set(0.05, 3.3, 0.62)
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 1.2), mats.color(C.coral))
      tip.position.set(0.06, 5.55, 0.62)
      for (const m of [bar, sail, tip]) { m.castShadow = true; arm.add(m) }
      blades.add(arm)
    }
    occ.circle(mx, mz, 2.8)
    anims.push((_t, dt) => { blades.rotation.x += dt * 0.9 })

    const barn = cottage(b, occ, { x: cx, z: cz - 21, ry: 0, w: 8, d: 5.6, h: 3.4, wall: '#f0866a', roof: C.indigo, rise: 2.4, chimney: false, base: 0 })
    door(b, barn.f, 0, 2.8, C.paper, 2.0)
    for (const lx of [-2.9, 2.9]) windowAt(b, barn.f, lx, 1.75, 2.8, 0.9, 0.9, { lit: true })
    const bs = makeSign('农场', null, 2.0, { bg: '#c0563f' })
    const bsp = barn.f.at(0, 3.25, 2.92)
    bs.position.set(bsp[0], bsp[1], bsp[2])
    scene.add(bs)
    for (const [x, z] of [[cx - 7, cz - 22], [cx + 6.8, cz - 22.6], [cx + 8.2, cz - 20.8]] as const) {
      b.put('paint', cyl(0.75, 0.75, 1.3, 20), x, 0.75, z, '#f3d27a', 0.4, Math.PI / 2)
      occ.circle(x, z, 1)
    }
    const rand = makeRng(99)
    const plots: Array<[number, number, 'sun' | 'cab' | 'pump' | 'wheat']> = [[-5.6, -5.6, 'sun'], [5.6, -5.6, 'cab'], [-5.6, 5.6, 'pump'], [5.6, 5.6, 'wheat']]
    for (const [ox, oz, kind] of plots) {
      const px = cx + ox, pz = cz + oz
      b.put('paint', slab(8.6, 8.6, 0.18, 0.8, 0.05), px, 0, pz, '#d8b98c')
      for (let i = -3; i <= 3; i += 1) b.put('paint', box(0.55, 0.06, 7.8), px + i * 1.12, 0.2, pz, '#c9a77c')
      for (let i = -3; i <= 3; i += 1) for (let j = -3; j <= 3; j += 1) {
        const x = px + i * 1.12, z = pz + j * 1.12
        if (kind === 'sun') {
          b.put('leaf', cyl(0.05, 0.06, 1.7, 6), x, 1.05, z, '#5fc4a6')
          b.put('paint', cyl(0.42, 0.42, 0.1, 14), x + 0.06, 1.95, z, C.sun, Math.PI / 2, Math.PI / 2)
          b.put('paint', cyl(0.2, 0.2, 0.12, 12), x + 0.12, 1.95, z, '#b07a4a', Math.PI / 2, Math.PI / 2)
        } else if (kind === 'cab') {
          b.put('leaf', sphere(0.42, 12, 8), x, 0.42, z, j % 2 ? '#8fd6bb' : '#7cccb0', 0, 0, 1, 0.78, 1)
        } else if (kind === 'pump') {
          if ((i + j) % 2 === 0) {
            b.put('paint', sphere(0.5, 14, 10), x, 0.5, z, '#f6a04d', 0, 0, 1, 0.72, 1)
            b.put('leaf', cyl(0.05, 0.06, 0.24, 6), x, 0.92, z, '#5fc4a6')
          } else b.put('leaf', sphere(0.3, 10, 6), x, 0.28, z, '#7cccb0', 0, 0, 1, 0.4, 1)
        } else {
          for (let k = 0; k < 3; k += 1) b.put('paint', cone(0.12, 1.2 + rand() * 0.3, 6), x + (k - 1) * 0.25, 0.8, z + (rand() - 0.5) * 0.3, k % 2 ? '#e9c766' : '#f3d27a')
        }
      }
      occ.rect(px - 4.4, pz - 4.4, px + 4.4, pz + 4.4)
    }
    for (const [x, z] of [[17.4, 17.4], [-17.4, 17.4], [17.4, -17.4], [-17.4, -17.4]] as const) lamp(b, cx + x, 0, cz + z)
  }

  /* ---------------- 港口岛 ---------------- */
  {
    const cx = harbor.x, cz = harbor.z
    // the Signal Gate: open to every bot that carries a signal dot
    for (const oz of [-4.2, 4.2]) {
      b.put('paint', slab(1.6, 1.6, 7.4, 0.5, 0.15), cx, 0, cz + oz, C.indigo)
      b.put('paint', slab(2.1, 2.1, 0.5, 0.5, 0.08), cx, 0, cz + oz, C.paper)
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.62, 16, 64, Math.PI), mats.color(C.indigo))
    arch.rotation.y = Math.PI / 2
    arch.position.set(cx, 7.4, cz)
    arch.castShadow = true
    scene.add(arch)
    const inner = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.22, 10, 64, Math.PI), mats.color(C.mint))
    inner.rotation.y = Math.PI / 2
    inner.position.set(cx - 0.68, 7.4, cz)
    scene.add(inner)
    const gateDot = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16), mats.signal)
    gateDot.position.set(cx, 12.9, cz)
    gateDot.castShadow = true
    scene.add(gateDot)
    const portalMat = new THREE.MeshBasicMaterial({ color: '#9be8cf', transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
    const shape = new THREE.Shape()
    shape.moveTo(-3.4, 0); shape.lineTo(3.4, 0); shape.lineTo(3.4, 7.4); shape.absarc(0, 7.4, 3.4, 0, Math.PI, false); shape.lineTo(-3.4, 0)
    const portal = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), portalMat)
    portal.rotation.y = Math.PI / 2
    portal.position.set(cx, 0.05, cz)
    scene.add(portal)
    b.put('tiles', cyl(5, 5.2, 0.14, 40), cx - 1, 0.07, cz, '#f8eedb')
    occ.rect(cx - 1, cz - 5.2, cx + 1, cz + 5.2)
    const gs = makeSign('信号门', '朋友们的 bot 从这里来', 3.4, { bg: '#3e9f7e', dot: C.coral })
    gs.position.set(cx - 6.2, 2.4, cz - 6.4)
    gs.rotation.y = -Math.PI / 2
    scene.add(gs)
    b.put('paint', cyl(0.08, 0.08, 1.8, 8), cx - 6.25, 0.9, cz - 6.4, C.indigo)
    anims.push((t) => { portalMat.opacity = 0.3 + Math.sin(t * 2) * 0.12 })

    // lighthouse with a turning beam at night
    const lx = cx + 21.2, lz = cz - 9.6
    for (let k = 0; k < 6; k += 1) b.put('plaster', cyl(2.2 - (k + 1) * 0.1, 2.2 - k * 0.1, 2.1, 32), lx, 1.05 + k * 2.1, lz, k % 2 ? C.coral : C.paper)
    b.put('paint', cyl(2.5, 2.5, 0.3, 32), lx, 12.75, lz, C.indigo)
    for (let k = 0; k < 12; k += 1) {
      const a = (k / 12) * Math.PI * 2
      b.put('paint', cyl(0.05, 0.05, 0.8, 6), lx + Math.cos(a) * 2.35, 13.3, lz + Math.sin(a) * 2.35, C.paper)
    }
    b.put('glass', cyl(1.3, 1.3, 1.8, 24), lx, 13.8, lz, '#bcdcf3')
    b.put('roof', cone(1.75, 1.6, 28), lx, 15.5, lz, C.indigo)
    b.put('paint', sphere(0.3, 12, 10), lx, 16.45, lz, C.coral)
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 14), mats.signal)
    light.position.set(lx, 13.8, lz)
    scene.add(light)
    const beam = new THREE.Group()
    beam.position.set(lx, 13.8, lz)
    scene.add(beam)
    const beamMats: THREE.MeshBasicMaterial[] = []
    for (const a of [0, Math.PI]) {
      const m = new THREE.MeshBasicMaterial({ color: '#fff1c4', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      const g = new THREE.ConeGeometry(3.6, 34, 24, 1, true)
      g.rotateZ(Math.PI / 2)
      g.translate(17, 0, 0)
      const c = new THREE.Mesh(g, m)
      c.rotation.y = a
      beam.add(c)
      beamMats.push(m)
    }
    occ.circle(lx, lz, 2.8)
    anims.push((_t, dt, night) => {
      beam.rotation.y += dt * 0.8
      for (const m of beamMats) m.opacity = night * 0.32
    })

    // docks with crates and two moored boats
    b.put('wood', slab(18, 3.4, 0.3, 0.3, 0.05), cx + 35, -0.12, cz + 6, C.wood)
    for (let x = cx + 27; x <= cx + 43; x += 3) for (const o of [-1.5, 1.5]) b.put('wood', cyl(0.2, 0.22, 1.6, 10), x, -0.6, cz + 6 + o, C.woodDark)
    for (const [x, z, s] of [[cx + 25.6, cz + 9.6, 0.9], [cx + 26.8, cz + 10.8, 0.7], [cx + 24.4, cz + 2.4, 0.8]] as const) {
      b.put('wood', rbox(s, s, s, 0.06), x, s / 2, z, C.wood, 0.4)
      occ.circle(x, z, s)
    }
    b.put('paint', cyl(0.42, 0.42, 1.0, 16), cx + 23.2, 0.5, cz + 10.4, C.skyDeep)
    occ.circle(cx + 23.2, cz + 10.4, 0.6)
    const boats = [makeBoat(mats, '#ffd27a'), makeBoat(mats, '#6f9fd8')]
    boats[0].position.set(cx + 37, -0.3, cz + 10.2)
    boats[1].position.set(cx + 40, -0.3, cz + 1.8)
    boats.forEach((bt) => { bt.rotation.y = Math.PI / 2; scene.add(bt) })
    anims.push((t) => boats.forEach((bt, i) => { bt.position.y = -0.3 + Math.sin(t * 1.4 + i * 2) * 0.1; bt.rotation.z = Math.sin(t + i) * 0.04 }))

    // empty plots, waiting for newcomers
    for (const [ox, oz] of [[-8, -21], [8, -21], [-8, 21], [8, 21]] as const) {
      const px = cx + ox, pz = cz + oz
      b.put('paint', slab(7, 4.6, 0.08, 0.6, 0.02), px, 0, pz, '#efe2c4')
      for (const [a, c] of [[-3.4, -2.2], [3.4, -2.2], [3.4, 2.2], [-3.4, 2.2]] as const) b.put('wood', rbox(0.18, 0.8, 0.18, 0.04), px + a, 0.4, pz + c, C.wood)
      b.put('paint', box(6.8, 0.05, 0.05), px, 0.62, pz - 2.2, C.wood)
      b.put('paint', box(6.8, 0.05, 0.05), px, 0.62, pz + 2.2, C.wood)
      b.put('paint', box(0.05, 0.05, 4.4), px - 3.4, 0.62, pz, C.wood)
      b.put('paint', box(0.05, 0.05, 4.4), px + 3.4, 0.62, pz, C.wood)
      const s = makeSign('待入住', '给朋友的 bot 留着', 1.9, { bg: '#3e9f7e' })
      s.position.set(px, 1.5, pz + (oz < 0 ? 2.6 : -2.6))
      s.rotation.y = oz < 0 ? 0 : Math.PI
      scene.add(s)
      b.put('paint', cyl(0.06, 0.06, 1.2, 8), px, 0.6, pz + (oz < 0 ? 2.55 : -2.55), C.indigo)
      occ.rect(px - 3.6, pz - 2.5, px + 3.6, pz + 2.5)
    }
    for (const [x, z] of [[17.4, 17.4], [-17.4, 17.4], [17.4, -17.4], [-17.4, -17.4]] as const) lamp(b, cx + x, 0, cz + z)
  }

  return { tick: (t, dt, night) => anims.forEach((a) => a(t, dt, night)) }
}

export function makeBoat(mats: Mats, color: string): THREE.Group {
  const g = new THREE.Group()
  const hull = new THREE.Mesh(slab(2.3, 5.6, 1.2, 1.05, 0.28), mats.color(color))
  hull.position.y = -0.6
  const deck = new THREE.Mesh(slab(1.9, 4.8, 0.12, 0.85, 0.04), mats.color(C.wood))
  deck.position.y = 0.55
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.8, 8), mats.color(C.indigo))
  mast.position.set(0, 3.0, 0.3)
  const s = new THREE.Shape()
  s.moveTo(0, 0); s.lineTo(0, 4.3); s.lineTo(2.7, 0.2); s.lineTo(0, 0)
  const sail = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }), mats.color(C.paper))
  sail.rotation.y = -Math.PI / 2
  sail.position.set(0.03, 0.9, 0.42)
  const flag = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mats.signal)
  flag.position.set(0, 5.5, 0.3)
  for (const m of [hull, deck, mast, sail, flag]) { m.castShadow = true; g.add(m) }
  return g
}
