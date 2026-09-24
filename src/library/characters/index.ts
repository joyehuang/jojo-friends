import type { Character } from '../character'
import { JOJO } from './jojo'
import { H02 } from './h02'
import { H03 } from './h03'
import { H04 } from './h04'
import { H05 } from './h05'
import { H06 } from './h06'
import { O01 } from './o01'
import { O02 } from './o02'
import { O03 } from './o03'
import { O04 } from './o04'
import { O05 } from './o05'
import { O06 } from './o06'
import { O07 } from './o07'
import { O08 } from './o08'
import { O09 } from './o09'
import { O10 } from './o10'
import { O11 } from './o11'
import { O12 } from './o12'
import { O13 } from './o13'
import { O14 } from './o14'
import { O15 } from './o15'
import { O16 } from './o16'
import { O17 } from './o17'
import { O18 } from './o18'
import { O19 } from './o19'
import { O20 } from './o20'

/**
 * The registry: every character in catalogue order. Ids are stable machine
 * ids (never the display name), so renaming a character never breaks callers.
 */
export const CHARACTER_LIST: readonly Character[] = [
  JOJO, H02, H03, H04, H05, H06, O01, O02, O03, O04, O05, O06, O07, O08, O09, O10, O11, O12, O13, O14, O15, O16, O17, O18, O19, O20,
]

export const CHARACTERS: Readonly<Record<string, Character>> = Object.fromEntries(CHARACTER_LIST.map((c) => [c.id, c]))

export const CHARACTER_IDS: readonly string[] = CHARACTER_LIST.map((c) => c.id)

export const DEFAULT_CHARACTER = JOJO

export function isCharacterId(v: unknown): v is string {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(CHARACTERS, v)
}

export function getCharacter(id: string): Character | undefined {
  return isCharacterId(id) ? CHARACTERS[id] : undefined
}

export { JOJO }
