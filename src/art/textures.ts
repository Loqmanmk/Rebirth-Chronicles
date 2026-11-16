import Phaser from 'phaser';
import { SPELLS } from '../magic/spells';

/**
 * All art is drawn in code for now (placeholder pixel art).
 * Later we can replace any texture key with a real image file
 * without touching the rest of the game.
 */

export const TILE = 16;

export const Tile = {
  GRASS: 0,
  GRASS_TUFT: 1,
  GRASS_FLOWER: 2,
  PATH: 3,
  WATER: 4,
  SOIL: 5,
} as const;

const TILE_COUNT = 6;

type Ctx = CanvasRenderingContext2D;

/** Small seeded random generator so the art looks the same every run. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Pixel-perfect filled ellipse (no anti-aliasing). */
function disc(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) ctx.fillRect(x, y, 1, 1);
    }
  }
}

function speckle(ctx: Ctx, rng: () => number, ox: number, colors: string[], count: number): void {
  for (let i = 0; i < count; i++) {
    const x = ox + Math.floor(rng() * TILE);
    const y = Math.floor(rng() * TILE);
    rect(ctx, x, y, 1, 1, colors[Math.floor(rng() * colors.length)]);
  }
}

// ---------------------------------------------------------------- tiles

function makeTiles(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('tiles', TILE * TILE_COUNT, TILE)!;
  const ctx = tex.getContext();
  const rng = makeRng(7);

  const grass = (index: number) => {
    const ox = index * TILE;
    rect(ctx, ox, 0, TILE, TILE, '#5fa84a');
    speckle(ctx, rng, ox, ['#6dba55', '#549c41'], 16);
    return ox;
  };

  grass(Tile.GRASS);

  let ox = grass(Tile.GRASS_TUFT);
  for (const [x, y] of [[3, 4], [10, 9], [6, 12]]) {
    rect(ctx, ox + x, y, 1, 3, '#3f8336');
    rect(ctx, ox + x + 2, y, 1, 3, '#3f8336');
    rect(ctx, ox + x + 1, y + 1, 1, 2, '#4a9340');
  }

  ox = grass(Tile.GRASS_FLOWER);
  const petals = ['#ffffff', '#ffd94a', '#ff9ac1'];
  [[4, 4], [11, 7], [6, 12]].forEach(([x, y], i) => {
    rect(ctx, ox + x - 1, y, 3, 1, petals[i]);
    rect(ctx, ox + x, y - 1, 1, 3, petals[i]);
    rect(ctx, ox + x, y, 1, 1, '#e8a020');
  });

  ox = Tile.PATH * TILE;
  rect(ctx, ox, 0, TILE, TILE, '#c9a66b');
  speckle(ctx, rng, ox, ['#b8935a', '#d8b97f', '#bb9860'], 22);

  ox = Tile.WATER * TILE;
  rect(ctx, ox, 0, TILE, TILE, '#3f8fd0');
  rect(ctx, ox + 2, 3, 5, 1, '#6fb4e8');
  rect(ctx, ox + 9, 8, 5, 1, '#6fb4e8');
  rect(ctx, ox + 3, 12, 4, 1, '#6fb4e8');
  rect(ctx, ox + 10, 2, 3, 1, '#3379b5');
  rect(ctx, ox + 1, 8, 4, 1, '#3379b5');
  rect(ctx, ox + 9, 13, 4, 1, '#3379b5');

  ox = Tile.SOIL * TILE;
  rect(ctx, ox, 0, TILE, TILE, '#8a5a3a');
  for (let y = 2; y < TILE; y += 4) rect(ctx, ox, y, TILE, 1, '#734729');
  for (const [x, y] of [[3, 4], [11, 4], [7, 8], [3, 12], [11, 12]]) {
    rect(ctx, ox + x, y, 1, 2, '#58a840');
    rect(ctx, ox + x - 1, y, 3, 1, '#6cc050');
  }

  tex.refresh();
}

// -------------------------------------------------------------- objects

function makeTree(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('tree', 32, 40)!;
  const ctx = tex.getContext();
  disc(ctx, 16, 37, 9, 2.5, 'rgba(0,0,0,0.22)');
  rect(ctx, 13, 26, 6, 12, '#6b4423');
  rect(ctx, 17, 26, 2, 12, '#523218');
  disc(ctx, 16, 15, 14, 13, '#2c6a31');
  disc(ctx, 14, 13, 11, 10, '#3a873e');
  disc(ctx, 11, 10, 6, 5, '#52a651');
  rect(ctx, 20, 18, 2, 1, '#52a651');
  rect(ctx, 8, 19, 2, 1, '#245a29');
  tex.refresh();
}

