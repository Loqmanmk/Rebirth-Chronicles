import Phaser from 'phaser';
import type { Choice, Conversation, DialogueNode, Facts, StoryApi } from '../story/dialogue';
import { memory } from '../story/memory';

const FONT = 'Georgia, "Times New Roman", serif';
const BOX_W = 720;
const BOX_H = 190;
const CHARS_PER_SECOND = 55;
const MAX_CHOICES = 4;

/**
 * The talking window at the bottom of the screen.
 * Confirm: E, Space or Enter.  Choose: Up / Down (or W / S / Z), or the number keys.
 * Emits the game events 'dialogue-open' and 'dialogue-close'.
 */
export class DialogueBox {
  private container: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private arrow: Phaser.GameObjects.Text;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;

  private conv: Conversation | null = null;
  private node: DialogueNode | null = null;
  private choices: Choice[] = [];
  private selected = 0;
  private fullText = '';
  private shown = 0;
  private openedAt = 0;

  constructor(
    private scene: Phaser.Scene,
    private api: StoryApi,
  ) {
    const { width, height } = scene.scale;
    const bg = scene.add
      .rectangle(0, 0, BOX_W, BOX_H, 0x1a1420, 1)
      .setOrigin(0)
      .setStrokeStyle(2, 0xc9a64a);
    this.nameText = scene.add.text(20, 12, '', {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#ffd860',
      fontStyle: 'bold',
    });
    this.bodyText = scene.add.text(20, 40, '', {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#fff4d6',
      lineSpacing: 4,
      wordWrap: { width: BOX_W - 40 },
    });
    for (let i = 0; i < MAX_CHOICES; i++) {
      this.choiceTexts.push(
        scene.add.text(36, 0, '', { fontFamily: FONT, fontSize: '17px', color: '#c8c8d4' }),
      );
    }
    this.arrow = scene.add
      .text(BOX_W - 20, BOX_H - 12, 'E ▼', { fontFamily: FONT, fontSize: '14px', color: '#ffd860' })
      .setOrigin(1, 1);

    this.container = scene.add
      .container((width - BOX_W) / 2, height - BOX_H - 8, [
        bg,
        this.nameText,
        this.bodyText,
        ...this.choiceTexts,
        this.arrow,
      ])
      .setDepth(100)
      .setVisible(false);

    this.keys = scene.input.keyboard!.addKeys(
      'E,SPACE,ENTER,UP,DOWN,W,S,Z,ONE,TWO,THREE,FOUR',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  get isOpen(): boolean {
    return this.conv !== null;
  }

  private facts(): Facts {
    return {
      level: this.scene.registry.get('level') ?? 1,
      spells: this.scene.registry.get('knownSpells') ?? [],
    };
  }

  open(conv: Conversation): void {
    if (this.isOpen) return;
    this.conv = conv;
    this.openedAt = this.scene.time.now;
    this.container.setVisible(true);
    this.scene.game.events.emit('dialogue-open');
    this.goto(conv.start(memory, this.facts()));
  }

  private close(): void {
    this.conv = null;
    this.node = null;
    this.container.setVisible(false);
    this.scene.game.events.emit('dialogue-close');
  }

  /** Show a line of the conversation (or close when there is none). */
  private goto(id: string | undefined): void {
    const node = id && this.conv ? this.conv.nodes[id] : undefined;
    if (!node || !this.conv) {
      this.close();
      return;
    }
    const facts = this.facts();
    this.node = node;
    node.run?.(memory, this.api, facts);

    this.nameText.setText(node.speaker ?? this.conv.name);
    const text = typeof node.text === 'function' ? node.text(memory, facts) : node.text;
    // wrap first, so words do not jump to the next line while typing
    this.fullText = this.bodyText.getWrappedText(text).join('\n');
    this.shown = 0;
    this.bodyText.setText('');

    this.choices = (node.choices ?? [])
      .filter((c) => !c.when || c.when(memory, facts))
      .slice(0, MAX_CHOICES);
    this.selected = 0;
    this.drawChoices();
  }

  private get revealed(): boolean {
    return this.shown >= this.fullText.length;
  }

  private drawChoices(): void {
    const show = this.revealed && this.choices.length > 0;
    const top = BOX_H - 14 - this.choices.length * 26;
    this.choiceTexts.forEach((t, i) => {
      const choice = this.choices[i];
      t.setVisible(show && Boolean(choice));
      if (!show || !choice) return;
      const active = i === this.selected;
      t.setText(`${active ? '▶' : ' '} ${i + 1}. ${choice.text}`);
      t.setColor(active ? '#ffd860' : '#c8c8d4');
      t.setPosition(28, top + i * 26);
    });
    this.arrow.setVisible(this.revealed && this.choices.length === 0);
  }

  private pick(index: number): void {
    const choice = this.choices[index];
    if (!choice) return;
    choice.run?.(memory, this.api, this.facts());
    this.goto(choice.next);
  }

  update(delta: number): void {
    if (!this.isOpen || !this.node) return;
    const k = this.keys;
    const just = Phaser.Input.Keyboard.JustDown;

    // always read the keys, so an old key press is not used later
    const confirm = [k.E, k.SPACE, k.ENTER].map((key) => just(key)).some(Boolean);
    const up = [k.UP, k.W, k.Z].map((key) => just(key)).some(Boolean);
    const down = [k.DOWN, k.S].map((key) => just(key)).some(Boolean);
    const number = [k.ONE, k.TWO, k.THREE, k.FOUR].map((key) => just(key)).indexOf(true);

    // the key press that opened the box must not also skip the first line
    if (this.scene.time.now - this.openedAt < 150) return;

    if (!this.revealed) {
      this.shown = confirm
        ? this.fullText.length
        : Math.min(this.fullText.length, this.shown + (CHARS_PER_SECOND * delta) / 1000);
      this.bodyText.setText(this.fullText.slice(0, Math.floor(this.shown)));
      if (this.revealed) this.drawChoices();
      return;
    }

    if (this.choices.length === 0) {
      if (confirm) this.goto(this.node.next);
      return;
    }

    if (up || down) {
      const n = this.choices.length;
      this.selected = (this.selected + (down ? 1 : n - 1)) % n;
      this.drawChoices();
    }
    if (number >= 0 && number < this.choices.length) this.pick(number);
    else if (confirm) this.pick(this.selected);
  }
}
