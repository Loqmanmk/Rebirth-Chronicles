import Phaser from 'phaser';

interface UIData {
  location: string;
  region: string;
}

/** Text drawn on top of the world (not affected by the camera zoom). */
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create(data: UIData): void {
    const { width, height } = this.scale;
    const font = 'Georgia, "Times New Roman", serif';

    // small permanent label, top-left
    this.add
      .text(16, 12, `${data.location}\n${data.region}  ·  Age 5`, {
        fontFamily: font,
        fontSize: '15px',
        color: '#ffffff',
        stroke: '#1a1420',
        strokeThickness: 4,
        lineSpacing: 2,
      })
      .setAlpha(0.9);

    // big title when you arrive
    const title = this.add
      .text(width / 2, height * 0.3, data.location, {
        fontFamily: font,
        fontSize: '44px',
        color: '#fff4d6',
        stroke: '#1a1420',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const subtitle = this.add
      .text(width / 2, height * 0.3 + 40, data.region, {
        fontFamily: font,
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
      .text(width / 2, height - 28, 'Move: Arrows / WASD / ZQSD     Run: hold Shift', {
        fontFamily: font,
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#1a1420',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: hint, alpha: 0, duration: 1200, delay: 9000 });
  }
}