function makeBush(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('bush', 16, 12)!;
  const ctx = tex.getContext();
  disc(ctx, 8, 7, 7.5, 5, '#2f7435');
  disc(ctx, 7, 6, 5, 3.5, '#439645');
  rect(ctx, 4, 4, 1, 1, '#e0484a');
  rect(ctx, 10, 6, 1, 1, '#e0484a');
  tex.refresh();
}

function makeRock(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('rock', 16, 12)!;
  const ctx = tex.getContext();
  disc(ctx, 8, 7, 7, 4.5, '#77788a');
  disc(ctx, 7, 6, 5, 3, '#9a9bab');
  rect(ctx, 5, 4, 2, 1, '#bfc0cc');
  tex.refresh();
}

function makeHouse(scene: Phaser.Scene, key: string, roof: string, roofDark: string): void {
  const tex = scene.textures.createCanvas(key, 64, 64)!;
  const ctx = tex.getContext();

  // walls
  rect(ctx, 4, 28, 56, 34, '#e8d8b0');
  rect(ctx, 4, 58, 56, 4, '#9a8f7c'); // stone base
  for (const x of [4, 22, 39, 57]) rect(ctx, x, 28, 3, 30, '#7a5230'); // timber
  rect(ctx, 4, 28, 56, 2, '#7a5230');

  // chimney
  rect(ctx, 44, 2, 7, 12, '#8c8c98');
  rect(ctx, 43, 1, 9, 2, '#6d6d7a');

  // roof
  for (let y = 5; y < 31; y++) {
    const inset = Math.max(0, Math.floor((17 - (y - 5)) / 1.4));
    const dark = (y - 5) % 5 === 4;
    rect(ctx, inset, y, 64 - inset * 2, 1, dark ? roofDark : roof);
  }
  rect(ctx, 0, 30, 64, 2, roofDark);

  // door
  rect(ctx, 26, 42, 12, 20, '#4a2f18');
  rect(ctx, 27, 43, 10, 19, '#6b4423');
  rect(ctx, 35, 52, 1, 2, '#f0c040');

  // windows
  for (const x of [8, 44]) {
    rect(ctx, x, 38, 12, 12, '#4a2f18');
    rect(ctx, x + 1, 39, 10, 10, '#9fd3f0');
    rect(ctx, x + 5, 39, 2, 10, '#4a2f18');
    rect(ctx, x + 1, 43, 10, 2, '#4a2f18');
    rect(ctx, x + 2, 40, 2, 2, '#d6f0ff');
  }
  tex.refresh();
}

function makeWell(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('well', 28, 34)!;
  const ctx = tex.getContext();
  disc(ctx, 14, 30, 13, 3.5, 'rgba(0,0,0,0.22)');
  // posts + roof
  rect(ctx, 3, 6, 2, 18, '#6b4423');
  rect(ctx, 23, 6, 2, 18, '#6b4423');
  // stone ring
  disc(ctx, 14, 23, 12, 7, '#77788a');
  rect(ctx, 2, 23, 24, 5, '#77788a');
  disc(ctx, 14, 28, 12, 4, '#63647a');
  disc(ctx, 14, 22, 10, 5, '#9a9bab');
  disc(ctx, 14, 22, 8, 3.5, '#2d6fa8');
  rect(ctx, 11, 21, 4, 1, '#6fb4e8');
  // roof
  for (let y = 0; y < 7; y++) rect(ctx, 7 - y, y, 14 + y * 2, 1, y % 3 === 2 ? '#7c2f2f' : '#a84040');
  tex.refresh();
}

function makeFences(scene: Phaser.Scene): void {
  let tex = scene.textures.createCanvas('fence_h', 16, 16)!;
  let ctx = tex.getContext();
  rect(ctx, 0, 6, 16, 2, '#a87a48');
  rect(ctx, 0, 11, 16, 2, '#a87a48');
  rect(ctx, 0, 7, 16, 1, '#86602f');
  rect(ctx, 0, 12, 16, 1, '#86602f');
  rect(ctx, 6, 3, 3, 13, '#8a6234');
  rect(ctx, 6, 3, 3, 1, '#c09058');
  tex.refresh();

  tex = scene.textures.createCanvas('fence_v', 16, 16)!;
  ctx = tex.getContext();
  rect(ctx, 7, 0, 2, 16, '#a87a48');
  rect(ctx, 8, 0, 1, 16, '#86602f');
  rect(ctx, 6, 3, 4, 13, '#8a6234');
  rect(ctx, 6, 3, 4, 1, '#c09058');
  tex.refresh();
}

