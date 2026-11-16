import Phaser from 'phaser';

type Direction = 'down' | 'up' | 'side';

const WALK_SPEED = 60;
const RUN_SPEED = 95;

/**
 * The reincarnated hero. In step 1 they can only walk and run.
 * Controls: arrows, WASD (QWERTY) or ZQSD (AZERTY). Hold Shift to run.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private facing: Direction = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player', 'down0');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Only the feet collide, so the head can overlap things behind the player.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(8, 5).setOffset(4, 11);
    body.setCollideWorldBounds(true);

    this.keys = scene.input.keyboard!.addKeys(
      'UP,DOWN,LEFT,RIGHT,W,A,S,D,Z,Q,SHIFT',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  update(): void {
    const k = this.keys;
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
      this.anims.play(`player-idle-${this.facing}`, true);
    } else {
      const speed = k.SHIFT.isDown ? RUN_SPEED : WALK_SPEED;
      move.normalize().scale(speed);
      this.setVelocity(move.x, move.y);

      if (move.x !== 0) {
        this.facing = 'side';
        this.setFlipX(move.x < 0);
      } else {
        this.facing = move.y < 0 ? 'up' : 'down';
      }
      this.anims.play(`player-walk-${this.facing}`, true);
      this.anims.timeScale = k.SHIFT.isDown ? 1.5 : 1;
    }

    // Things lower on the screen are drawn in front (simple depth sorting).
    this.setDepth(this.y + 8);
  }
}
