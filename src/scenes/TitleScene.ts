import Phaser from 'phaser';
import { memory } from '../story/memory';
import { ageForLevel, stageForLevel } from '../systems/progression';
import { clearSave, readSave } from '../systems/save';

const FONT = 'Georgia, "Times New Roman", serif';

interface MenuItem {
  label: string;
  action: () => void;
}

/** First screen: continue the saved game or start a new one. */
export class TitleScene extends Phaser.Scene {
  private items: MenuItem[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private note!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#120e18');

    // a few quiet stars
    for (let i = 0; i < 70; i++) {
      const star = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        2,
        2,
        0xfff4d6,
        Phaser.Math.FloatBetween(0.15, 0.7),
      );
      this.tweens.add({
        targets: star,
        alpha: 0.1,
        duration: Phaser.Math.Between(900, 2600),
        yoyo: true,
        repeat: -1,
      });
    }

    this.add
      .text(width / 2, height * 0.26, 'Rebirth Chronicles', {
        fontFamily: FONT,
        fontSize: '64px',
        color: '#fff4d6',
        stroke: '#c9a64a',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.26 + 56, 'A second life in the world of Aetheria', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#c8c8d4',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    this.note = this.add
      .text(width / 2, height - 36, '', { fontFamily: FONT, fontSize: '15px', color: '#8d8d99' })
      .setOrigin(0.5);

    this.keys = this.input.keyboard!.addKeys('UP,DOWN,W,S,Z,E,SPACE,ENTER') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.showMainMenu();
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  private showMainMenu(): void {
    const save = readSave();
    if (save) {
      const { level } = save.player;
      this.setMenu(
        [
          {
            label: `Continue   (Level ${level}, age ${ageForLevel(level)}, ${stageForLevel(level)})`,
            action: () => {
              memory.load(save.memory);
              this.startGame(true);
            },
          },
          { label: 'New Game', action: () => this.showEraseMenu() },
        ],
        'Up / Down to choose,  Enter to confirm',
      );
    } else {
      this.setMenu(
        [{ label: 'New Game', action: () => this.newGame() }],
        'Press Enter to begin your second life',
      );
    }
  }

  private showEraseMenu(): void {
    this.setMenu(
      [
        { label: 'No, keep my save', action: () => this.showMainMenu() },
        { label: 'Yes, erase it and start again', action: () => this.newGame() },
      ],
      'A new game erases your saved game.',
    );
  }

  private newGame(): void {
    clearSave();
    memory.reset();
    this.startGame(false);
  }

  private startGame(load: boolean): void {
    this.items = []; // ignore more key presses
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Village', { load });
    });
  }

  private setMenu(items: MenuItem[], note: string): void {
    const { width, height } = this.scale;
    this.texts.forEach((t) => t.destroy());
    this.items = items;
    this.selected = 0;
    this.note.setText(note);
    this.texts = items.map((item, i) => {
      const text = this.add
        .text(width / 2, height * 0.58 + i * 44, item.label, { fontFamily: FONT, fontSize: '26px' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      text.on('pointerover', () => {
        this.selected = i;
        this.drawMenu();
      });
      text.on('pointerdown', () => item.action());
      return text;
    });
    this.drawMenu();
  }

  private drawMenu(): void {
    this.texts.forEach((text, i) => {
      const active = i === this.selected;
      text.setColor(active ? '#ffd860' : '#8d8d99');
      text.setText((active ? '▶  ' : '') + this.items[i].label);
    });
  }

  update(): void {
    if (this.items.length === 0) return;
    const k = this.keys;
    const just = Phaser.Input.Keyboard.JustDown;
    const up = [k.UP, k.W, k.Z].map((key) => just(key)).some(Boolean);
    const down = [k.DOWN, k.S].map((key) => just(key)).some(Boolean);
    const confirm = [k.E, k.SPACE, k.ENTER].map((key) => just(key)).some(Boolean);

    if (up || down) {
      const n = this.items.length;
      this.selected = (this.selected + (down ? 1 : n - 1)) % n;
      this.drawMenu();
    }
    if (confirm) this.items[this.selected].action();
  }
}
