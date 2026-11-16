import Phaser from 'phaser';
import { TILE, Tile } from '../art/textures';
import { Player } from '../entities/Player';
import { Slime } from '../entities/Slime';
import { SpellCaster, type HitOptions } from '../magic/SpellCaster';
import { memory } from '../story/memory';
import { SPELL_BY_ID, type SpellDef, type SpellId } from '../magic/spells';
import { MAP_H, MAP_W, buildVillage } from '../world/villageMap';

const ZOOM = 3;
const SLIME_TOUCH_DAMAGE = 1;
const SLIME_XP = 5;
const SHRINE_XP = 10;
const TALK_RANGE = 24;

interface Npc {
  id: string;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
}

interface Shrine {
  spell: SpellId;
  x: number;
  y: number;
  icon: Phaser.GameObjects.Image;
}

export class VillageScene extends Phaser.Scene {
  private player!: Player;
  private slimes: Slime[] = [];
  private spawn = { x: 0, y: 0 };
  private hitSparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private gooSparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private shrines: Shrine[] = [];
  private levelSparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private npcs: Npc[] = [];
  private talkPrompt!: Phaser.GameObjects.Text;
  private talkKey!: Phaser.Input.Keyboard.Key;
  private nextTalkAt = 0;

  constructor() {
    super('Village');
  }

  create(): void {
    const village = buildVillage();
    const worldW = MAP_W * TILE;
    const worldH = MAP_H * TILE;
    this.spawn = village.spawn;

    // --- ground
    const map = this.make.tilemap({ data: village.ground, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    const ground = map.createLayer(0, tileset, 0, 0)!;
    ground.setDepth(-10);
    ground.setCollision([Tile.WATER]);

    // --- objects (trees, houses, villagers...) with their collision boxes
    const solids = this.physics.add.staticGroup();
    for (const obj of village.objects) {
      this.add.image(obj.x, obj.y, obj.key).setOrigin(0.5, 1).setDepth(obj.y);
      if (obj.solid) {
        const { w, h, offsetY = 0 } = obj.solid;
        const zone = this.add.zone(obj.x, obj.y - h / 2 + offsetY, w, h);
        this.physics.add.existing(zone, true);
        solids.add(zone);
      }
    }

    // --- villagers
    this.npcs = village.npcs.map(({ id, key, x, y }) => {
      const sprite = this.add.image(x, y, key, 'down0').setOrigin(0.5, 1).setDepth(y);
      const zone = this.add.zone(x, y - 3, 10, 6);
      this.physics.add.existing(zone, true);
      solids.add(zone);
      return { id, x, y, sprite };
    });
    this.talkPrompt = this.add
      .text(0, 0, 'E', {
        fontFamily: 'Georgia, serif',
        fontSize: '8px',
        color: '#1a1420',
        backgroundColor: '#ffd860',
        padding: { x: 2, y: 0 },
      })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(6000)
      .setVisible(false);
    this.talkKey = this.input.keyboard!.addKey('E');

    // conversations run in the UI scene and tell us what happened
    const ev = this.game.events;
    const onClose = () => {
      this.player.busy = false;
      this.nextTalkAt = this.time.now + 300;
    };
    const onXp = (amount: number) => this.giveXp(amount, this.player.x, this.player.y - 8);
    const onHeal = () => {
      this.player.heal(99);
      this.levelSparks.explode(10, this.player.x, this.player.y);
    };
    ev.on('dialogue-close', onClose);
    ev.on('story-xp', onXp);
    ev.on('story-heal', onHeal);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      ev.off('dialogue-close', onClose);
      ev.off('story-xp', onXp);
      ev.off('story-heal', onHeal);
    });

    // --- player
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.player = new Player(this, this.spawn.x, this.spawn.y);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, solids);
    this.player.on('died', () => this.onPlayerDied());

    // --- enemies
    this.slimes = village.slimeSpawns.map((p) => new Slime(this, p.x, p.y));
    this.physics.add.collider(this.slimes, ground);
    this.physics.add.collider(this.slimes, solids);
    this.physics.add.collider(this.slimes, this.slimes);
    this.physics.add.overlap(this.player, this.slimes, (_player, obj) => {
      const slime = obj as Slime;
      if (slime.dangerous) this.player.hurt(SLIME_TOUCH_DAMAGE, slime.x, slime.y);
    });

    // --- hit effects
    const burst = (tint: number) =>
      this.add
        .particles(0, 0, 'spark', {
          speed: { min: 25, max: 70 },
          lifespan: 320,
          scale: { start: 1, end: 0 },
          tint,
          emitting: false,
        })
        .setDepth(5000);
    this.hitSparks = burst(0xffffff);
    this.gooSparks = burst(0x4fc878);
    this.levelSparks = burst(0xffe680);
    this.player.on('levelup', (level: number, stageChanged: boolean) =>
      this.onLevelUp(level, stageChanged),
    );

    // --- magic
    const caster = new SpellCaster(this, this.player, this.slimes, solids, (slime, dmg, x, y, opts) =>
      this.hitSlime(slime, dmg, x, y, opts),
    );
    this.player.on('cast', (spell: SpellDef) => caster.cast(spell));

