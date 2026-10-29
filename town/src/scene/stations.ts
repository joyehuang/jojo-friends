// Workstations. Every job has a desk in its district: a wooden deck, a low
// desk with the job's own prop on it (a laptop, an easel, a telescope …), a
// name plate facing the plaza, a status lamp, and the output shelf where
// finished work waits to be harvested. A progress ring over the shelf shows
// the next piece of work growing.
import * as THREE from 'three'
import { DISTRICTS as DISTRICT_INFO, ROLE_MAP } from '../work/roles'
import type { OutputKind, Role, StationKind } from '../work/types'
import { Batcher, C, Frame, box, cone, cyl, extrude, rbox, slab, sphere, torus } from './kit'
import { STATIONS, type StationSlot } from './layout'
import { kindTexture } from './icons'
import type { Occupancy } from './world/ground'

/** heights above the yard, metres */
export const DECK_H = 0.08
const DESK_TOP = DECK_H + 0.55
const DECK = { w: 3.7, d: 3.5, z: -0.85 }
/** the output shelf, local to the desk frame */
const SHELF_X = 1.42
const TIERS = [0.2, 0.66, 1.12]

function deckBase(slot: StationSlot) {
  return slot.district === 'center' ? 0.17 : 0.19
}

/** The axis-aligned rectangle a station's deck covers, world (for walking heights). */
export function deckRect(slot: StationSlot): { x0: number; z0: number; x1: number; z1: number; y: number } {
  const f = new Frame(slot.x, 0, slot.z, slot.ry)
  const a = f.at(-DECK.w / 2, 0, DECK.z - DECK.d / 2)
  const b = f.at(DECK.w / 2, 0, DECK.z + DECK.d / 2)
  return { x0: Math.min(a[0], b[0]), z0: Math.min(a[2], b[2]), x1: Math.max(a[0], b[0]), z1: Math.max(a[2], b[2]), y: deckBase(slot) + DECK_H }
}

/* ------------------------------------------------------------------ */
/* desk props                                                           */
/* ------------------------------------------------------------------ */

type PropFn = (b: Batcher, f: Frame, y: number, tint: string) => void

const screenFace = (b: Batcher, f: Frame, lx: number, ly: number, lz: number, w: number, h: number, tilt: number, color = '#bcdcf3') => {
  // frame faces the employee (local −z)
  f.put(b, 'paint', rbox(w + 0.05, h + 0.05, 0.035, 0.015), lx, ly, lz, C.indigo, Math.PI, tilt)
  f.put(b, 'screen', box(w, h, 0.01), lx, ly, lz - 0.02 * Math.cos(tilt), color, Math.PI, tilt)
}

