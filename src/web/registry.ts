import { JOJO } from '../library/characters/jojo'

/**
 * Jojo-only stand-in for `src/library/characters/index.ts`, swapped in by
 * `vite.web.config.ts` for the web package. `config.ts` is the only library
 * module that imports the full registry; everything else imports `jojo.ts`
 * directly. With this module in its place the web runtime never evaluates the
 * other 25 characters (their specs, solved geometry or names), so a browser
 * bundle built from it carries Jojo alone.
 */
export const CHARACTER_LIST = [JOJO] as const
export const CHARACTERS = { jojo: JOJO } as const
export const CHARACTER_IDS = ['jojo'] as const
export const DEFAULT_CHARACTER = JOJO

export function isCharacterId(v: unknown): v is string {
  return v === 'jojo'
}

export function getCharacter(id: string) {
  return id === 'jojo' ? JOJO : undefined
}

export { JOJO }
