import Phaser from 'phaser';

interface UIData {
  location: string;
  region: string;
}

const FONT = 'Georgia, "Times New Roman", serif';

/** Text and health drawn on top of the world (not affected by the camera zoom). */
export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private toast!: Phaser.GameObjects.Text;

  constructor() {
    super('UI');
  }

  create(data: UIData): void {
    const { width, height } = this.scale;

    // small permanent label, top-left
    this.add
      .text(16, 12, `${data.location}\n${data.region}  ·  Age 5`, {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#ffffff',
        stroke: '#1a1420',
        strokeThickness: 4,
        lineSpacing: 2,
      })
      .setAlpha(0.9);

    // health hearts
    this.drawHearts();
    this.registry.events.on('changedata-hp', this.drawHearts, this);
    this.registry.events.on('changedata-maxHp', this.drawHearts, this);

    // big title when you arrive
    const title = this.add
      .text(width / 2, height * 0.3, data.location, {
        fontFamily: FONT,
        fontSize: '44px',
        color: '#fff4d6',
        stroke: '#1a1420',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const subtitle = this.add
      .text(width / 2, height * 0.3 + 40, data.region, {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#e8d8b0',
        stroke: '#1a1420',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: [title, subtitle],
      alpha: 1,
      duration: 900,
      delay: 500,
      hold: 2200,
      yoyo: true,
    });

    // controls hint, fades away after a while
    const hint = this.add
      .text(
        width / 2,
        height - 28,
        'Move: Arrows / WASD / ZQSD     Run: Shift     Attack: Space / J',
        {
          fontFamily: FONT,
          fontSize: '16px',
          color: '#ffffff',
          stroke: '#1a1420',
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0, duration: 1200, delay: 12000 });

    // short messages from the game ("You fainted...")
    this.toast = this.add
      .text(width / 2, height * 0.72, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#fff4d6',
        stroke: '#1a1420',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.game.events.on('toast', this.showToast, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-hp', this.drawHearts, this);
      this.registry.events.off('changedata-maxHp', this.drawHearts, this);
      this.game.events.off('toast', this.showToast, this);
    });
  }

  private drawHearts(): void {
    const hp: number = this.registry.get('hp') ?? 0;
    const maxHp: number = this.registry.get('maxHp') ?? 0;

    while (this.hearts.length < maxHp) {
      const i = this.hearts.length;
      this.hearts.push(this.add.image(16 + i * 26, 60, 'heart', 'full').setOrigin(0).setScale(3));
    }
    this.hearts.forEach((heart, i) => {
      heart.setVisible(i < maxHp);
      const frame = i < hp ? 'full' : 'empty';
      if (heart.frame.name !== frame) {
        heart.setFrame(frame);
        if (frame === 'empty') {
          this.tweens.add({ targets: heart, scale: { from: 4, to: 3 }, duration: 200 });
        }
      }
    });
  }

  private showToast(message: string): void {
    this.toast.setText(message);
    this.tweens.killTweensOf(this.toast);
    this.toast.setAlpha(0);
    this.tweens.add({ targets: this.toast, alpha: 1, duration: 600, hold: 3000, yoyo: true });
  }
}
