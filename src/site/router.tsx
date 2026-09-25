import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/**
 * A tiny history router: real paths (/stories/<id>, /c/<id>) so every page can
 * be opened, refreshed and shared on its own. Works during prerendering too:
 * the build sets the URL being rendered with setServerUrl().
 */
const listeners = new Set<() => void>()
let serverUrl = '/'

export function setServerUrl(url: string) {
  serverUrl = url
}

/*
 * Scroll is restored by hand (history.scrollRestoration = 'manual', set in
 * main.tsx): a page may arrive a moment later than its URL (its chunk loads
 * first), so the App applies the pending scroll once the new page is drawn.
 * Push → top (or #anchor); back / forward → where the reader was.
 */
const positions = new Map<string, number>()
let seq = 0
let nav = 0
let pending: number | 'anchor' | null = null
/** the history entry whose page is on screen (scroll is recorded against it) */
let settled = 'first'
const entryKey = (): string => (history.state && (history.state as { k?: string }).k) || 'first'

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === location.pathname + location.search + location.hash) return
  if (opts.replace) history.replaceState({ k: entryKey() }, '', to)
  else {
    positions.set(settled, window.scrollY)
    history.pushState({ k: `e${Date.now().toString(36)}${++seq}` }, '', to)
    nav++
    pending = 'anchor'
  }
  listeners.forEach((l) => l())
}

function onPop() {
  nav++
  pending = positions.get(entryKey()) ?? 'anchor'
}

/** Increases with every push / back / forward (not with replace). */
export const navCount = () => nav

/** The scroll to apply now that the page for the latest navigation is drawn (once). */
export function takePendingScroll() {
  const p = pending
  pending = null
  settled = entryKey()
  return p
}

function subscribe(on: () => void) {
  listeners.add(on)
  window.addEventListener('popstate', on)
  return () => {
    listeners.delete(on)
    window.removeEventListener('popstate', on)
  }
}
if (typeof window !== 'undefined') {
  // registered once, before any component's listener, so it always runs first
  window.addEventListener('popstate', onPop)
  window.addEventListener('scroll', () => {
    if (pending === null) positions.set(settled, window.scrollY)
  }, { passive: true })
}
const snapshot = () => location.pathname + location.search + location.hash

export function useLocation() {
  const url = useSyncExternalStore(subscribe, snapshot, () => serverUrl)
  const u = new URL(url, 'http://x')
  return { path: u.pathname, search: u.search, hash: u.hash }
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={click} {...rest} />
}
