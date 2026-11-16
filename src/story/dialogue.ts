import type { Memory } from './memory';

/** Facts about the player that conversations can look at. */
export interface Facts {
  level: number;
  spells: string[];
}

/** Things a conversation can do to the game. */
export interface StoryApi {
  xp(amount: number): void;
  /** restore all hearts */
  heal(): void;
}

export type Cond = (m: Memory, f: Facts) => boolean;
export type Run = (m: Memory, api: StoryApi, f: Facts) => void;
export type Text = string | ((m: Memory, f: Facts) => string);

export interface Choice {
  text: string;
  /** node to go to; the conversation ends if missing */
  next?: string;
  /** what happens when the player picks this choice */
  run?: Run;
  /** only show this choice when the condition is true */
  when?: Cond;
}

export interface DialogueNode {
  /** who is talking (default: the villager) */
  speaker?: string;
  text: Text;
  /** runs when this line appears */
  run?: Run;
  choices?: Choice[];
  /** next line when there are no choices; the conversation ends if missing */
  next?: string;
}

export interface Conversation {
  /** villager id, used for affinity */
  npc: string;
  name: string;
  /** picks the first line, depending on what the villager remembers */
  start: (m: Memory, f: Facts) => string;
  nodes: Record<string, DialogueNode>;
}
