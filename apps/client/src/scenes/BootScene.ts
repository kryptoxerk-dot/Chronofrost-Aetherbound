import Phaser from 'phaser';
import { COLORS } from '../config/gameConfig';
import { addPanel, addPixelText } from '../ui/text';
import { getGameState, updateGameState } from '../systems/gameState';
import { launchNoticeText, shouldShowLaunchNotice } from '../services/launchNotice';
import { SceneKeys } from './sceneKeys';
import { createControls, anyJustDown, type Controls } from './controls';

export class BootScene extends Phaser.Scene {
  private controls!: Controls;
  private awaitingNotice = false;

  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.controls = createControls(this);
    this.awaitingNotice = shouldShowLaunchNotice(getGameState());

    addPixelText(this, 40, 70, 'CHRONOFROST', 18).setColor('#9be7d0');
    addPixelText(this, 70, 96, 'AETHERBOUND', 12);
    addPixelText(this, 36, 150, 'A GameBoy-style time RPG', 8).setColor('#8fb9a3');
    if (this.awaitingNotice) {
      addPanel(this, 20, 158, 280, 76);
      addPixelText(this, 28, 166, launchNoticeText(), 8).setColor('#d6f8b8');
    }
    const prompt = addPixelText(
      this,
      this.awaitingNotice ? 42 : 60,
      this.awaitingNotice ? 244 : 210,
      this.awaitingNotice ? 'Press E / Space to acknowledge' : 'Press E / Space',
      10,
    );

    this.tweens.add({
      targets: prompt,
      alpha: 0.25,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // The HUD overlay runs for the whole session on top of world scenes.
    this.scene.launch(SceneKeys.HUD);
  }

  update(): void {
    if (anyJustDown(this.controls.interact)) {
      if (this.awaitingNotice) {
        updateGameState({ launchNoticeAccepted: true });
        this.scene.restart();
        return;
      }
      this.scene.start(SceneKeys.Town);
    }
  }
}
