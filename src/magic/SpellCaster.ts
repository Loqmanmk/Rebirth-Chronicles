import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Slime } from '../entities/Slime';
import type { SpellDef } from './spells';

export interface HitOptions {
  knockback?: number;
  stun?: number;
}

/** The scene decides what "hitting a slime" means (damage, sparks...). */
type HitFn = (slime: Slime, damage: number, fromX: number, fromY: number, opts?: HitOptions) => void;

const PROJECTILE_SPEED = 170;
const PROJECTILE_LIFE = 750;

/** Creates the effect of each spell in the world. */
export class SpellCaster {
  private projectiles: Phaser.Physics.Arcade.Group;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private slimes: Slime[],
    solids: Phaser.Physics.Arcade.StaticGroup,
    private hit: HitFn,
  ) {
    this.projectiles = scene.physics.add.group();
    this.sparks = scene.add
      .particles(0, 0, 'spark', {
        speed: { min: 20, max: 80 },
        lifespan: 380,
        scale: { start: 1.2, end: 0 },
        emitting: false,
      })
      .setDepth(5000);

    scene.physics.add.overlap(this.projectiles, slimes, (a, b) => {
      // Phaser may give the two objects in either order
      const [orb, slime] = (a as Slime).takeHit ? [b, a] : [a, b];
      this.onProjectileHit(orb as Phaser.Physics.Arcade.Image, slime as Slime);
    });
    scene.physics.add.collider(this.projectiles, solids, (a, b) => {
      const orb = this.projectiles.contains(a as Phaser.GameObjects.GameObject) ? a : b;
      this.popProjectile(orb as Phaser.Physics.Arcade.Image);
    });
  }

  cast(spell: SpellDef): void {
    switch (spell.id) {
      case 'fire':
      case 'water':
        this.shoot(spell);
        break;
      case 'wind':
        this.gust(spell);
        break;
      case 'earth':
        this.spikes(spell);
        break;
      case 'spirit':
        this.mend(spell);
        break;
    }
  }

  private burst(x: number, y: number, color: number, count: number): void {
    this.sparks.setParticleTint(color);
    this.sparks.explode(count, x, y);
  }

  // ------------------------------------------------- fire / water: projectile

  private shoot(spell: SpellDef): void {
    const dir = this.player.facingDir;
    const orb = this.projectiles.create(
      this.player.x + dir.x * 8,
      this.player.y + 2 + dir.y * 8,
      'orb',
    ) as Phaser.Physics.Arcade.Image;
    orb.setTint(spell.color).setDepth(4000).setData('spell', spell);
    (orb.body as Phaser.Physics.Arcade.Body).setCircle(3, 1, 1);
    orb.setVelocity(dir.x * PROJECTILE_SPEED, dir.y * PROJECTILE_SPEED);

    const trail = this.scene.add
      .particles(0, 0, 'spark', {
        follow: orb,
        speed: 8,
        lifespan: 260,
        frequency: 30,
        scale: { start: 1, end: 0 },
        tint: spell.light,
      })
      .setDepth(3999);
    orb.once(Phaser.GameObjects.Events.DESTROY, () => {
      trail.stop();
      this.scene.time.delayedCall(300, () => trail.destroy());
    });

    this.scene.time.delayedCall(PROJECTILE_LIFE, () => this.popProjectile(orb));
  }

  private onProjectileHit(orb: Phaser.Physics.Arcade.Image, slime: Slime): void {
    if (!orb.active || !slime.alive) return;
    const spell = orb.getData('spell') as SpellDef;
    if (spell.id === 'fire') {
      this.hit(slime, 2, orb.x, orb.y);
    } else {
      this.hit(slime, 1, orb.x, orb.y, { knockback: 60 });
      slime.slow(3500);
    }
    this.popProjectile(orb);
  }

  private popProjectile(orb: Phaser.Physics.Arcade.Image): void {
    if (!orb.active) return;
    const spell = orb.getData('spell') as SpellDef;
    this.burst(orb.x, orb.y, spell.color, 8);
    orb.destroy();
  }

  // ------------------------------------------------------ wind: push in front

  private gust(spell: SpellDef): void {
    const dir = this.player.facingDir;
    const px = this.player.x;
    const py = this.player.y + 2;

    // area in front of the player: 52 long, 40 wide
    const cx = px + dir.x * 30;
    const cy = py + dir.y * 30;
    const w = dir.x !== 0 ? 52 : 40;
    const h = dir.x !== 0 ? 40 : 52;
    const area = new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);

    for (const slime of this.slimes) {
      if (slime.alive && Phaser.Geom.Rectangle.Overlaps(area, slime.getBounds())) {
        this.hit(slime, 1, px, py, { knockback: 330, stun: 420 });
      }
    }

    for (let i = 0; i < 3; i++) {
      const side = (i - 1) * 9;
      const wave = this.scene.add
        .image(px + dir.x * 8 - dir.y * side, py + dir.y * 8 + dir.x * side, 'slash')
        .setAngle(dir.angle)
        .setTint(i === 1 ? spell.light : spell.color)
        .setAlpha(0.9)
        .setDepth(4000);
      this.scene.tweens.add({
        targets: wave,
        x: wave.x + dir.x * 46,
        y: wave.y + dir.y * 46,
        alpha: 0,
        scale: 1.6,
        duration: 300,
        delay: i === 1 ? 0 : 50,
        onComplete: () => wave.destroy(),
      });
    }
  }

  // --------------------------------------------------- earth: ring of spikes

  private spikes(spell: SpellDef): void {
    const px = this.player.x;
    const py = this.player.y + 4;
    const radius = 32;

    for (const slime of this.slimes) {
      if (slime.alive && Phaser.Math.Distance.Between(px, py, slime.x, slime.y) <= radius + 6) {
        this.hit(slime, 2, px, py, { knockback: 170, stun: 750 });
      }
    }

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = px + Math.cos(angle) * (radius - 8);
      const y = py + Math.sin(angle) * (radius - 8) * 0.75;
      const spike = this.scene.add.image(x, y + 6, 'spike').setOrigin(0.5, 1).setDepth(y + 6);
      spike.setScale(1, 0);
      this.scene.tweens.add({
        targets: spike,
        scaleY: 1.3,
        duration: 110,
        hold: 260,
        yoyo: true,
        onComplete: () => spike.destroy(),
      });
    }
    this.burst(px, py, spell.light, 14);
    this.scene.cameras.main.shake(140, 0.005);
  }

  // ------------------------------------------------------------ spirit: heal

  private mend(spell: SpellDef): void {
    this.player.heal(2);
    this.player.setTint(spell.color);
    this.scene.time.delayedCall(220, () => this.player.clearTint());

    const glow = this.scene.add
      .particles(0, 0, 'spark', {
        follow: this.player,
        x: { min: -8, max: 8 },
        y: { min: -2, max: 8 },
        speedY: { min: -40, max: -15 },
        lifespan: 600,
        frequency: 25,
        scale: { start: 1.2, end: 0 },
        tint: [spell.color, spell.light],
      })
      .setDepth(4500);
    this.scene.time.delayedCall(450, () => glow.stop());
    this.scene.time.delayedCall(1200, () => glow.destroy());
  }
}
