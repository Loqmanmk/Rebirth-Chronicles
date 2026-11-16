import Phaser from 'phaser';
import { SPELLS, SPELL_BY_ID, type SpellId } from '../magic/spells';
import type { Stats } from '../systems/progression';

interface UIData {
  location: string;
  region: string;
}

const FONT = 'Georgia, "Times New Roman", serif';
const MANA_BAR_W = 124;
const SLOT = 40;

interface SpellSlot {
  id: SpellId;
  frame: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
}

/** Text and health drawn on top of the world (not affected by the camera zoom). */
export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private toast!: Phaser.GameObjects.Text;
  private manaFill!: Phaser.GameObjects.Rectangle;
  private slots: SpellSlot[] = [];
  private spellLabel!: Phaser.GameObjects.Text;
  private place: UIData = { location: '', region: '' };
  private infoLabel!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private statsPanel!: Phaser.GameObjects.Container;
  private statsText!: Phaser.GameObjects.Text;

  constructor() {
    super('UI');
  }

  create(data: UIData): void {
    const { width, height } = this.scale;

    // small permanent label, top-left
    this.place = data;
    this.infoLabel = this.add
      .text(16, 12, '', {
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

    // mana bar
    this.add.rectangle(16, 90, MANA_BAR_W + 4, 12, 0x1a1420).setOrigin(0);
    this.add.rectangle(18, 92, MANA_BAR_W, 8, 0x26304a).setOrigin(0);
    this.manaFill = this.add.rectangle(18, 92, MANA_BAR_W, 8, 0x4aa8ff).setOrigin(0);
    this.game.events.on('mana-fail', this.flashMana, this);

    // level + XP bar
    this.levelLabel = this.add.text(150, 86, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: '#ffe680',
      stroke: '#1a1420',
      strokeThickness: 4,
    });
    this.add.rectangle(16, 104, MANA_BAR_W + 4, 8, 0x1a1420).setOrigin(0);
    this.xpFill = this.add.rectangle(18, 106, 0, 4, 0xffd860).setOrigin(0);

    // stats panel (press C)
    const panelBg = this.add
      .rectangle(0, 0, 230, 190, 0x1a1420, 0.88)
      .setOrigin(0)
      .setStrokeStyle(2, 0xc9a64a);
    this.statsText = this.add.text(16, 12, '', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#fff4d6',
      lineSpacing: 6,
    });
    this.statsPanel = this.add
      .container(width - 246, 50, [panelBg, this.statsText])
      .setVisible(false);
    this.input.keyboard!.on('keydown-C', () => this.statsPanel.setVisible(!this.statsPanel.visible));

    this.drawProgress();
    this.registry.events.on('changedata-level', this.drawProgress, this);
    this.registry.events.on('changedata-xp', this.drawProgress, this);

    // spell bar, bottom-left
    const barY = height - 56;
    this.slots = SPELLS.map((spell, i) => {
      const x = 16 + i * (SLOT + 6);
      const frame = this.add
        .rectangle(x, barY, SLOT, SLOT, 0x1a1420, 0.75)
        .setOrigin(0)
        .setStrokeStyle(2, 0x5d5e70);
      const icon = this.add
        .image(x + SLOT / 2, barY + SLOT / 2, 'elements', spell.id)
        .setScale(3);
      this.add.text(x + 4, barY + 1, String(i + 1), {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#c8c8d4',
        stroke: '#1a1420',
        strokeThickness: 3,
      });
      return { id: spell.id, frame, icon };
    });
    this.spellLabel = this.add.text(16 + SPELLS.length * (SLOT + 6) + 6, barY + 4, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: '#ffffff',
      stroke: '#1a1420',
      strokeThickness: 4,
      lineSpacing: 2,
    });
    this.drawSpells();
    this.registry.events.on('changedata-knownSpells', this.drawSpells, this);
    this.registry.events.on('changedata-selectedSpell', this.drawSpells, this);

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
        24,
        'Move: Arrows / WASD / ZQSD    Run: Shift    Sword: Space / J    Spell: K / F    Choose spell: 1-5 / E    Stats: C',
        {
          fontFamily: FONT,
          fontSize: '14px',
          color: '#ffffff',
          stroke: '#1a1420',
          strokeThickness: 4,
        },
      )
      .setOrigin(0, 0.5);
    hint.setX(width - hint.width - 16);
    this.tweens.add({ targets: hint, alpha: 0, duration: 1200, delay: 20000 });

    // short messages from the game ("You fainted...")
    this.toast = this.add
      .text(width / 2, height * 0.72, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#fff4d6',
        stroke: '#1a1420',
        strokeThickness: 5,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.game.events.on('toast', this.showToast, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-hp', this.drawHearts, this);
      this.registry.events.off('changedata-maxHp', this.drawHearts, this);
      this.game.events.off('toast', this.showToast, this);
      this.game.events.off('mana-fail', this.flashMana, this);
      this.registry.events.off('changedata-level', this.drawProgress, this);
      this.registry.events.off('changedata-xp', this.drawProgress, this);
      this.registry.events.off('changedata-knownSpells', this.drawSpells, this);
      this.registry.events.off('changedata-selectedSpell', this.drawSpells, this);
    });
  }

  update(): void {
    const mana: number = this.registry.get('mana') ?? 0;
    const maxMana: number = this.registry.get('maxMana') ?? 1;
    this.manaFill.width = MANA_BAR_W * Phaser.Math.Clamp(mana / maxMana, 0, 1);
  }

  /** The mana bar blinks red when a spell costs more mana than you have. */
  private flashMana(): void {
    this.manaFill.setFillStyle(0xe0404a);
    this.time.delayedCall(180, () => this.manaFill.setFillStyle(0x4aa8ff));
  }

  /** Level, age, XP bar and the stats panel. */
  private drawProgress(): void {
    const r = this.registry;
    const level: number = r.get('level') ?? 1;
    const xp: number = r.get('xp') ?? 0;
    const xpNext: number = r.get('xpNext') ?? 0;
    const stats: Stats | undefined = r.get('stats');

    this.infoLabel.setText(
      this.place.location + '\n' + this.place.region + '  ·  Age ' + r.get('age') + ' (' + r.get('stage') + ')',
    );
    this.levelLabel.setText('Lv ' + level);
    this.xpFill.width = xpNext > 0 ? MANA_BAR_W * Phaser.Math.Clamp(xp / xpNext, 0, 1) : MANA_BAR_W;

    if (!stats) return;
    this.statsText.setText(
      [
        'Level ' + level + '  ·  ' + r.get('stage'),
        'Age: ' + r.get('age'),
        'XP: ' + (xpNext > 0 ? xp + ' / ' + xpNext : 'MAX'),
        'Hearts: ' + stats.maxHp,
        'Mana: ' + stats.maxMana,
        'Strength: ' + stats.strength,
        'Magic: +' + stats.magic,
      ].join('\n'),
    );
  }

  private drawSpells(): void {
    const known: SpellId[] = this.registry.get('knownSpells') ?? [];
    const selected: SpellId | null = this.registry.get('selectedSpell') ?? null;

    for (const slot of this.slots) {
      const isKnown = known.includes(slot.id);
      slot.icon.setAlpha(isKnown ? 1 : 0.12);
      if (isKnown) slot.icon.clearTint();
      else slot.icon.setTintFill(0xffffff);
      slot.frame.setStrokeStyle(2, slot.id === selected ? 0xffd860 : 0x5d5e70);
    }

    if (selected) {
      const spell = SPELL_BY_ID[selected];
      this.spellLabel.setText(`${spell.name}  ·  ${spell.cost} mana\n${spell.description}`);
    } else {
      this.spellLabel.setText('No magic yet.\nFind an element shrine.');
    }
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
