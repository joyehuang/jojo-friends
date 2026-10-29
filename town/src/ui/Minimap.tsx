import { useEffect, useRef } from 'react'
import { BRIDGES, CELLS, ISLAND, ISLET, ISLETS, L, RAIL, REACH } from '../scene/layout'
import type { Town3D } from '../scene/town3d'
import type { TownState, TownStore } from '../store'
import { DISTRICTS } from '../work/roles'
import { tone } from './format'

const SIZE = 184
const SPAN = 340
const TONE: Record<string, string> = { work: '#3ea383', ask: '#f0a43a', error: '#e0473a', ready: '#fe6a4a', rest: '#6f9fd8', off: '#9a94cc' }

function drawBase(g: CanvasRenderingContext2D, k: number) {
  const X = (v: number) => SIZE / 2 + v * k
  g.fillStyle = '#a9daf2'
  g.fillRect(0, 0, SIZE, SIZE)
  const island = (x: number, z: number, half: number, corner: number) => {
    g.fillStyle = '#f3e3bf'
    g.beginPath()
    g.roundRect(X(x - half - 5), X(z - half - 5), (half + 5) * 2 * k, (half + 5) * 2 * k, (corner + 5) * k)
    g.fill()
    g.fillStyle = '#c4e9d3'
    g.beginPath()
    g.roundRect(X(x - half), X(z - half), half * 2 * k, half * 2 * k, corner * k)
    g.fill()
  }
  island(0, 0, ISLAND.half, ISLAND.corner)
  for (const s of ISLETS) island(s.x, s.z, ISLET.half, ISLET.corner)
  g.strokeStyle = '#d9b98a'
  g.lineWidth = Math.max(1.5, 3 * k)
  for (const b of BRIDGES) {
    g.beginPath()
    if (b.axis === 'z') { g.moveTo(X(b.at), X(b.u0)); g.lineTo(X(b.at), X(b.u1)) } else { g.moveTo(X(b.u0), X(b.at)); g.lineTo(X(b.u1), X(b.at)) }
    g.stroke()
  }
  // district yards in their colours, the plaza in cream
  for (const [x0, x1] of CELLS) for (const [z0, z1] of CELLS) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    const id = cx === 0 && cz === 0 ? 'center' : cx === 0 ? (cz < 0 ? 'north' : 'south') : cz === 0 ? (cx < 0 ? 'west' : 'east') : null
    g.fillStyle = id === 'center' ? '#f8eedb' : id ? DISTRICTS[id].tint + '55' : '#b5e2c8'
    g.beginPath()
    g.roundRect(X(x0 + 3), X(z0 + 3), (x1 - x0 - 6) * k, (z1 - z0 - 6) * k, 3)
    g.fill()
  }
  g.strokeStyle = '#ffffff'
  g.lineWidth = Math.max(2, 5 * k)
  for (const v of L) {
    g.beginPath(); g.moveTo(X(-REACH), X(v)); g.lineTo(X(REACH), X(v)); g.stroke()
    g.beginPath(); g.moveTo(X(v), X(-REACH)); g.lineTo(X(v), X(REACH)); g.stroke()
  }
  g.strokeStyle = '#fe6a4a88'
  g.lineWidth = 1.5
  g.beginPath()
  g.roundRect(X(-RAIL.half), X(-RAIL.half), RAIL.half * 2 * k, RAIL.half * 2 * k, RAIL.r * k)
  g.stroke()
  g.fillStyle = '#fe6a4a'
  g.beginPath(); g.arc(X(0), X(0), 3, 0, Math.PI * 2); g.fill()
}

export function Minimap({ town, state, store }: { town: Town3D; state: TownState; store: TownStore }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const base = useRef<HTMLCanvasElement | null>(null)
  const live = useRef(state)
  live.current = state

  useEffect(() => {
    const c = ref.current!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = c.height = SIZE * dpr
    const g = c.getContext('2d')!
    const k = SIZE / SPAN
    const b = document.createElement('canvas')
    b.width = b.height = SIZE * dpr
    const bg = b.getContext('2d')!
    bg.scale(dpr, dpr)
    drawBase(bg, k)
    base.current = b
    const X = (v: number) => SIZE / 2 + v * k
    const draw = () => {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.drawImage(b, 0, 0)
      g.scale(dpr, dpr)
      const st = live.current
      for (const p of town.positions()) {
        const v = st.snap.employees[p.id]
        if (!v || p.home) continue
        const sel = st.selected === p.id
        g.fillStyle = TONE[tone(v)]
        g.beginPath()
        g.arc(X(p.x), X(p.z), sel ? 4 : 2.6, 0, Math.PI * 2)
        g.fill()
        if (sel) { g.strokeStyle = '#2d3272'; g.lineWidth = 1.6; g.stroke() }
      }
      const view = town.view()
      const r = Math.max(6, view.span * 0.3 * k)
      g.strokeStyle = '#2d3272'
      g.lineWidth = 1.6
      g.beginPath()
      g.arc(X(view.x), X(view.z), r, 0, Math.PI * 2)
      g.stroke()
      g.fillStyle = '#2d3272'
      g.beginPath()
      const hx = Math.sin(view.heading), hz = Math.cos(view.heading)
      g.moveTo(X(view.x) + hx * (r + 6), X(view.z) + hz * (r + 6))
      g.lineTo(X(view.x) + hx * r - hz * 4, X(view.z) + hz * r + hx * 4)
      g.lineTo(X(view.x) + hx * r + hz * 4, X(view.z) + hz * r - hx * 4)
      g.fill()
    }
    draw()
    const id = window.setInterval(draw, 250)
    return () => window.clearInterval(id)
  }, [town])

  return (
    <div className='minimap'>
      <canvas
        ref={ref}
        style={{ width: SIZE, height: SIZE }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const k = SIZE / SPAN
          const x = (e.clientX - r.left - SIZE / 2) / k, z = (e.clientY - r.top - SIZE / 2) / k
          store.setFollowing(false)
          town.focusPoint(x, z)
        }}
        aria-label='小地图：点一下把镜头移过去'
        role='img'
      />
    </div>
  )
}
