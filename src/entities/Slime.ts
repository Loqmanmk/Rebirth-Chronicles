import Phaser from 'phaser';
import type { Player } from './Player';

const MAX_HP = 3;
const WANDER_SPEED = 16;
const CHASE_SPEED = 36;
const SIGHT_RANGE = 75; // starts chasing when the player is this close (pixels)
const LEASH_RANGE = 130; // gives up when the player is this far from the slime's home
const STUN_TIME = 220;
const KNOCKBACK_SPEED = 130;
const RESPAWN_TIME = 25000;

type Mode = 'wander' | 'dead';

/** First enemy of the game: slow, weak, hurts on touch. */
export class Slime extends Phaser.Physics.Arcade.Sprite {
  hp = MAX_HP;
  /** id of the last player swing that hit this slime */
  lastHitId = -1;

  private mode: Mode = 'wander';
  private home: Phaser.Math.Vector2;
  private wanderTimer = 0;
  private wanderDir = new Phaser.Math.Vector2();
  private stunUntil = 0;
  private slowUntil = 0;
  private barBack: Phaser.GameObjects.Rectangle;
  private barFill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'slime', 'a');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.home = new Phaser.Math.Vector2(x, y);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 8).setOffset(2, 4);
    body.setCollideWorldBounds(true);

    this.play({ key: 'slime-idle', startFrame: Math.random() < 0.5 ? 0 : 1 });

    this.barBack = scene.add.rectangle(x, y, 14, 3, 0x1a1420).setVisible(false);
    this.barFill = scene.add.rectangle(x, y, 12, 1, 0xe0404a).setOrigin(0, 0.5).setVisible(false);
  }

  get alive(): boolean {
    return this.mode !== 'dead';
  }

  /** True when touching this slime should hurt the player. */
  get dangerous(): boolean {
    return this.alive && this.scene.time.now >= this.stunUntil;
  }

  tick(delta: number, player: Player): void {
    if (!this.alive) return;
    const now = this.scene.time.now;

    this.setDepth(this.y + 6);
    this.updateBar();

    if (this.slowUntil !== 0 && now >= this.slowUntil) {
      this.slowUntil = 0;
      this.refreshTint();
    }
    if (now < this.stunUntil) return; // flying back after a hit
    const slow = now < this.slowUntil ? 0.4 : 1;

    const toPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const playerFromHome = Phaser.Math.Distance.Between(this.home.x, this.home.y, player.x, player.y);

    if (!player.dead && !player.busy && toPlayer < SIGHT_RANGE && playerFromHome < LEASH_RANGE) {
      // chase, moving in little hops
      const hop = 0.35 + 0.65 * Math.abs(Math.sin(now / 170));
      this.scene.physics.moveToObject(this, player, CHASE_SPEED * hop * slow);
      return;
    }

    this.wanderTimer -= delta;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = Phaser.Math.Between(800, 2200);
      const fromHome = Phaser.Math.Distance.Between(this.x, this.y, this.home.x, this.home.y);
      if (fromHome > 40) {
        this.wanderDir.set(this.home.x - this.x, this.home.y - this.y).normalize();
      } else if (Math.random() < 0.4) {
        this.wanderDir.set(0, 0);
      } else {
        this.wanderDir.setToPolar(Math.random() * Math.PI * 2, 1);
      }
    }
    const speed = WANDER_SPEED * slow;
    this.setVelocity(this.wanderDir.x * speed, this.wanderDir.y * speed);
  }

  /** Move slowly for a while (water magic). */
  slow(duration: number): void {
    if (!this.alive) return;
    this.slowUntil = this.scene.time.now + duration;
    this.refreshTint();
  }

  private refreshTint(): void {
    if (this.alive && this.scene.time.now < this.slowUntil) this.setTint(0x80b8ff);
    else this.clearTint();
  }

  /** Returns true if this hit killed the slime. */
  takeHit(
    damage: number,
    fromX: number,
    fromY: number,
    opts: { knockback?: number; stun?: number } = {},
  ): boolean {
    if (!this.alive) return false;
    this.hp -= damage;

    const push = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY);
    if (push.lengthSq() === 0) push.set(0, -1);
    push.normalize().scale(opts.knockback ?? KNOCKBACK_SPEED);
    this.setVelocity(push.x, push.y);
    this.stunUntil = this.scene.time.now + (opts.stun ?? STUN_TIME);

    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.refreshTint());

    if (this.hp > 0) return false;
    this.die();
    return true;
  }

  private die(): void {
    this.mode = 'dead';
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.barBack.setVisible(false);
    this.barFill.setVisible(false);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 0.3,
      duration: 260,
      onComplete: () => this.setVisible(false),
    });
    this.scene.time.delayedCall(RESPAWN_TIME, () => this.respawn());
  }

  /** Come back to life at home (also used when the player faints). */
  respawn(): void {
    this.mode = 'wander';
    this.hp = MAX_HP;
    this.lastHitId = -1;
    this.stunUntil = 0;
    this.slowUntil = 0;
    this.wanderTimer = 0;
    this.scene.tweens.killTweensOf(this);
    this.clearTint();
    this.setPosition(this.home.x, this.home.y);
    this.setVisible(true).setAlpha(1).setScale(1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(this.home.x, this.home.y);
    this.updateBar();
  }

  private updateBar(): void {
    const show = this.alive && this.hp < MAX_HP;
    this.barBack.setVisible(show);
    this.barFill.setVisible(show);
    if (!show) return;
    this.barBack.setPosition(this.x, this.y - 9).setDepth(this.depth + 1);
    this.barFill.setPosition(this.x - 6, this.y - 9).setDepth(this.depth + 2);
    this.barFill.width = 12 * (this.hp / MAX_HP);
  }
}