function makeSign(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('sign', 16, 18)!;
  const ctx = tex.getContext();
  rect(ctx, 7, 8, 2, 10, '#6b4423');
  rect(ctx, 1, 2, 14, 8, '#6b4423');
  rect(ctx, 2, 3, 12, 6, '#c9a66b');
  rect(ctx, 4, 5, 8, 1, '#6b4423');
  rect(ctx, 4, 7, 5, 1, '#6b4423');
  tex.refresh();
}

// ----------------------------------------------------------- characters

export interface CharacterPalette {
  hair: string;
  skin: string;
  tunic: string;
  tunicDark: string;
  pants: string;
}

const OUTLINE = '#2a1c14';
const EYE = '#2b2b3a';
const BOOTS = '#3a2a1e';

// 16x16 child sprite. Letters: o outline, h hair, s skin, e eye,
// t tunic, d tunic dark, p pants, b boots, . transparent
const BODY = [
  '.....otttto.....',
  '....otttttto....',
  '...osttttttso...',
  '...osttttttso...',
  '....oddddddo....',
  '....oppooppo....',
];
const LEGS_IDLE = ['....obboobbo....', '.....oo..oo.....'];
const LEGS_A = ['....obbo.oo.....', '.....oo.........'];
const LEGS_B = ['.....oo.obbo....', '.........oo.....'];

const HEAD_DOWN = [
  '................',
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...ohhsssshho...',
  '...ohesssseho...',
  '....osssssso....',
];
const HEAD_UP = [
  '................',
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '....ohhhhhho....',
];
const HEAD_SIDE = [
  '................',
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...ohhhhsssso...',
  '...ohhhhsseso...',
  '....ohhsssso....',
];

export const CHARACTER_FRAMES = [
  'down0', 'downA', 'downB',
  'up0', 'upA', 'upB',
  'side0', 'sideA', 'sideB',
] as const;

function characterRows(head: string[], legs: string[], adult: boolean): string[] {
  // Adults are the same sprite with a longer body.
  const body = adult ? [...BODY.slice(0, 3), BODY[2], ...BODY.slice(3, 5), BODY[4], BODY[5]] : BODY;
  return [...head, ...body, ...legs];
}

export function makeCharacter(
  scene: Phaser.Scene,
  key: string,
  palette: CharacterPalette,
  adult = false,
): void {
  const colors: Record<string, string> = {
    o: OUTLINE,
    h: palette.hair,
    s: palette.skin,
    e: EYE,
    t: palette.tunic,
    d: palette.tunicDark,
    p: palette.pants,
    b: BOOTS,
  };
  const height = adult ? 18 : 16;
  const tex = scene.textures.createCanvas(key, 16 * CHARACTER_FRAMES.length, height)!;
  const ctx = tex.getContext();

  const heads = { down: HEAD_DOWN, up: HEAD_UP, side: HEAD_SIDE };
  const legs = { '0': LEGS_IDLE, A: LEGS_A, B: LEGS_B };

  CHARACTER_FRAMES.forEach((frame, i) => {
    const dir = frame.slice(0, -1) as keyof typeof heads;
    const step = frame.slice(-1) as keyof typeof legs;
    const rows = characterRows(heads[dir], legs[step], adult);
    rows.forEach((row, y) => {
      if (row.length !== 16) console.warn(`Sprite row has wrong length: "${row}"`);
      for (let x = 0; x < row.length; x++) {
        const color = colors[row[x]];
        if (color) rect(ctx, i * 16 + x, y, 1, 1, color);
      }
    });
    tex.add(frame, 0, i * 16, 0, 16, height);
  });
  tex.refresh();
}

/** Creates idle + walk animations for a character texture. */
export function makeCharacterAnims(scene: Phaser.Scene, key: string): void {
  for (const dir of ['down', 'up', 'side']) {
    scene.anims.create({
      key: `${key}-idle-${dir}`,
      frames: [{ key, frame: `${dir}0` }],
      frameRate: 1,
    });
    scene.anims.create({
      key: `${key}-walk-${dir}`,
      frames: [`${dir}A`, `${dir}0`, `${dir}B`, `${dir}0`].map((frame) => ({ key, frame })),
      frameRate: 8,
      repeat: -1,
    });
  }
}

