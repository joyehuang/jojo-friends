import { useEffect, useMemo, useRef, useState } from 'react'
import { TownStore, useTown } from '../store'
import type { Pick, Town3D } from '../scene/town3d'
import { Hud } from './Hud'
import { play } from './sound'

export function TownApp() {
  const store = useMemo(() => new TownStore(), [])
  const state = useTown(store)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [town, setTown] = useState<Town3D | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [hover, setHover] = useState<Pick | null>(null)

  useEffect(() => store.start(), [store])
  useEffect(() => store.onAnswer(() => { if (store.state.settings.sound) play('answer') }), [store])

  useEffect(() => {
    const canvas = canvasRef.current!
    let t: Town3D | null = null
    let ro: ResizeObserver | null = null
    let cancelled = false
    // let the gate screen paint before the heavy build
    const timer = window.setTimeout(async () => {
      try {
        const { Town3D } = await import('../scene/town3d')
        if (cancelled) return
        t = new Town3D(canvas, store)
        const fit = () => t?.resize(canvas.clientWidth, canvas.clientHeight)
        fit()
        ro = new ResizeObserver(fit)
        ro.observe(canvas)
        t.onHover = setHover
        t.onPick = (p) => {
          if (!p) store.select(null)
          else if (p.kind === 'employee') store.select(p.id)
          else if (p.kind === 'output') store.harvest([p.id])
          else if (p.holder) store.select(p.holder)
          else store.setPanel('roster')
        }
        setTown(t)
        // a handle for poking at the town from the console: ?debug
        if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { town: t, store })
        await t.start()
        if (!cancelled) setReady(true)
      } catch (err) {
        console.error(err)
        setFailed(err instanceof Error ? err.message : String(err))
        setReady(true)
      }
    }, 40)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      ro?.disconnect()
      t?.dispose()
    }
  }, [store])

  useEffect(() => {
    town?.applyQuality()
  }, [town, state.settings.quality])

  return (
    <div className='town'>
      <canvas ref={canvasRef} className='town-canvas' aria-label='信号镇 3D 视图：拖动旋转，右键拖动平移，滚轮缩放，WASD 移动镜头' />
      {failed && (
        <div className='town-fallback'>
          <strong>3D 小镇没能打开</strong>
          <span>你的浏览器可能没有开启 WebGL（{failed}）。下面的名册、收件箱和一键收菜都还能用。</span>
        </div>
      )}
      <Hud store={store} state={state} town={town} hover={hover} />
      <div className={`gate${ready ? ' gate-out' : ''}`} aria-hidden={ready}>
        <div className='gate-card'>
          <div className='gate-dot' />
          <div className='gate-title'>信号镇</div>
          <div className='gate-sub'>大家正在开门上班…</div>
        </div>
      </div>
    </div>
  )
}
