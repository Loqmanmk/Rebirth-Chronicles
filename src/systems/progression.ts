/**
 * Levels, life stages and stats.
 * Every level is one step of the hero's life: you grow older as you level up.
 */

export type Stage = 'Child' | 'Teen' | 'Adult' | 'Master';

export const MAX_LEVEL = 30;

export function stageForLevel(level: number): Stage {
  if (level <= 5) return 'Child';
  if (level <= 10) return 'Teen';
  if (level <= 20) return 'Adult';
  return 'Master';
}

/** Child 5-9, Teen 12-16, Adult 18-27, Master 30-39. */
export function ageForLevel(level: number): number {
  if (level <= 5) return 4 + level;
  if (level <= 10) return 6 + level;
  if (level <= 20) return 7 + level;
  return 9 + level;
}

/** XP needed to go from this level to the next one. */
export function xpToNext(level: number): number {
  return 15 + level * 10;
}

export interface Stats {
  maxHp: number;
  maxMana: number;
  /** sword damage */
  strength: number;
  /** extra damage added to attack spells */
  magic: number;
  /** movement speed multiplier (children have short legs) */
  speed: number;
}

export function statsForLevel(level: number): Stats {
  const stage = stageForLevel(level);
  return {
    maxHp: 5 + Math.floor(level / 3),
    maxMana: 20 + (level - 1) * 2,
    strength: 1 + Math.floor(level / 5),
    magic: Math.floor(level / 4),
    speed: stage === 'Child' ? 1 : stage === 'Teen' ? 1.12 : 1.2,
  };
}

/** Which player sprite to use at each stage. */
export const STAGE_SKIN: Record<Stage, string> = {
  Child: 'player',
  Teen: 'player_teen',
  Adult: 'player_adult',
  Master: 'player_master',
};
