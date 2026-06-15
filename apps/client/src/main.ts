import Phaser from 'phaser';
import { GAME } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { TownScene } from './scenes/TownScene';
import { DungeonScene } from './scenes/DungeonScene';
import { BattleScene } from './scenes/BattleScene';
import { ShopScene } from './scenes/ShopScene';
import { HudScene } from './scenes/HudScene';
import { PvpScene } from './scenes/PvpScene';

// The Node-style Buffer global that @solana/* needs is installed lazily by
// src/solana/loadSolana.ts, so it is no longer pulled into the guest bundle here.

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME.width,
  height: GAME.height,
  zoom: 2,
  pixelArt: true,
  backgroundColor: '#060c0b',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, TownScene, DungeonScene, BattleScene, ShopScene, HudScene, PvpScene],
});