// --------------------------------------------------------------- combat

function makeSlime(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('slime', 32, 12)!;
  const ctx = tex.getContext();
  const draw = (ox: number, squish: number) => {
    const cy = 7 + squish;
    const ry = 5 - squish;
    const rx = 6.5 + squish;
    disc(ctx, ox + 8, cy, rx + 1, ry + 1, '#1f5a3a');
    disc(ctx, ox + 8, cy, rx, ry, '#4fc878');
    disc(ctx, ox + 7, cy - 1, rx - 2.5, ry - 2, '#7be09a');
    rect(ctx, ox + 5, cy - 3, 2, 1, '#d8ffe4');
    rect(ctx, ox + 5, cy, 2, 2, '#16302a');
    rect(ctx, ox + 10, cy, 2, 2, '#16302a');
  };
  draw(0, 0);
  draw(16, 1);
  tex.add('a', 0, 0, 0, 16, 12);
  tex.add('b', 0, 16, 0, 16, 12);
  tex.refresh();

  scene.anims.create({
    key: 'slime-idle',
    frames: [{ key: 'slime', frame: 'a' }, { key: 'slime', frame: 'b' }],
    frameRate: 4,
    repeat: -1,
  });
}

/** Sword swing arc, pointing right. Rotated in game for other directions. */
function makeSlash(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('slash', 16, 20)!;
  const ctx = tex.getContext();
  disc(ctx, 5, 10, 10, 10, '#ffffff');
  ctx.globalCompositeOperation = 'destination-out';
  disc(ctx, 1, 10, 10, 10, '#000000');
  ctx.globalCompositeOperation = 'source-over';
  tex.refresh();
}

function makeSpark(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('spark', 2, 2)!;
  rect(tex.getContext(), 0, 0, 2, 2, '#ffffff');
  tex.refresh();
}

function makeHearts(scene: Phaser.Scene): void {
  const rows = [
    '.oo.oo.',
    'owrorro',
    'orrrrro',
    'orrrrro',
    '.orrro.',
    '..oro..',
    '...o...',
  ];
  const tex = scene.textures.createCanvas('heart', 14, 7)!;
  const ctx = tex.getContext();
  const palettes: Record<string, string>[] = [
    { o: '#2a1c14', r: '#e0404a', w: '#ffb0b4' },
    { o: '#2a1c14', r: '#4a3540', w: '#4a3540' },
  ];
  palettes.forEach((colors, i) => {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = colors[row[x]];
        if (color) rect(ctx, i * 7 + x, y, 1, 1, color);
      }
    });
  });
  tex.add('full', 0, 0, 0, 7, 7);
  tex.add('empty', 0, 7, 0, 7, 7);
  tex.refresh();
}

// ---------------------------------------------------------------- magic

const ELEMENT_ICONS: Record<string, string[]> = {
  fire: [
    '....x....',
    '...xx....',
    '...xxx...',
    '..xxlx.x.',
    '.xxllxxx.',
    '.xllllxx.',
    '.xllllx..',
    '..xllx...',
    '...xx....',
  ],
  water: [
    '....x....',
    '....x....',
    '...xxx...',
    '...xxx...',
    '..xxxxx..',
    '.xxlxxxx.',
    '.xlxxxxx.',
    '.xxxxxxx.',
    '..xxxxx..',
  ],
  wind: [
    '.........',
    '...xxx...',
    '......x..',
    'xxxxxx...',
    '.........',
    'llllllll.',
    '........l',
    '..xxxxxx.',
    '.........',
  ],
  earth: [
    '.........',
    '....x....',
    '...xlx...',
    '...xxx...',
    '..xxxxx..',
    '..xxxlx..',
    '.xxxxxxx.',
    '.xxxxxxx.',
    'xxxxxxxxx',
  ],
  spirit: [
    '....x....',
    '....x....',
    '...xlx...',
    '..xlllx..',
    'xxlllllxx',
    '..xlllx..',
    '...xlx...',
    '....x....',
    '....x....',
  ],
};

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