const PROPS: Record<StationKind, PropFn> = {
  tower: (b, f, y) => {
    f.put(b, 'paint', rbox(1.3, 0.2, 0.5, 0.05), 0, y + 0.1, 0.05, C.paper)
    for (const [x, col] of [[-0.42, '#bcdcf3'], [0, C.mint], [0.42, '#ffd9cf']] as const) screenFace(b, f, x, y + 0.42, 0.12, 0.36, 0.26, -0.25, col)
    f.put(b, 'paint', cyl(0.035, 0.05, 0.62, 10), 0.78, y + 0.31, 0.15, C.indigo)
    f.put(b, 'paint', cyl(0.09, 0.07, 0.06, 14), 0.78, y + 0.64, 0.15, C.mint)
    f.put(b, 'lamp', sphere(0.075, 14, 10), 0.78, y + 0.72, 0.15, '#ffffff')
    f.put(b, 'paint', rbox(0.3, 0.02, 0.22, 0.01), -0.7, y + 0.01, -0.12, C.paper, 0.2)
  },
  sun: (b, f, y) => {
    f.put(b, 'paint', cyl(0.05, 0.08, 0.32, 10), 0.1, y + 0.16, 0.05, C.indigo)
    f.put(b, 'paint', cyl(0.24, 0.24, 0.05, 28), 0.1, y + 0.5, 0.05, C.sun, 0, Math.PI / 2)
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2
      f.put(b, 'paint', rbox(0.04, 0.1, 0.04, 0.015), 0.1 + Math.cos(a) * 0.33, y + 0.5 + Math.sin(a) * 0.33, 0.05, '#f0a43a', 0, 0, 1, 1, 1, a - Math.PI / 2)
    }
    for (let i = 0; i < 4; i += 1) f.put(b, 'paint', box(0.38, 0.018, 0.27), -0.52, y + 0.012 + i * 0.02, -0.02, i % 2 ? C.paper : '#f2ead8', i * 0.08)
    f.put(b, 'paint', box(0.3, 0.004, 0.04), -0.52, y + 0.093, -0.06, C.coral, 0.24)
  },
  laptop: (b, f, y) => {
    f.put(b, 'paint', rbox(0.52, 0.03, 0.36, 0.015), 0, y + 0.015, 0, '#d9dcee')
    f.put(b, 'paint', box(0.42, 0.004, 0.18), 0, y + 0.032, -0.04, '#b8bcd8')
    f.put(b, 'paint', rbox(0.52, 0.34, 0.025, 0.015), 0, y + 0.19, 0.18, '#d9dcee', 0, 0.22)
    f.put(b, 'screen', box(0.46, 0.28, 0.006), 0, y + 0.19, 0.163, '#cfe6ff', Math.PI, -0.22)
    f.put(b, 'paint', cyl(0.035, 0.035, 0.008, 16), 0, y + 0.21, 0.198, C.coral, 0, Math.PI / 2 - 0.22)
    f.put(b, 'paint', cyl(0.06, 0.055, 0.12, 14), 0.5, y + 0.06, -0.05, C.coral)
    f.put(b, 'paint', torus(0.035, 0.012, Math.PI, 8, 12), 0.56, y + 0.07, -0.05, C.coral, 0, 0, 1, 1, 1, -Math.PI / 2)
  },
  binoculars: (b, f, y) => {
    for (const a of [0, 2.1, 4.2]) f.put(b, 'paint', cyl(0.012, 0.012, 0.3, 6), Math.sin(a) * 0.09, y + 0.13, Math.cos(a) * 0.09, C.indigo, 0, 0.3 * Math.cos(a), 1, 1, 1, -0.3 * Math.sin(a))
    for (const x of [-0.075, 0.075]) {
      f.put(b, 'paint', cyl(0.06, 0.07, 0.26, 16), x, y + 0.32, 0.02, C.indigo, 0, Math.PI / 2 - 0.15)
      f.put(b, 'glass', cyl(0.055, 0.055, 0.01, 16), x, y + 0.34, 0.15, '#bcdcf3', 0, Math.PI / 2 - 0.15)
      f.put(b, 'paint', cyl(0.045, 0.045, 0.06, 12), x, y + 0.3, -0.13, '#444a8a', 0, Math.PI / 2 - 0.15)
    }
    f.put(b, 'paint', rbox(0.1, 0.04, 0.08, 0.015), 0, y + 0.33, 0.02, C.coral)
    f.put(b, 'paint', rbox(0.32, 0.02, 0.24, 0.01), -0.55, y + 0.01, 0, C.paper, 0.3)
  },
  megaphone: (b, f, y) => {
    f.put(b, 'paint', cyl(0.03, 0.05, 0.3, 10), 0, y + 0.15, 0, C.indigo)
    f.put(b, 'paint', cone(0.17, 0.42, 20), 0, y + 0.42, 0.14, C.coral, 0, -Math.PI / 2 + 0.45)
    f.put(b, 'paint', cyl(0.17, 0.17, 0.02, 20), 0, y + 0.507, 0.33, C.paper, 0, Math.PI / 2 - 0.45)
    f.put(b, 'paint', rbox(0.06, 0.16, 0.06, 0.02), 0, y + 0.3, -0.06, C.indigo, 0, 0.4)
    for (let i = 0; i < 3; i += 1) f.put(b, 'paint', torus(0.12 + i * 0.07, 0.012, Math.PI * 0.6, 6, 16), 0, y + 0.62 + i * 0.07, 0.42 + i * 0.06, C.coralSoft, 0, -0.45, 1, 1, 1, Math.PI * 0.2)
  },
  stage: (b, f, y) => {
    // a slide on a little stand, turned to the plaza: this is what you are presenting
    for (const x of [-0.26, 0.26]) f.put(b, 'paint', cyl(0.015, 0.015, 0.5, 6), x, y + 0.25, 0.08, C.indigo)
    f.put(b, 'paint', rbox(0.72, 0.46, 0.03, 0.02), 0, y + 0.6, 0.08, C.paper)
    f.put(b, 'paint', box(0.22, 0.04, 0.005), -0.18, y + 0.75, 0.098, C.coral)
    for (const [x, h, col] of [[-0.16, 0.12, '#6f9fd8'], [0, 0.2, C.coral], [0.16, 0.27, C.indigo]] as const) f.put(b, 'paint', box(0.1, h, 0.006), x, y + 0.42 + h / 2, 0.098, col)
    f.put(b, 'paint', rbox(0.28, 0.04, 0.2, 0.01), -0.55, y + 0.02, -0.05, '#3c4180')
    f.put(b, 'lamp', sphere(0.025, 8, 6), -0.47, y + 0.05, 0.02, '#ffffff')
  },
  easel: (b, f, y) => {
    f.put(b, 'wood', box(0.035, 0.8, 0.035), -0.2, y + 0.38, 0.1, C.wood, 0.4, 0.12, 1, 1, 1, 0.18)
    f.put(b, 'wood', box(0.035, 0.8, 0.035), 0.2, y + 0.38, 0.1, C.wood, 0.4, 0.12, 1, 1, 1, -0.18)
    f.put(b, 'wood', box(0.035, 0.8, 0.035), 0.08, y + 0.36, 0.28, C.wood, 0.4, -0.35)
    f.put(b, 'wood', box(0.5, 0.04, 0.06), 0, y + 0.36, 0.06, C.woodDark, 0.4)
    f.put(b, 'paint', rbox(0.5, 0.42, 0.025, 0.01), 0, y + 0.6, 0.05, C.paper, 0.4, -0.12)
    // the painting faces the plaza
    for (const [x, yy, r, col] of [[-0.1, 0.66, 0.09, C.coral], [0.08, 0.56, 0.11, '#6f9fd8'], [0.12, 0.72, 0.06, C.sun], [-0.12, 0.5, 0.05, C.green]] as const) {
      const ox = x * Math.cos(0.4), oz = 0.07 - x * Math.sin(0.4)
      f.put(b, 'paint', cyl(r, r, 0.01, 18), ox, y + yy, oz, col, 0.4, Math.PI / 2 - 0.12)
    }
    f.put(b, 'paint', cyl(0.14, 0.14, 0.02, 20), -0.52, y + 0.01, -0.05, C.wood, 0, 0, 1, 1, 0.8)
    for (const [x, z, col] of [[-0.58, -0.08, C.coral], [-0.5, 0.02, '#6f9fd8'], [-0.46, -0.1, C.sun]] as const) f.put(b, 'paint', sphere(0.025, 8, 6), x, y + 0.03, z, col)
  },
  antenna: (b, f, y) => {
    f.put(b, 'paint', rbox(0.34, 0.16, 0.24, 0.03), 0.35, y + 0.08, 0, '#d9dcee')
    f.put(b, 'paint', cyl(0.035, 0.035, 0.01, 12), 0.27, y + 0.1, 0.122, C.coral, 0, Math.PI / 2)
    f.put(b, 'paint', box(0.12, 0.05, 0.006), 0.42, y + 0.1, 0.122, '#9fd3f0')
    f.put(b, 'metal', cyl(0.018, 0.026, 0.95, 8), -0.2, y + 0.475, 0, '#c9d6e8')
    for (let i = 0; i < 3; i += 1) f.put(b, 'paint', torus(0.12 - i * 0.03, 0.012, Math.PI * 2, 6, 20), -0.2, y + 0.45 + i * 0.18, 0, i % 2 ? C.mint : C.indigo, 0, Math.PI / 2)
    f.put(b, 'lamp', sphere(0.05, 12, 8), -0.2, y + 0.98, 0, '#ffffff')
  },
  telescope: (b, f, y) => {
    for (const a of [0.4, 2.5, 4.6]) f.put(b, 'paint', cyl(0.013, 0.013, 0.42, 6), Math.sin(a) * 0.12, y + 0.19, Math.cos(a) * 0.12, C.indigo, 0, 0.32 * Math.cos(a), 1, 1, 1, -0.32 * Math.sin(a))
    f.put(b, 'paint', cyl(0.07, 0.085, 0.62, 18), 0, y + 0.52, 0.08, C.paper, 0, -0.75)
    f.put(b, 'paint', cyl(0.09, 0.09, 0.06, 18), 0, y + 0.71, 0.3, C.indigo, 0, -0.75)
    f.put(b, 'glass', cyl(0.075, 0.075, 0.01, 18), 0, y + 0.735, 0.325, '#bcdcf3', 0, -0.75)
    f.put(b, 'paint', cyl(0.03, 0.03, 0.12, 10), 0, y + 0.3, -0.18, C.indigo, 0, -0.75)
    f.put(b, 'paint', rbox(0.3, 0.02, 0.22, 0.01), -0.55, y + 0.01, 0, '#2d3272', -0.2)
    for (let i = 0; i < 5; i += 1) f.put(b, 'paint', sphere(0.012, 6, 4), -0.62 + (i % 3) * 0.07, y + 0.025, -0.06 + Math.floor(i / 2) * 0.06, C.sun)
  },
  books: (b, f, y) => {
    const cols = ['#6f9fd8', '#9a94cc', C.coral, C.green]
    for (let i = 0; i < 4; i += 1) f.put(b, 'paint', rbox(0.36 - i * 0.02, 0.07, 0.26, 0.012), 0.45, y + 0.035 + i * 0.07, 0, cols[i], 0.15 * (i % 2 ? 1 : -1))
    f.put(b, 'paint', rbox(0.2, 0.012, 0.28, 0.005), -0.11, y + 0.04, -0.02, C.paper, 0, 0, 1, 1, 1, 0.18)
    f.put(b, 'paint', rbox(0.2, 0.012, 0.28, 0.005), 0.09, y + 0.04, -0.02, C.paper, 0, 0, 1, 1, 1, -0.18)
    f.put(b, 'paint', box(0.03, 0.03, 0.3), -0.01, y + 0.02, -0.02, C.indigo)
    f.put(b, 'paint', cyl(0.07, 0.09, 0.03, 14), -0.55, y + 0.015, 0.05, C.indigo)
    f.put(b, 'paint', cyl(0.012, 0.012, 0.38, 6), -0.55, y + 0.2, 0.05, C.indigo, 0, 0.15)
    f.put(b, 'paint', cone(0.11, 0.13, 16), -0.55, y + 0.4, 0.0, C.sun, 0, -0.45)
    f.put(b, 'lamp', sphere(0.035, 8, 6), -0.55, y + 0.35, -0.02, '#ffffff')
  },
  magnifier: (b, f, y) => {
    f.put(b, 'paint', rbox(0.34, 0.012, 0.42, 0.006), 0, y + 0.006, 0, C.paper, 0.15)
    for (let i = 0; i < 4; i += 1) f.put(b, 'paint', box(0.22 - (i === 3 ? 0.08 : 0), 0.004, 0.025), -0.02, y + 0.014, -0.14 + i * 0.07, '#b8bcd8', 0.15)
    f.put(b, 'paint', torus(0.17, 0.028, Math.PI * 2, 10, 32), 0.08, y + 0.42, 0.02, C.indigo, 0, -0.5)
    f.put(b, 'glass', cyl(0.16, 0.16, 0.01, 28), 0.08, y + 0.42, 0.02, '#d9efff', 0, Math.PI / 2 - 0.5)
    f.put(b, 'paint', rbox(0.06, 0.26, 0.06, 0.02), 0.08, y + 0.15, 0.12, C.coral, 0, 0.45)
    f.put(b, 'paint', cyl(0.07, 0.08, 0.03, 14), 0.08, y + 0.015, 0.2, C.indigo)
  },
  rocket: (b, f, y) => {
    f.put(b, 'paint', cyl(0.22, 0.26, 0.05, 24), 0, y + 0.025, 0, '#d9dcee')
    f.put(b, 'paint', cyl(0.1, 0.11, 0.42, 20), 0, y + 0.3, 0, C.paper)
    f.put(b, 'paint', cone(0.1, 0.2, 20), 0, y + 0.61, 0, C.coral)
    f.put(b, 'glass', cyl(0.045, 0.045, 0.02, 16), 0, y + 0.38, 0.1, '#9fd3f0', 0, Math.PI / 2)
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * Math.PI * 2
      f.put(b, 'paint', box(0.02, 0.16, 0.1), Math.sin(a) * 0.12, y + 0.14, Math.cos(a) * 0.12, C.coral, a)
    }
    f.put(b, 'paint', cyl(0.07, 0.03, 0.08, 14), 0, y + 0.06, 0, '#ffb27a')
    f.put(b, 'paint', rbox(0.3, 0.02, 0.2, 0.01), -0.55, y + 0.01, 0, C.paper, -0.2)
    f.put(b, 'paint', box(0.2, 0.004, 0.02), -0.55, y + 0.022, -0.03, C.green, 0.4)
  },
  workbench: (b, f, y) => {
    for (const [x, ry] of [[-0.3, 0.25], [0.3, -0.25]] as const) {
      f.put(b, 'paint', cyl(0.025, 0.04, 0.16, 8), x, y + 0.08, 0.08, C.indigo)
      f.put(b, 'paint', rbox(0.48, 0.32, 0.04, 0.02), x, y + 0.33, 0.1, C.indigo, ry)
      const lz = 0.1 - 0.025
      f.put(b, 'screen', box(0.43, 0.27, 0.005), x - Math.sin(ry) * 0.025, y + 0.33, lz, '#cff0e6', ry + Math.PI)
    }
    f.put(b, 'paint', rbox(0.48, 0.025, 0.15, 0.01), 0, y + 0.0125, -0.17, '#d9dcee')
    for (let i = 0; i < 3; i += 1) f.put(b, 'paint', box(0.4, 0.006, 0.025), 0, y + 0.028, -0.21 + i * 0.04, '#b8bcd8')
    f.put(b, 'paint', cyl(0.05, 0.045, 0.1, 12), 0.62, y + 0.05, -0.1, C.mint)
  },
  monitor: (b, f, y) => {
    f.put(b, 'paint', cyl(0.03, 0.05, 0.2, 8), 0, y + 0.1, 0.1, C.indigo)
    f.put(b, 'paint', rbox(0.92, 0.42, 0.04, 0.02), 0, y + 0.4, 0.12, C.indigo)
    f.put(b, 'screen', box(0.86, 0.36, 0.005), 0, y + 0.4, 0.095, '#e6f0ff', Math.PI)
    f.put(b, 'paint', rbox(0.5, 0.025, 0.16, 0.01), 0, y + 0.0125, -0.18, '#d9dcee')
    for (let i = 0; i < 3; i += 1) f.put(b, 'paint', box(0.32, 0.03, 0.22), 0.66, y + 0.015 + i * 0.03, 0, i % 2 ? C.paper : '#f0e8d6', 0.1 * i)
    f.put(b, 'paint', box(0.02, 0.006, 0.18), 0.6, y + 0.105, 0, C.green)
  },
  checklist: (b, f, y) => {
    f.put(b, 'paint', rbox(0.46, 0.6, 0.03, 0.03), 0, y + 0.3, 0.12, C.wood, 0, -0.32)
    f.put(b, 'paint', rbox(0.4, 0.52, 0.01, 0.01), 0, y + 0.29, 0.135, C.paper, 0, -0.32)
    f.put(b, 'metal', rbox(0.16, 0.06, 0.04, 0.015), 0, y + 0.58, 0.215, '#c9d6e8', 0, -0.32)
    for (let i = 0; i < 4; i += 1) {
      // rows on the tilted board: up the board, then a hair out along its normal
      const h = 0.19 - i * 0.115
      const yy = y + 0.29 + h * Math.cos(0.32) + 0.012 * Math.sin(0.32)
      const zz = 0.135 - h * Math.sin(0.32) + 0.012 * Math.cos(0.32)
      f.put(b, 'paint', rbox(0.06, 0.06, 0.01, 0.01), -0.12, yy, zz, i < 3 ? C.green : '#d9dcee', 0, -0.32)
      f.put(b, 'paint', box(0.2, 0.02, 0.005), 0.06, yy, zz, '#b8bcd8', 0, -0.32)
    }
    f.put(b, 'paint', cyl(0.012, 0.012, 0.28, 8), 0.4, y + 0.015, -0.05, C.coral, 0.5, 0, 1, 1, 1, Math.PI / 2)
  },
  shield: (b, f, y) => {
    const s = new THREE.Shape()
    s.moveTo(0, 0.42)
    s.quadraticCurveTo(0.16, 0.36, 0.26, 0.36)
    s.lineTo(0.26, 0.12)
    s.quadraticCurveTo(0.24, -0.16, 0, -0.26)
    s.quadraticCurveTo(-0.24, -0.16, -0.26, 0.12)
    s.lineTo(-0.26, 0.36)
    s.quadraticCurveTo(-0.16, 0.36, 0, 0.42)
    f.put(b, 'paint', extrude(s, 0.06, 0.015, 'shield'), 0, y + 0.36, 0.06, C.indigo)
    const inner = new THREE.Shape()
    inner.moveTo(0, 0.3)
    inner.quadraticCurveTo(0.1, 0.27, 0.17, 0.27)
    inner.lineTo(0.17, 0.1)
    inner.quadraticCurveTo(0.15, -0.09, 0, -0.16)
    inner.quadraticCurveTo(-0.15, -0.09, -0.17, 0.1)
    inner.lineTo(-0.17, 0.27)
    inner.quadraticCurveTo(-0.1, 0.27, 0, 0.3)
    f.put(b, 'paint', extrude(inner, 0.02, 0, 'shield-in'), 0, y + 0.36, 0.14, C.mint)
    f.put(b, 'paint', rbox(0.1, 0.09, 0.03, 0.015), 0, y + 0.34, 0.165, C.coral)
    f.put(b, 'paint', torus(0.035, 0.012, Math.PI, 6, 12), 0, y + 0.385, 0.165, C.coral)
    f.put(b, 'paint', rbox(0.22, 0.05, 0.16, 0.02), 0, y + 0.025, 0.08, '#3c4180')
  },
  bug: (b, f, y) => {
    const g = new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    f.put(b, 'paint', g, 0, y, 0.02, C.coral, 0, 0, 1, 0.8, 1.25)
    f.put(b, 'paint', box(0.008, 0.16, 0.48), 0, y + 0.08, 0.02, C.indigo)
    for (const [x, z, r] of [[-0.09, 0.08, 0.04], [0.1, -0.06, 0.045], [-0.08, -0.12, 0.035], [0.09, 0.12, 0.03]] as const) f.put(b, 'paint', sphere(r, 10, 8), x, y + 0.13, z + 0.02, C.indigo, 0, 0, 1, 0.5, 1)
    f.put(b, 'paint', sphere(0.09, 14, 10), 0, y + 0.06, 0.28, C.indigo)
    for (const x of [-0.035, 0.035]) f.put(b, 'paint', sphere(0.022, 8, 6), x, y + 0.1, 0.355, C.paper)
    for (const x of [-0.05, 0.05]) f.put(b, 'paint', cyl(0.007, 0.007, 0.14, 4), x, y + 0.16, 0.32, C.indigo, 0, 0.6, 1, 1, 1, x * 6)
    f.put(b, 'paint', torus(0.12, 0.012, Math.PI * 2, 6, 20), -0.55, y + 0.36, 0.0, C.paper, 0, -0.3)
    f.put(b, 'wood', cyl(0.012, 0.012, 0.4, 6), -0.55, y + 0.13, 0.08, C.wood, 0, -0.3)
  },
  gears: (b, f, y) => {
    const gear = (x: number, yy: number, r: number, teeth: number, col: string, phase: number) => {
      f.put(b, 'paint', cyl(r, r, 0.06, 28), x, yy, 0.05, col, 0, Math.PI / 2)
      for (let i = 0; i < teeth; i += 1) {
        const a = phase + (i / teeth) * Math.PI * 2
        f.put(b, 'paint', box(r * 0.32, r * 0.3, 0.06), x + Math.cos(a) * r * 1.08, yy + Math.sin(a) * r * 1.08, 0.05, col, 0, 0, 1, 1, 1, a)
      }
      f.put(b, 'paint', cyl(r * 0.32, r * 0.32, 0.075, 16), x, yy, 0.05, C.paper, 0, Math.PI / 2)
    }
    f.put(b, 'paint', rbox(0.7, 0.06, 0.2, 0.02), 0, y + 0.03, 0.05, '#3c4180')
    gear(-0.13, y + 0.3, 0.17, 10, C.coral, 0)
    gear(0.17, y + 0.48, 0.12, 8, C.green, 0.3)
    f.put(b, 'paint', cyl(0.02, 0.02, 0.24, 6), -0.13, y + 0.15, 0.05, C.indigo)
    f.put(b, 'paint', cyl(0.02, 0.02, 0.42, 6), 0.17, y + 0.24, 0.05, C.indigo)
  },
  radar: (b, f, y) => {
    f.put(b, 'paint', cyl(0.12, 0.15, 0.08, 18), 0.3, y + 0.04, 0, '#d9dcee')
    f.put(b, 'paint', cyl(0.025, 0.025, 0.22, 8), 0.3, y + 0.19, 0, C.indigo)
    const dish = new THREE.SphereGeometry(0.22, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3)
    f.put(b, 'paint', dish, 0.3, y + 0.42, 0.06, C.paper, 0, -1.0)
    f.put(b, 'paint', cyl(0.008, 0.008, 0.16, 6), 0.3, y + 0.44, 0.02, C.indigo, 0, -1.0)
    f.put(b, 'lamp', sphere(0.03, 8, 6), 0.3, y + 0.5, 0.07, '#ffffff')
    f.put(b, 'paint', rbox(0.4, 0.3, 0.05, 0.02), -0.32, y + 0.18, 0.05, C.indigo)
    f.put(b, 'screen', cyl(0.11, 0.11, 0.005, 24), -0.32, y + 0.19, 0.022, '#9fe0c8', 0, -Math.PI / 2)
  },
  mailbag: (b, f, y) => {
    f.put(b, 'paint', rbox(0.4, 0.3, 0.26, 0.1), 0.35, y + 0.15, 0, '#c99a6b')
    f.put(b, 'paint', rbox(0.42, 0.06, 0.28, 0.03), 0.35, y + 0.28, 0, '#b0835a')
    for (const [x, ry] of [[0.27, 0.2], [0.38, -0.1], [0.47, 0.3]] as const) f.put(b, 'paint', box(0.16, 0.11, 0.008), x, y + 0.35, 0, C.paper, ry, 0.1)
    f.put(b, 'paint', box(0.04, 0.04, 0.01), 0.38, y + 0.37, 0.006, C.coral, -0.1, 0.1)
    f.put(b, 'paint', rbox(0.4, 0.04, 0.3, 0.015), -0.3, y + 0.02, 0, C.indigo)
    for (let i = 0; i < 3; i += 1) f.put(b, 'paint', box(0.32, 0.012, 0.22), -0.3, y + 0.05 + i * 0.014, 0, i === 2 ? '#ffe3d8' : C.paper, i * 0.06)
  },
  cabinet: (b, f, y) => {
    f.put(b, 'paint', rbox(0.6, 0.06, 0.28, 0.02), 0, y + 0.03, 0, '#3c4180')
    const cols = [C.coral, '#6f9fd8', C.green, C.sun, '#9a94cc']
    for (let i = 0; i < 5; i += 1) f.put(b, 'paint', rbox(0.06, 0.34 - (i % 2) * 0.04, 0.24, 0.01), -0.2 + i * 0.1, y + 0.06 + (0.34 - (i % 2) * 0.04) / 2, 0, cols[i], 0, 0, 1, 1, 1, i === 4 ? -0.18 : 0)
    for (let i = 0; i < 5; i += 1) f.put(b, 'paint', box(0.04, 0.03, 0.004), -0.2 + i * 0.1, y + 0.3, 0.122, C.paper)
    f.put(b, 'paint', rbox(0.24, 0.02, 0.3, 0.01), 0.5, y + 0.01, 0, '#f2ead8', 0.25)
  },
  chart: (b, f, y) => {
    f.put(b, 'paint', rbox(0.7, 0.04, 0.24, 0.015), 0, y + 0.02, 0.05, C.paper)
    const hs = [0.16, 0.28, 0.22, 0.4]
    hs.forEach((h, i) => f.put(b, 'paint', rbox(0.12, h, 0.12, 0.02), -0.24 + i * 0.16, y + 0.04 + h / 2, 0.05, i === 3 ? C.coral : i % 2 ? '#6f9fd8' : '#9a94cc'))
    f.put(b, 'paint', cyl(0.13, 0.13, 0.04, 24, ), 0.62, y + 0.02, -0.02, C.sun, 0, 0, 1, 1, 1, 0)
    f.put(b, 'paint', new THREE.CylinderGeometry(0.135, 0.135, 0.06, 24, 1, false, 0, Math.PI * 0.6), 0.62, y + 0.03, -0.02, C.indigo)
  },
}

