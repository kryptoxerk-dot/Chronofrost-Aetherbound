import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { addPixelText } from '../ui/text';
import { getGameState, xpForNextLevel } from '../systems/gameState';
import { HERO_CONFIG } from '../config/balance';
import { questHudLine } from '../services/shopView';
import { SceneKeys } from './sceneKeys';

// Always-on overlay showing run progress. Renders above world scenes and never
// captures input, so movement/battle controls pass straight through.

export class HudScene extends Phaser.Scene {
  private label!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SceneKeys.HUD, active: false });
  }

  create(): void {
    this.label = addPixelText(this, GAME.width - 156, 4, '', 8).setColor('#9be7d0');
    this.label.setDepth(1000);
  }

  update(): void {
    const s = getGameState();
    this.label.setText(
      `Lv${s.level} ${s.gold}g xp ${s.xp}/${xpForNextLevel(s.level)}\n` +
      `HP ${s.hp}/${HERO_CONFIG.maxHp} MP ${s.mp}/${HERO_CONFIG.maxMp}\n` +
      questHudLine(s),
    );
  }
}
