import { Buffer } from 'buffer';
import Phaser from 'phaser';
import { GAME } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { TownScene } from './scenes/TownScene';
import { DungeonScene } from './scenes/DungeonScene';
import { BattleScene } from './scenes/BattleScene';
import { ShopScene } from './scenes/ShopScene';
import { HudScene } from './scenes/HudScene';

// Solana web3 / spl-token rely on a Node-style Buffer global in the browser.
const globalScope = globalThis as unknown as { Buffer?: typeof Buffer };
if (!globalScope.Buffer) globalScope.Buffer = Buffer;

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
  scene: [BootScene, TownScene, DungeonScene, BattleScene, ShopScene, HudScene],
});