/* ------------------------------------------------------------------ */
/* the station view (dynamic parts)                                     */
/* ------------------------------------------------------------------ */

const RING_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const RING_FRAG = /* glsl */ `
  uniform float uProgress; uniform vec3 uTrack; uniform vec3 uFill; uniform sampler2D uIcon; uniform float uAlpha;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float aa = fwidth(r) * 1.2;
    float disc = 1.0 - smoothstep(0.74 - aa, 0.74, r);
    vec3 col = vec3(1.0, 0.98, 0.94);
    float alpha = disc;
    float ring = (1.0 - smoothstep(0.98 - aa, 0.98, r)) * smoothstep(0.72 - aa, 0.72, r);
    float ang = atan(p.x, p.y);
    float a01 = (ang < 0.0 ? ang + 6.2831853 : ang) / 6.2831853;
    vec3 rc = a01 <= uProgress ? uFill : uTrack;
    col = mix(col, rc, ring);
    alpha = max(alpha, ring);
    vec2 iuv = p / 1.2 + 0.5;
    vec4 ic = texture2D(uIcon, iuv);
    float inIcon = step(r, 0.7);
    col = mix(col, ic.rgb, ic.a * inIcon);
    gl_FragColor = vec4(col, alpha * uAlpha);
    #include <colorspace_fragment>
  }`