    this.shrines = village.shrines.map(({ spell, x, y }) => {
      this.add.image(x, y, 'pedestal').setOrigin(0.5, 1).setDepth(y - 6);
      const icon = this.add.image(x, y - 16, 'elements', spell).setDepth(y + 20);
      this.tweens.add({
        targets: icon,
        y: icon.y - 3,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      return { spell, x, y, icon };
    });

    // --- camera
    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.fadeIn(900, 0, 0, 0);

    this.scene.launch('UI', { location: 'Willowbrook Village', region: 'Lunaris Kingdom' });
  }

  update(_time: number, delta: number): void {
    this.player.update(delta);
    for (const slime of this.slimes) slime.tick(delta, this.player);
    this.resolveSwordHits();
    this.checkShrines();
    this.checkTalk();
  }

  /** Show the E prompt near a villager and start a conversation on E. */
  private checkTalk(): void {
    const p = this.player;
    let near: Npc | null = null;
    let best = TALK_RANGE;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(p.x, p.y + 6, npc.x, npc.y - 4);
      if (d < best) {
        best = d;
        near = npc;
      }
    }

    const pressed = Phaser.Input.Keyboard.JustDown(this.talkKey);
    const canTalk = near !== null && !p.busy && !p.dead && this.time.now >= this.nextTalkAt;
    this.talkPrompt.setVisible(canTalk);
    if (!near || !canTalk) return;
    this.talkPrompt.setPosition(near.x, near.y - 20);
    if (!pressed) return;

    // the villager turns to look at you
    const dx = p.x - near.x;
    const dy = p.y + 6 - near.y;
    if (Math.abs(dx) > Math.abs(dy)) near.sprite.setFrame('side0').setFlipX(dx < 0);
    else near.sprite.setFrame(dy < 0 ? 'up0' : 'down0').setFlipX(false);

    p.busy = true;
    this.game.events.emit('dialogue-start', near.id);
  }

  /** Walking onto a shrine teaches its spell. */
  private checkShrines(): void {
    for (const shrine of this.shrines) {
      if (this.player.known.has(shrine.spell)) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y + 6, shrine.x, shrine.y - 4);
      if (d > 11) continue;

      this.player.learn(shrine.spell);
      const spell = SPELL_BY_ID[shrine.spell];
      this.tweens.killTweensOf(shrine.icon);
      this.tweens.add({
        targets: shrine.icon,
        y: shrine.icon.y - 14,
        alpha: 0,
        scale: 2,
        duration: 600,
        onComplete: () => shrine.icon.destroy(),
      });
      this.hitSparks.explode(14, shrine.x, shrine.y - 12);
      this.giveXp(SHRINE_XP, shrine.x, shrine.y - 20);
      this.game.events.emit(
        'toast',
        `You learned ${spell.name}!  (${spell.element} magic)\n${spell.description}`,
      );
    }
  }

  private hitSlime(slime: Slime, damage: number, fromX: number, fromY: number, opts?: HitOptions): void {
    const killed = slime.takeHit(damage, fromX, fromY, opts);
    this.hitSparks.explode(5, slime.x, slime.y);
    if (killed) {
      this.gooSparks.explode(12, slime.x, slime.y);
      memory.counters.slimesKilled++;
      this.giveXp(SLIME_XP, slime.x, slime.y);
    }
  }

  /** Give XP to the player and show a small floating number. */
  private giveXp(amount: number, x: number, y: number): void {
    const label = this.add
      .text(x, y - 8, '+' + amount + ' XP', {
        fontFamily: 'Georgia, serif',
        fontSize: '8px',
        color: '#ffe680',
        stroke: '#1a1420',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(6000);
    this.tweens.add({
      targets: label,
      y: label.y - 14,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy(),
    });
    this.player.gainXp(amount);
  }

  private onLevelUp(level: number, stageChanged: boolean): void {
    const p = this.player;
    this.levelSparks.explode(24, p.x, p.y);
    this.cameras.main.flash(250, 255, 240, 180);
    const lines = ['Level ' + level + '!   You are now ' + this.registry.get('age') + ' years old.'];
    if (stageChanged) lines.push('A new stage of life begins: ' + p.stage + '.');
    this.game.events.emit('toast', lines.join(String.fromCharCode(10)));
  }

  /** Damage every slime touched by the current sword swing (once per swing). */
  private resolveSwordHits(): void {
    const hitbox = this.player.attackHitbox;
    if (!hitbox) return;
    for (const slime of this.slimes) {
      if (!slime.alive || slime.lastHitId === this.player.attackId) continue;
      if (!Phaser.Geom.Rectangle.Overlaps(hitbox, slime.getBounds())) continue;

      slime.lastHitId = this.player.attackId;
      this.hitSlime(slime, this.player.stats.strength, this.player.x, this.player.y);
    }
  }

  /** Fainting is not the end: you wake up at home with full health. */
  private onPlayerDied(): void {
    memory.counters.fainted++;
    const cam = this.cameras.main;
    cam.fadeOut(900, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.player.revive(this.spawn.x, this.spawn.y);
      for (const slime of this.slimes) if (slime.alive) slime.respawn();
      cam.fadeIn(900, 0, 0, 0);
      this.game.events.emit('toast', 'You fainted... Mother carried you home.');
    });
  }
}
