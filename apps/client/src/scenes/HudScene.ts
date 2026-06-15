import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { addPixelText } from '../ui/text';
import { getGameState, isMuted, toggleMuted, xpForNextLevel } from '../systems/gameState';
import { HERO_CONFIG } from '../config/balance';
import { questHudLine } from '../services/shopView';
import { playSfx } from '../audio/sfx';
import { SceneKeys } from './sceneKeys';

// Always-on overlay showing run progress. Renders above world scenes and never
// captures movement/battle input — except the global [M] sound toggle, which it
// owns so it works from any scene.

export class HudScene extends Phaser.Scene {
  private label!: Phaser.GameObjects.Text;
  private audioLabel!: Phaser.GameObjects.Text;
  private keyM!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SceneKeys.HUD, active: false });
  }

  create(): void {
    this.label = addPixelText(this, GAME.width - 156, 4, '', 8).setColor('#9be7d0');
    this.label.setDepth(1000);
    this.audioLabel = addPixelText(this, GAME.width - 156, 38, '', 8).setColor('#6f8f81');
    this.audioLabel.setDepth(1000);
    this.keyM = this.input.keyboard!.addKey('M', true, false);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyM)) {
      const muted = toggleMuted();
      if (!muted) playSfx('select');
    }

    const s = getGameState();
    this.label.setText(
      `Lv${s.level} ${s.gold}g xp ${s.xp}/${xpForNextLevel(s.level)}\n` +
      `HP ${s.hp}/${HERO_CONFIG.maxHp} MP ${s.mp}/${HERO_CONFIG.maxMp}\n` +
      questHudLine(s),
    );
    this.audioLabel.setText(isMuted() ? '[M] muted' : '[M] sound');
  }
}
