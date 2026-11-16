import Phaser from 'phaser';
import { SPELLS, SPELL_BY_ID, type SpellDef, type SpellId } from '../magic/spells';

export type Facing = 'down' | 'up' | 'left' | 'right';

const WALK_SPEED = 60;
const RUN_SPEED = 95;

const MAX_HP = 5;
const ATTACK_TIME = 180; // how long a swing lasts (ms)
const ATTACK_COOLDOWN = 340; // time between two swings (ms)
const INVULNERABLE_TIME = 1000; // safe time after being hit (ms)
const KNOCKBACK_TIME = 160;
const KNOCKBACK_SPEED = 150;

const MAX_MANA = 20;
const MANA_REGEN = 1.2; // mana per second
const CAST_TIME = 160; // stand still this long when casting (ms)
const SPELL_COOLDOWN = 450; // time between two spells (ms)
const NUMBER_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];

const DIRS: Record<Facing, { x: number; y: number; angle: number }> = {
  right: { x: 1, y: 0, angle: 0 },
  down: { x: 0, y: 1, angle: 90 },
  left: { x: -1, y: 0, angle: 180 },
  up: { x: 0, y: -1, angle: 270 },
};

/**
 * The reincarnated hero.
 * Controls: arrows, WASD (QWERTY) or ZQSD (AZERTY). Shift = run. Space or J = sword.
 * K or F = cast the selected spell. 1-5 or E = choose a spell.
 * Emits 'died' when health reaches 0 and 'cast' (with the spell) when a spell is cast.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  hp = MAX_HP;
  readonly maxHp = MAX_HP;
  dead = false;

  mana = MAX_MANA;
  readonly maxMana = MAX_MANA;
  /** spells the player has learned */
  readonly known = new Set<SpellId>();
  selected: SpellId | null = null;

  /** Area hit by the current swing, or null when not attacking. */
  attackHitbox: Phaser.Geom.Rectangle | null = null;
  /** Changes on every swing, so one swing can hit an enemy only once. */
  attackId = 0;

  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private facing: Facing = 'down';
  private attackUntil = 0;
  private nextAttackAt = 0;
  private knockUntil = 0;
  private invulnerableUntil = 0;
  private nextSpellAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player', 'down0');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Only the feet collide, so the head can overlap things behind the player.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(8, 5).setOffset(4, 11);
    body.setCollideWorldBounds(true);

    this.keys = scene.input.keyboard!.addKeys(
      'UP,DOWN,LEFT,RIGHT,W,A,S,D,Z,Q,SHIFT,SPACE,J,K,F,E,ONE,TWO,THREE,FOUR,FIVE',
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    this.publishHp();
    this.publishMagic();
  }

  /** Unit vector of the direction the player is looking at. */
  get facingDir(): { x: number; y: number; angle: number } {
    return DIRS[this.facing];
  }

  private get animDir(): string {
    return this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
  }

  update(delta: number): void {
    const now = this.scene.time.now;
    this.setDepth(this.y + 8); // lower on screen = drawn in front

    if (this.dead) return;

    this.mana = Math.min(this.maxMana, this.mana + (MANA_REGEN * delta) / 1000);
    this.scene.registry.set('mana', this.mana);

    // blink while invulnerable
    this.setAlpha(now < this.invulnerableUntil && Math.floor(now / 80) % 2 === 0 ? 0.35 : 1);

    if (now < this.knockUntil) return; // being pushed back, no control

    if (this.attackHitbox && now >= this.attackUntil) this.attackHitbox = null;

    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.J)) {
      this.tryAttack();
    }

    // choose a spell: number keys, or E for the next one
    NUMBER_KEYS.forEach((name, i) => {
      if (Phaser.Input.Keyboard.JustDown(k[name])) this.select(SPELLS[i].id);
    });
    if (Phaser.Input.Keyboard.JustDown(k.E)) this.selectNext();
    if (Phaser.Input.Keyboard.JustDown(k.K) || Phaser.Input.Keyboard.JustDown(k.F)) {
      this.tryCast();
    }

    if (now < this.attackUntil) {
      this.setVelocity(0, 0); // stand still while swinging
      return;
    }

    const left = k.LEFT.isDown || k.A.isDown || k.Q.isDown;
    const right = k.RIGHT.isDown || k.D.isDown;
    const up = k.UP.isDown || k.W.isDown || k.Z.isDown;
    const down = k.DOWN.isDown || k.S.isDown;

    const move = new Phaser.Math.Vector2(
      (right ? 1 : 0) - (left ? 1 : 0),
      (down ? 1 : 0) - (up ? 1 : 0),
    );

    if (move.lengthSq() === 0) {
      this.setVelocity(0, 0);
      this.anims.play(`player-idle-${this.animDir}`, true);
      return;
    }

    const running = k.SHIFT.isDown;
    move.normalize().scale(running ? RUN_SPEED : WALK_SPEED);
    this.setVelocity(move.x, move.y);

    if (move.x !== 0) this.facing = move.x < 0 ? 'left' : 'right';
    else this.facing = move.y < 0 ? 'up' : 'down';
    this.setFlipX(this.facing === 'left');

    this.anims.play(`player-walk-${this.animDir}`, true);
    this.anims.timeScale = running ? 1.5 : 1;
  }

  /** Swing the wooden sword in the direction the player is facing. */
  tryAttack(): boolean {
    const now = this.scene.time.now;
    if (this.dead || now < this.nextAttackAt || now < this.knockUntil) return false;

    this.attackUntil = now + ATTACK_TIME;
    this.nextAttackAt = now + ATTACK_COOLDOWN;
    this.attackId++;
    this.setVelocity(0, 0);
    this.anims.play(`player-idle-${this.animDir}`, true);

    const dir = DIRS[this.facing];
    const cx = this.x + dir.x * 12;
    const cy = this.y + 2 + dir.y * 12;
    const w = dir.x !== 0 ? 18 : 26;
    const h = dir.x !== 0 ? 26 : 18;
    this.attackHitbox = new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);

    const slash = this.scene.add
      .image(this.x + dir.x * 11, this.y + 2 + dir.y * 11, 'slash')
      .setAngle(dir.angle)
      .setDepth(this.y + 40);
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.3,
      duration: ATTACK_TIME,
      onComplete: () => slash.destroy(),
    });
    return true;
  }

  // ------------------------------------------------------------- magic

  /** Learn a new spell. Returns false if it was already known. */
  learn(id: SpellId): boolean {
    if (this.known.has(id)) return false;
    this.known.add(id);
    this.selected = id;
    this.publishMagic();
    return true;
  }

  select(id: SpellId): void {
    if (!this.known.has(id)) return;
    this.selected = id;
    this.publishMagic();
  }

  selectNext(): void {
    const known = SPELLS.filter((s) => this.known.has(s.id));
    if (known.length === 0) return;
    const i = known.findIndex((s) => s.id === this.selected);
    this.select(known[(i + 1) % known.length].id);
  }

  /** Cast the selected spell if possible. The scene creates the effect. */
  tryCast(): SpellDef | null {
    const now = this.scene.time.now;
    if (this.dead || !this.selected || now < this.nextSpellAt || now < this.knockUntil) return null;
    if (now < this.attackUntil) return null;

    const spell = SPELL_BY_ID[this.selected];
    if (this.mana < spell.cost) {
      this.scene.game.events.emit('mana-fail');
      return null;
    }
    if (spell.id === 'spirit' && this.hp >= this.maxHp) {
      this.scene.game.events.emit('toast', 'You are not hurt.');
      this.nextSpellAt = now + SPELL_COOLDOWN;
      return null;
    }

    this.mana -= spell.cost;
    this.scene.registry.set('mana', this.mana);
    this.nextSpellAt = now + SPELL_COOLDOWN;
    this.attackUntil = now + CAST_TIME; // stand still, like a sword swing
    this.attackHitbox = null;
    this.setVelocity(0, 0);
    this.anims.play(`player-idle-${this.animDir}`, true);
    this.emit('cast', spell);
    return spell;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.publishHp();
  }

  // ------------------------------------------------------------ damage

  /** Take damage from something at (fromX, fromY). */
  hurt(damage: number, fromX: number, fromY: number): void {
    const now = this.scene.time.now;
    if (this.dead || now < this.invulnerableUntil) return;

    this.hp = Math.max(0, this.hp - damage);
    this.publishHp();
    this.attackHitbox = null;
    this.attackUntil = 0;

    const push = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY);
    if (push.lengthSq() === 0) push.set(0, 1);
    push.normalize().scale(KNOCKBACK_SPEED);
    this.setVelocity(push.x, push.y);
    this.knockUntil = now + KNOCKBACK_TIME;
    this.invulnerableUntil = now + INVULNERABLE_TIME;

    this.setTint(0xff6060);
    this.scene.time.delayedCall(140, () => this.clearTint());
    this.scene.cameras.main.shake(120, 0.004);

    if (this.hp === 0) this.die();
  }

  private die(): void {
    this.dead = true;
    this.setVelocity(0, 0);
    this.setAlpha(1);
    this.anims.play(`player-idle-${this.animDir}`, true);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.emit('died');
  }

  /** Bring the player back with full health at the given position. */
  revive(x: number, y: number): void {
    this.dead = false;
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.publishHp();
    this.facing = 'down';
    this.setFlipX(false);
    this.clearTint();
    this.setPosition(x, y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(x, y);
    this.invulnerableUntil = this.scene.time.now + 1500;
  }

  /** The UI reads health from the game registry. */
  private publishHp(): void {
    this.scene.registry.set('maxHp', this.maxHp);
    this.scene.registry.set('hp', this.hp);
  }

  private publishMagic(): void {
    this.scene.registry.set('maxMana', this.maxMana);
    this.scene.registry.set('mana', this.mana);
    this.scene.registry.set('knownSpells', [...this.known]);
    this.scene.registry.set('selectedSpell', this.selected);
  }
}
