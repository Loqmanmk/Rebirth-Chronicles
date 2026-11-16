import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { UIScene } from './scenes/UIScene';
import { VillageScene } from './scenes/VillageScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  pixelArt: true,
  backgroundColor: '#120e18',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 } },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, VillageScene, UIScene],
});

// Handy for debugging from the browser console.
(window as unknown as { game: Phaser.Game }).game = game;