export interface StationView {
  role: Role
  slot: StationSlot
  /** world positions of the three shelf places, bottom tier first */
  slots: THREE.Vector3[]
  /** where the item faces (world yaw) */
  facing: number
  lamp: THREE.MeshStandardMaterial
  ring: THREE.Mesh
  ringU: { uProgress: { value: number }; uAlpha: { value: number }; uIcon: { value: THREE.Texture }; uFill: { value: THREE.Color }; uTrack: { value: THREE.Color } }
  plate: { tex: THREE.CanvasTexture; g: CanvasRenderingContext2D; text: string }
  /** an invisible box for picking the station */
  hit: THREE.Mesh
  /** the occupant, if any */
  holder: string | null
}

function drawPlate(v: StationView, title: string, name: string | null, tint: string) {
  const text = `${title}|${name ?? ''}`
  if (v.plate.text === text) return
  v.plate.text = text
  const g = v.plate.g
  const W = g.canvas.width, H = g.canvas.height
  g.clearRect(0, 0, W, H)
  g.fillStyle = C.paper
  g.beginPath()
  g.roundRect(6, 6, W - 12, H - 12, 34)
  g.fill()
  g.lineWidth = 8
  g.strokeStyle = tint
  g.stroke()
  g.fillStyle = tint
  g.beginPath()
  g.arc(58, H / 2, 20, 0, Math.PI * 2)
  g.fill()
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  g.fillStyle = C.indigo
  const font = (w: number, s: number) => `${w} ${s}px "PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",sans-serif`
  g.font = font(900, 50)
  g.fillText(title, 96, name ? H * 0.36 : H / 2, W - 120)
  if (name) {
    g.font = font(700, 36)
    g.fillStyle = C.coral
    g.fillText(name, 96, H * 0.72, W - 120)
  } else {
    g.font = font(700, 32)
    g.fillStyle = '#9a94cc'
  }
  v.plate.tex.needsUpdate = true
}

