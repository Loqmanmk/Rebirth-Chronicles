import Phaser from 'phaser';
import { TILE, Tile } from '../art/textures';
import { Player } from '../entities/Player';
import { Slime } from '../entities/Slime';
import { SpellCaster, type HitOptions } from '../magic/SpellCaster';
import { SPELL_BY_ID, type SpellDef, type SpellId } from '../magic/spells';
import { MAP_H, MAP_W, buildVillage } from '../world/villageMap';

const ZOOM = 3;
const SLIME_TOUCH_DAMAGE = 1;
const SWORD_DAMAGE = 1;

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
      this.game.events.emit(
        'toast',
        `You learned ${spell.name}!  (${spell.element} magic)\n${spell.description}`,
      );
    }
  }

  private hitSlime(slime: Slime, damage: number, fromX: number, fromY: number, opts?: HitOptions): void {
    const killed = slime.takeHit(damage, fromX, fromY, opts);
    this.hitSparks.explode(5, slime.x, slime.y);
    if (killed) this.gooSparks.explode(12, slime.x, slime.y);
  }

  /** Damage every slime touched by the current sword swing (once per swing). */
  private resolveSwordHits(): void {
    const hitbox = this.player.attackHitbox;
    if (!hitbox) return;
    for (const slime of this.slimes) {
      if (!slime.alive || slime.lastHitId === this.player.attackId) continue;
      if (!Phaser.Geom.Rectangle.Overlaps(hitbox, slime.getBounds())) continue;

      slime.lastHitId = this.player.attackId;
      this.hitSlime(slime, SWORD_DAMAGE, this.player.x, this.player.y);
    }
  }

  /** Fainting is not the end: you wake up at home with full health. */
  private onPlayerDied(): void {
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
