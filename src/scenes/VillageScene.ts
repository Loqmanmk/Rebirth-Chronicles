import Phaser from 'phaser';
import { TILE, Tile } from '../art/textures';
import { Player } from '../entities/Player';
import { MAP_H, MAP_W, buildVillage } from '../world/villageMap';

const ZOOM = 3;

export class VillageScene extends Phaser.Scene {
  private player!: Player;

  constructor() {
    super('Village');
  }

  create(): void {
    const village = buildVillage();
    const worldW = MAP_W * TILE;
    const worldH = MAP_H * TILE;

    // --- ground
    const map = this.make.tilemap({ data: village.ground, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    const ground = map.createLayer(0, tileset, 0, 0)!;
    ground.setDepth(-10);
    ground.setCollision([Tile.WATER]);

    // --- objects (trees, houses, villagers...) with their collision boxes
    const solids = this.physics.add.staticGroup();
    for (const obj of village.objects) {
      this.add.image(obj.x, obj.y, obj.key).setOrigin(0.5, 1).setDepth(obj.y);
      if (obj.solid) {
        const { w, h, offsetY = 0 } = obj.solid;
        const zone = this.add.zone(obj.x, obj.y - h / 2 + offsetY, w, h);
        this.physics.add.existing(zone, true);
        solids.add(zone);
      }
    }

    // --- player
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.player = new Player(this, village.spawn.x, village.spawn.y);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, solids);

    // --- camera
    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.fadeIn(900, 0, 0, 0);

    this.scene.launch('UI', { location: 'Willowbrook Village', region: 'Lunaris Kingdom' });
  }

  update(): void {
    this.player.update();
  }
}
