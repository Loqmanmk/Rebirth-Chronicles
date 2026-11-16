import type { SpellId } from '../magic/spells';
import type { MemoryData } from '../story/memory';

/**
 * Saving and loading. The save lives in the browser (localStorage),
 * so it stays on this computer and in this browser only.
 */

const SAVE_KEY = 'rebirth-chronicles-save';
const SAVE_VERSION = 1;

export interface PlayerSave {
  level: number;
  xp: number;
  hp: number;
  mana: number;
  known: SpellId[];
  selected: SpellId | null;
  x: number;
  y: number;
}

export interface SaveData {
  version: number;
  savedAt: number;
  player: PlayerSave;
  memory: MemoryData;
}

export function writeSave(player: PlayerSave, memory: MemoryData): boolean {
  const data: SaveData = { version: SAVE_VERSION, savedAt: Date.now(), player, memory };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false; // storage full or blocked (private window)
  }
}

/** Returns the save, or null when there is none or it cannot be read. */
export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== SAVE_VERSION || !data.player || !data.memory) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // nothing to do
  }
}
