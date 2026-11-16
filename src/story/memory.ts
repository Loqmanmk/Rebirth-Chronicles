/**
 * Everything the world remembers about what the player did.
 * Conversations read and write this, so villagers can react to past choices.
 * It is plain data, so it can be saved to disk later (step 6).
 */

type FlagValue = boolean | number | string;

export interface MemoryData {
  flags: Record<string, FlagValue>;
  affinity: Record<string, number>;
  counters: { slimesKilled: number; fainted: number };
}

export class Memory {
  /** story facts, e.g. "toldMotherTruth" */
  flags: Record<string, FlagValue> = {};
  /** how much each villager likes you (0 = neutral) */
  affinity: Record<string, number> = {};
  /** things the player did in the world */
  counters = { slimesKilled: 0, fainted: 0 };

  has(flag: string): boolean {
    return Boolean(this.flags[flag]);
  }

  get(flag: string): FlagValue | undefined {
    return this.flags[flag];
  }

  /** read a flag as a number (0 if not set) */
  num(flag: string): number {
    const v = this.flags[flag];
    return typeof v === 'number' ? v : 0;
  }

  set(flag: string, value: FlagValue = true): void {
    this.flags[flag] = value;
  }

  likes(npc: string): number {
    return this.affinity[npc] ?? 0;
  }

  /** make a villager like you more (or less, with a negative amount) */
  like(npc: string, amount: number): void {
    this.affinity[npc] = this.likes(npc) + amount;
  }

  toJSON(): MemoryData {
    return { flags: this.flags, affinity: this.affinity, counters: this.counters };
  }

  load(data: MemoryData): void {
    this.flags = { ...data.flags };
    this.affinity = { ...data.affinity };
    this.counters = { ...this.counters, ...data.counters };
  }
}

/** The one memory of the current game. */
export const memory = new Memory();