export function updatePlate(v: StationView, holderName: string | null) {
  drawPlate(v, v.role.title, holderName ?? '空缺 · 在名册里派人', DISTRICT_INFO[v.role.district].tint)
}

/* ------------------------------------------------------------------ */
/* build                                                                */
/* ------------------------------------------------------------------ */

export function buildStations(b: Batcher, occ: Occupancy, scene: THREE.Object3D): Map<string, StationView> {
  const views = new Map<string, StationView>()
  const plateGeo = new THREE.PlaneGeometry(1.5, 0.375)
  const ringGeo = new THREE.PlaneGeometry(1.0, 1.0)
  for (const slot of Object.values(STATIONS)) {
    const role = ROLE_MAP[slot.role]
    const tint = DISTRICT_INFO[role.district].tint
    const base = deckBase(slot)
    const f = new Frame(slot.x, base, slot.z, slot.ry)

    // deck: planks with a tinted rim, and a little step at the back
    f.put(b, 'paint', slab(DECK.w + 0.16, DECK.d + 0.16, DECK_H - 0.01, 0.3, 0.02), 0, 0, DECK.z, tint)
    f.put(b, 'wood', slab(DECK.w, DECK.d, DECK_H, 0.24, 0.015), 0, 0.004, DECK.z, '#efd2a8')

    // the desk: paper top on two tinted side panels, a front panel for the name plate
    f.put(b, 'paint', rbox(1.95, 0.06, 0.8, 0.025), 0, DESK_TOP - 0.03, 0, C.paper)
    for (const sx of [-0.9, 0.9]) f.put(b, 'paint', rbox(0.08, DESK_TOP - DECK_H - 0.06, 0.72, 0.02), sx, DECK_H + (DESK_TOP - DECK_H - 0.06) / 2, 0, tint)
    f.put(b, 'paint', rbox(1.72, 0.4, 0.04, 0.015), 0, DECK_H + 0.27, 0.34, tint)
    f.put(b, 'paint', box(1.72, 0.04, 0.6), 0, DECK_H + 0.1, 0, '#e8dcc6')

    // the job's own prop
    PROPS[role.station](b, f, DESK_TOP, tint)

    // status lamp on a little post at the desk's back-left corner
    f.put(b, 'paint', cyl(0.02, 0.025, 0.3, 8), -0.85, DESK_TOP + 0.15, -0.3, C.indigo)
    f.put(b, 'paint', cyl(0.07, 0.06, 0.03, 14), -0.85, DESK_TOP + 0.3, -0.3, C.indigo)
    const lamp = new THREE.MeshStandardMaterial({ color: '#d6d9e8', emissive: '#000000', roughness: 0.3 })
    const lampMesh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), lamp)
    const lp = f.at(-0.85, DESK_TOP + 0.37, -0.3)
    lampMesh.position.set(lp[0], lp[1], lp[2])
    scene.add(lampMesh)

    // the output shelf: two posts, three tiers, a tinted back and a crown
    for (const sx of [-0.3, 0.3]) for (const sz of [-0.26, 0.2]) f.put(b, 'wood', rbox(0.06, 1.42, 0.06, 0.02), SHELF_X + sx, DECK_H + 0.71, sz, C.woodDark)
    for (const ty of TIERS) f.put(b, 'wood', rbox(0.68, 0.045, 0.52, 0.015), SHELF_X, DECK_H + ty, -0.03, C.wood)
    f.put(b, 'paint', rbox(0.62, 1.3, 0.03, 0.015), SHELF_X, DECK_H + 0.72, -0.27, tint)
    f.put(b, 'paint', rbox(0.74, 0.08, 0.56, 0.03), SHELF_X, DECK_H + 1.46, -0.03, C.paper)
    f.put(b, 'paint', sphere(0.06, 12, 8), SHELF_X, DECK_H + 1.55, -0.03, C.coral)
    const slots = TIERS.map((ty) => {
      const p = f.at(SHELF_X, DECK_H + ty + 0.025, -0.02)
      return new THREE.Vector3(p[0], p[1], p[2])
    })

    // a pennant pole at the back corner gives each row a skyline
    if (slot.district !== 'center') {
      f.put(b, 'paint', cyl(0.035, 0.045, 2.9, 8), -DECK.w / 2 + 0.2, DECK_H + 1.45, DECK.z - DECK.d / 2 + 0.25, C.paper)
      f.put(b, 'paint', sphere(0.07, 10, 8), -DECK.w / 2 + 0.2, DECK_H + 2.92, DECK.z - DECK.d / 2 + 0.25, C.coral)
      const flag = new THREE.Shape()
      flag.moveTo(0, 0); flag.lineTo(0.75, -0.2); flag.lineTo(0, -0.42); flag.lineTo(0, 0)
      f.put(b, 'paint', extrude(flag, 0.02, 0, 'pennant'), -DECK.w / 2 + 0.24, DECK_H + 2.78, DECK.z - DECK.d / 2 + 0.24, tint, -Math.PI / 2)
    }

    // name plate on the desk front, facing the plaza
    const pc = document.createElement('canvas')
    pc.width = 512
    pc.height = 128
    const tex = new THREE.CanvasTexture(pc)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const plate = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 }))
    const pp = f.at(0, DECK_H + 0.27, 0.365)
    plate.position.set(pp[0], pp[1], pp[2])
    plate.rotation.y = slot.ry
    scene.add(plate)

    // progress ring over the shelf
    const ringU = {
      uProgress: { value: 0 },
      uAlpha: { value: 0 },
      uIcon: { value: kindTexture('doc') as THREE.Texture },
      uFill: { value: new THREE.Color(tint) },
      uTrack: { value: new THREE.Color('#e6e1f5') },
    }
    const ring = new THREE.Mesh(ringGeo, new THREE.ShaderMaterial({ uniforms: ringU, vertexShader: RING_VERT, fragmentShader: RING_FRAG, transparent: true, depthWrite: false }))
    const rp = f.at(SHELF_X, DECK_H + 2.1, -0.03)
    ring.position.set(rp[0], rp[1], rp[2])
    ring.renderOrder = 4
    ring.visible = false
    scene.add(ring)

    // pick box
    const hit = new THREE.Mesh(new THREE.BoxGeometry(DECK.w, 1.6, DECK.d))
    const hp = f.at(0, 0.8, DECK.z)
    hit.position.set(hp[0], hp[1], hp[2])
    hit.rotation.y = slot.ry
    hit.updateMatrixWorld(true)
    hit.userData.station = slot.role

    const r = deckRect(slot)
    occ.rect(r.x0 - 0.3, r.z0 - 0.3, r.x1 + 0.3, r.z1 + 0.3)

    const v: StationView = { role, slot, slots, facing: slot.ry, lamp, ring, ringU, plate: { tex, g: pc.getContext('2d')!, text: '' }, hit, holder: null }
    updatePlate(v, null)
    views.set(slot.role, v)
  }
  return views
}

