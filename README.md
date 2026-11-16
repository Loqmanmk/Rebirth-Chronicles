# Rebirth Chronicles

An original 2D action RPG about being reborn in the fantasy world of Aetheria
and growing up there: child, teen, adult, master.

Built with TypeScript + [Phaser 3](https://phaser.io) + Vite.

## Run the game

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Controls

- Move: arrow keys, WASD or ZQSD
- Run: hold Shift
- Attack: Space or J

## Roadmap

- [x] Step 1 — Project setup, movement, camera, first map (Willowbrook Village)
- [x] Step 2 — Combat: sword attack, slimes, health, fainting
- [ ] Step 3 — Magic: 5 elements, mana, spells
- [ ] Step 4 — XP, levels and life stages
- [ ] Step 5 — Dialogue with choices, NPC memory
- [ ] Step 6 — Save / load
- [ ] Step 7 — Chapter 1: Child (levels 1-5)
- [ ] Step 8 — Chapter 2: Teen (levels 6-10), academy, first dungeon
- [ ] Step 9 — Trial of Destiny and the 7 guilds
- [ ] Step 10 — New regions and the adult arc

## Project structure

```
src/
  main.ts              game config
  art/textures.ts      placeholder pixel art drawn in code
  world/villageMap.ts  the village map (ground + objects)
  entities/Player.ts   player movement, attack, health
  entities/Slime.ts    first enemy
  scenes/              Boot, Village, UI
```
