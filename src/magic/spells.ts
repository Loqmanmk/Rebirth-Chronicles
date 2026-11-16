/**
 * The five elements of Aetheria. Each has one beginner spell for now.
 * (The hidden "Soul" magic comes much later in the story.)
 */

export type SpellId = 'fire' | 'water' | 'wind' | 'earth' | 'spirit';

export interface SpellDef {
  id: SpellId;
  element: string;
  name: string;
  description: string;
  /** mana needed to cast */
  cost: number;
  /** main colour and light colour, used for icons and effects */
  color: number;
  light: number;
}

export const SPELLS: SpellDef[] = [
  {
    id: 'fire',
    element: 'Fire',
    name: 'Fireball',
    description: 'A ball of fire. Strong damage.',
    cost: 4,
    color: 0xff7a30,
    light: 0xffd860,
  },
  {
    id: 'water',
    element: 'Water',
    name: 'Water Bolt',
    description: 'Light damage. Slows the enemy.',
    cost: 3,
    color: 0x4aa8ff,
    light: 0xc0e4ff,
  },
  {
    id: 'wind',
    element: 'Wind',
    name: 'Gust',
    description: 'Blows away every enemy in front of you.',
    cost: 3,
    color: 0x7fe0a0,
    light: 0xe0ffe8,
  },
  {
    id: 'earth',
    element: 'Earth',
    name: 'Stone Spikes',
    description: 'Spikes rise around you. Strong damage, stuns.',
    cost: 6,
    color: 0xb08850,
    light: 0xe0c090,
  },
  {
    id: 'spirit',
    element: 'Spirit',
    name: 'Mend',
    description: 'Heals 2 hearts.',
    cost: 8,
    color: 0xc890ff,
    light: 0xffffff,
  },
];

export const SPELL_BY_ID = Object.fromEntries(SPELLS.map((s) => [s.id, s])) as Record<
  SpellId,
  SpellDef
>;