const LAMP: Record<string, string> = {
  working: '#7fe0bf',
  'needs-input': '#ffb347',
  error: '#ff5a4a',
  success: '#fe6a4a',
  idle: '#fff1d0',
  offline: '#000000',
}

/** Update the lamp and the ring for the current state of the station's holder. */
export function paintStation(v: StationView, t: number, status: string | null, progress: number | null, kind: OutputKind | null) {
  const lampColor = status ? LAMP[status] ?? '#000000' : '#000000'
  v.lamp.emissive.set(lampColor)
  const blink = status === 'error' ? (Math.sin(t * 8) > 0 ? 1 : 0.15) : status === 'needs-input' ? 0.55 + 0.45 * Math.sin(t * 5) : status === 'working' ? 0.75 + 0.25 * Math.sin(t * 2) : 0.8
  v.lamp.emissiveIntensity = status && status !== 'offline' ? 1.4 * blink : 0
  v.lamp.color.set(status && status !== 'offline' ? lampColor : '#d6d9e8')
  const show = progress !== null && kind !== null
  const want = show ? 1 : 0
  v.ringU.uAlpha.value += (want - v.ringU.uAlpha.value) * 0.12
  v.ring.visible = v.ringU.uAlpha.value > 0.02
  if (show) {
    v.ringU.uProgress.value = progress!
    const tex = kindTexture(kind!)
    if (v.ringU.uIcon.value !== tex) v.ringU.uIcon.value = tex
  }
}
