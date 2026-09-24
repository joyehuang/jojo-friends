import { describe, expect, it, vi } from 'vitest'
import { resolveConfig, resolveGaze } from '../src/library/config'

describe('resolveConfig (API input normalisation)', () => {
  it('uses quiet defaults', () => {
    const c = resolveConfig({}, false)
    expect(c).toMatchObject({ emotion: 'calm', status: 'idle', intensity: 0.7, motion: 'full', gaze: 'auto', px: 96 })
  })

  it('clamps intensity and survives garbage', () => {
    expect(resolveConfig({ intensity: -3 }, false).intensity).toBe(0)
    expect(resolveConfig({ intensity: 9 }, false).intensity).toBe(1)
    expect(resolveConfig({ intensity: Number.NaN }, false).intensity).toBe(0.7)
    expect(resolveConfig({ intensity: '0.3' as unknown as number }, false).intensity).toBe(0.7)
  })

  it('falls back on unknown emotion/status/motion with a dev warning, never throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const c = resolveConfig({ emotion: 'rage' as never, status: 'exploded' as never, motion: 'wild' as never }, false)
    expect(c.emotion).toBe('calm')
    expect(c.status).toBe('idle')
    expect(c.motion).toBe('full')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('prefers-reduced-motion forces static, even over an explicit "full"', () => {
    expect(resolveConfig({ motion: 'full' }, true).motion).toBe('static')
    expect(resolveConfig({ motion: 'transitions' }, true).motion).toBe('static')
    expect(resolveConfig({ motion: 'auto' }, false).motion).toBe('full')
    expect(resolveConfig({ motion: 'static' }, false).motion).toBe('static')
  })

  it('size: numbers, px strings, other CSS lengths and invalid values', () => {
    expect(resolveConfig({ size: 32 }, false)).toMatchObject({ px: 32, cssSize: '32px' })
    expect(resolveConfig({ size: '48px' }, false)).toMatchObject({ px: 48, cssSize: '48px' })
    expect(resolveConfig({ size: '100%' }, false)).toMatchObject({ px: null, cssSize: '100%' })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveConfig({ size: -4 }, false)).toMatchObject({ px: 96 })
    warn.mockRestore()
  })

  it('small sizes simplify automatically; explicit props win', () => {
    const s24 = resolveConfig({ size: 24 }, false)
    expect(s24).toMatchObject({ framing: 'tight', flat: true })
    expect(s24.frame).toMatchObject({ small: true, brows: false, shadow: false })
    expect(s24.frame.minStroke).toBeGreaterThan(40)
    const s96 = resolveConfig({ size: 96 }, false)
    expect(s96).toMatchObject({ framing: 'full', flat: false })
    expect(s96.frame).toMatchObject({ small: false, brows: true, shadow: true })
    expect(resolveConfig({ size: 96, brows: false, shadow: false }, false).frame).toMatchObject({ brows: false, shadow: false })
    expect(resolveConfig({ size: 24, framing: 'full' }, false).framing).toBe('full')
  })

  it('gaze: keywords pass through, objects are clamped, junk becomes auto', () => {
    expect(resolveGaze('pointer')).toBe('pointer')
    expect(resolveGaze({ x: 4, y: -9 })).toEqual({ x: 1, y: -1 })
    expect(resolveGaze({ x: 'a', y: 0.5 })).toEqual({ x: 0, y: 0.5 })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveGaze('sideways')).toBe('auto')
    warn.mockRestore()
  })

  it('status never changes the emotion', () => {
    for (const status of ['idle', 'working', 'needs-input', 'success', 'error', 'offline'] as const) {
      expect(resolveConfig({ status }, false).emotion).toBe('calm')
    }
  })
})
