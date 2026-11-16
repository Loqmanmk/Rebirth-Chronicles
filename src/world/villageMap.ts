import { TILE, Tile, makeRng } from '../art/textures';
import type { SpellId } from '../magic/spells';

/**
 * Willowbrook Village — the player's birthplace in the Lunaris Kingdom.
 * The map is built in code: a grid of ground tiles + a list of objects.
 */

export const MAP_W = 64;
export const MAP_H = 44;

export interface MapObject {
  /** texture key */
  key: string;
  /** pixel position of the bottom-centre of the object */
  x: number;
  y: number;
  /** collision box (pixels, relative to x / y = bottom-centre). Omit = walk-through. */
  solid?: { w: number; h: number; offsetY?: number };
}

export interface VillageMap {
  ground: number[][];
  objects: MapObject[];
  spawn: { x: number; y: number };
  /** where wild slimes live */
  slimeSpawns: { x: number; y: number }[];
  /** pedestals where the player learns a spell */
  shrines: { spell: SpellId; x: number; y: number }[];
}

const isGrass = (t: number) =>
  t === Tile.GRASS || t === Tile.GRASS_TUFT || t === Tile.GRASS_FLOWER;

export function buildVillage(): VillageMap {
  const rng = makeRng(2029);
  const objects: MapObject[] = [];

  // --- ground: grass everywhere, with a few variants
  const ground: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      const r = rng();
      row.push(r < 0.12 ? Tile.GRASS_TUFT : r < 0.17 ? Tile.GRASS_FLOWER : Tile.GRASS);
    }
    ground.push(row);
  }

  /** tiles where nothing random (trees, rocks) may be placed */
  const reserved: boolean[][] = ground.map((row) => row.map(() => false));

  const fill = (x0: number, y0: number, x1: number, y1: number, tile: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ground[y][x] = tile;
  };
  const reserve = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.max(0, y0); y <= Math.min(MAP_H - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(MAP_W - 1, x1); x++) reserved[y][x] = true;
  };
  /** bottom-centre pixel of a tile */
  const at = (tx: number, ty: number) => ({ x: tx * TILE + TILE / 2, y: (ty + 1) * TILE });

  // --- roads and plaza
  fill(0, 22, MAP_W - 1, 23, Tile.PATH); // main road, west <-> east
  fill(30, 8, 31, 36, Tile.PATH); // north <-> south road
  fill(26, 19, 35, 26, Tile.PATH); // village plaza

  // --- houses (4x4 tiles each). Door is at the bottom-centre.
  const house = (tx: number, ty: number, key: string) => {
    objects.push({
      key,
      x: (tx + 2) * TILE,
      y: (ty + 4) * TILE,
      solid: { w: 56, h: 36 },
    });
    reserve(tx - 1, ty - 1, tx + 4, ty + 5);
  };

  house(11, 9, 'house_red'); // the player's home
  fill(12, 13, 13, 21, Tile.PATH);

  house(38, 10, 'house_blue');
  fill(39, 14, 40, 21, Tile.PATH);

  house(20, 28, 'house_green');
  fill(21, 32, 22, 34, Tile.PATH);
  fill(21, 33, 29, 34, Tile.PATH);

  house(42, 28, 'house_red');
  fill(43, 32, 44, 34, Tile.PATH);
  fill(32, 33, 44, 34, Tile.PATH);

  // --- pond
  const pond = { cx: 50.5, cy: 15.5, rx: 6.2, ry: 3.6 };
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const dx = (x + 0.5 - pond.cx) / pond.rx;
      const dy = (y + 0.5 - pond.cy) / pond.ry;
      if (dx * dx + dy * dy <= 1) ground[y][x] = Tile.WATER;
    }
  }
  reserve(43, 10, 58, 20);

  // --- family garden next to the home, with a fence
  fill(18, 10, 22, 12, Tile.SOIL);
  for (let x = 17; x <= 23; x++) {
    objects.push({ key: 'fence_h', ...at(x, 9), solid: { w: 16, h: 5 } });
    if (x !== 20) objects.push({ key: 'fence_h', ...at(x, 13), solid: { w: 16, h: 5 } });
  }
  for (let y = 10; y <= 13; y++) {
    objects.push({ key: 'fence_v', ...at(17, y), solid: { w: 4, h: 16 } });
    objects.push({ key: 'fence_v', ...at(23, y), solid: { w: 4, h: 16 } });
  }
  reserve(16, 8, 24, 15);

  // --- plaza well and signposts
  objects.push({ key: 'well', x: 31 * TILE, y: 23 * TILE + 6, solid: { w: 24, h: 12 } });
  objects.push({ key: 'sign', ...at(60, 21), solid: { w: 6, h: 4 } });
  objects.push({ key: 'sign', ...at(3, 21), solid: { w: 6, h: 4 } });
  objects.push({ key: 'sign', ...at(29, 8), solid: { w: 6, h: 4 } });
  reserve(59, 20, 61, 21);
  reserve(2, 20, 4, 21);
  reserve(28, 6, 33, 9);

  // --- villagers (they will get dialogue in a later step)
  const npc = (key: string, tx: number, ty: number) => {
    objects.push({ key, ...at(tx, ty), solid: { w: 10, h: 6 } });
    reserve(tx - 1, ty - 1, tx + 1, ty + 1);
  };
  npc('npc_mother', 15, 14);
  npc('npc_father', 20, 11);
  npc('npc_elder', 33, 20);
  npc('npc_villager', 41, 24);

  // --- element shrines: touch one to learn its spell
  const shrines: VillageMap['shrines'] = [];
  const shrine = (spell: SpellId, tx: number, ty: number) => {
    shrines.push({ spell, ...at(tx, ty) });
    reserve(tx - 1, ty - 2, tx + 1, ty + 1);
  };
  shrine('fire', 15, 17); // just outside your home
  shrine('water', 50, 20); // south shore of the pond
  shrine('wind', 31, 6); // end of the north road
  shrine('earth', 11, 33); // deep in the south-west meadow
  shrine('spirit', 53, 33); // deep in the south-east meadow

  const spawn = { x: 13 * TILE, y: 15 * TILE };
  reserve(10, 13, 16, 17);

  // --- trees: a thick forest border + scattered trees inside
  /** a tree needs grass under and around it so it never covers a road */
  const clearForTree = (tx: number, ty: number) => {
    for (let y = ty - 2; y <= ty; y++) {
      for (let x = tx - 1; x <= tx + 1; x++) {
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        if (!isGrass(ground[y][x]) || reserved[y][x]) return false;
      }
    }
    return true;
  };
  const tree = (tx: number, ty: number) => {
    const p = at(tx, ty);
    objects.push({
      key: 'tree',
      x: p.x + Math.floor(rng() * 5) - 2,
      y: p.y - Math.floor(rng() * 4),
      solid: { w: 10, h: 6 },
    });
  };

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const border = tx < 4 || ty < 4 || tx >= MAP_W - 4 || ty >= MAP_H - 3;
      if (border) {
        if (tx % 2 === 0 && ty % 2 === 0 && clearForTree(tx, ty)) tree(tx, ty);
        continue;
      }
      if (!isGrass(ground[ty][tx]) || reserved[ty][tx]) continue;
      const r = rng();
      if (r < 0.045 && clearForTree(tx, ty)) {
        tree(tx, ty);
        reserve(tx - 1, ty - 1, tx + 1, ty + 1);
      } else if (r < 0.06) {
        objects.push({ key: 'bush', ...at(tx, ty), solid: { w: 12, h: 5 } });
        reserved[ty][tx] = true;
      } else if (r < 0.07) {
        objects.push({ key: 'rock', ...at(tx, ty), solid: { w: 12, h: 5 } });
        reserved[ty][tx] = true;
      }
    }
  }

  // --- wild slimes live in the meadows south of the main road
  const slimeSpawns: { x: number; y: number }[] = [];
  const slimeZone = (x0: number, y0: number, x1: number, y1: number, count: number) => {
    for (let tries = 0; tries < 200 && count > 0; tries++) {
      const tx = x0 + Math.floor(rng() * (x1 - x0 + 1));
      const ty = y0 + Math.floor(rng() * (y1 - y0 + 1));
      if (!isGrass(ground[ty][tx]) || reserved[ty][tx]) continue;
      slimeSpawns.push({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
      reserve(tx - 1, ty - 1, tx + 1, ty + 1);
      count--;
    }
  };
  slimeZone(6, 27, 17, 38, 5); // south-west meadow
  slimeZone(48, 27, 58, 38, 4); // south-east meadow

  return { ground, objects, spawn, slimeSpawns, shrines };
}