/** One 9x9 icon per element, in the texture 'elements' (frame = spell id). */
function makeElementIcons(scene: Phaser.Scene): void {
  const ids = SPELLS.map((s) => s.id);
  const tex = scene.textures.createCanvas('elements', 9 * ids.length, 9)!;
  const ctx = tex.getContext();
  SPELLS.forEach((spell, i) => {
    const colors: Record<string, string> = { x: hex(spell.color), l: hex(spell.light) };
    ELEMENT_ICONS[spell.id].forEach((row, y) => {
      if (row.length !== 9) console.warn(`Icon row has wrong length: "${row}"`);
      for (let x = 0; x < row.length; x++) {
        const color = colors[row[x]];
        if (color) rect(ctx, i * 9 + x, y, 1, 1, color);
      }
    });
    tex.add(spell.id, 0, i * 9, 0, 9, 9);
  });
  tex.refresh();
}

function makeMagicObjects(scene: Phaser.Scene): void {
  // projectile (white, tinted in game)
  let tex = scene.textures.createCanvas('orb', 8, 8)!;
  let ctx = tex.getContext();
  disc(ctx, 4, 4, 4, 4, '#c8c8c8');
  disc(ctx, 4, 4, 2.5, 2.5, '#ffffff');
  tex.refresh();

  // earth spike
  tex = scene.textures.createCanvas('spike', 8, 12)!;
  ctx = tex.getContext();
  for (let y = 0; y < 12; y++) {
    const half = Math.floor(y / 3);
    rect(ctx, 4 - half - 1, y, half * 2 + 2, 1, '#8a6a40');
    rect(ctx, 4 - half - 1, y, 1 + Math.floor(half / 2), 1, '#c8a878');
  }
  tex.refresh();

  // stone pedestal that holds an element to learn
  tex = scene.textures.createCanvas('pedestal', 14, 10)!;
  ctx = tex.getContext();
  disc(ctx, 7, 7, 7, 3, '#5d5e70');
  rect(ctx, 3, 3, 8, 5, '#77788a');
  disc(ctx, 7, 3, 5, 2, '#9a9bab');
  rect(ctx, 5, 2, 3, 1, '#bfc0cc');
  tex.refresh();
}

// ------------------------------------------------------------------ all

export function createAllTextures(scene: Phaser.Scene): void {
  makeTiles(scene);
  makeTree(scene);
  makeBush(scene);
  makeRock(scene);
  makeHouse(scene, 'house_red', '#b84a3c', '#8c3229');
  makeHouse(scene, 'house_blue', '#4a6fb8', '#34508c');
  makeHouse(scene, 'house_green', '#4f9a5a', '#39733f');
  makeWell(scene);
  makeFences(scene);
  makeSign(scene);
  makeSlime(scene);
  makeSlash(scene);
  makeSpark(scene);
  makeHearts(scene);
  makeElementIcons(scene);
  makeMagicObjects(scene);

  const skin = '#f2c9a0';
  makeCharacter(scene, 'player', {
    hair: '#6b4226', skin, tunic: '#3f7fbf', tunicDark: '#2f5f93', pants: '#5a4632',
  });
  makeCharacter(scene, 'npc_mother', {
    hair: '#a0522d', skin, tunic: '#b84a62', tunicDark: '#8c3349', pants: '#8c3349',
  }, true);
  makeCharacter(scene, 'npc_father', {
    hair: '#3b2a1a', skin: '#e0b088', tunic: '#4a7a3a', tunicDark: '#365a2a', pants: '#4a3a2a',
  }, true);
  makeCharacter(scene, 'npc_elder', {
    hair: '#cfcfd6', skin, tunic: '#6a4a8a', tunicDark: '#4d3566', pants: '#4d3566',
  }, true);
  makeCharacter(scene, 'npc_villager', {
    hair: '#e0b040', skin, tunic: '#c9853a', tunicDark: '#9c6428', pants: '#5a4632',
  }, true);

  // the hero at later life stages (taller sprite)
  makeCharacter(scene, 'player_teen', {
    hair: '#6b4226', skin, tunic: '#3f7fbf', tunicDark: '#2f5f93', pants: '#5a4632',
  }, true);
  makeCharacter(scene, 'player_adult', {
    hair: '#6b4226', skin, tunic: '#2f5f93', tunicDark: '#234a73', pants: '#3a3340',
  }, true);
  makeCharacter(scene, 'player_master', {
    hair: '#8a8a94', skin, tunic: '#e8e0d0', tunicDark: '#c9a64a', pants: '#3a3340',
  }, true);

  for (const key of ['player', 'player_teen', 'player_adult', 'player_master']) {
    makeCharacterAnims(scene, key);
  }
}
