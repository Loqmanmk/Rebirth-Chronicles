import Phaser from 'phaser';
import { createAllTextures } from '../art/textures';

/** Prepares all textures and animations, then starts the game. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    createAllTextures(this);
    this.scene.start('Village');
  }
}
