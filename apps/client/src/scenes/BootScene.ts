import Phaser from 'phaser';
import { COLORS } from '../config/gameConfig';
import { addPixelText } from '../ui/text';
import { SceneKeys } from './sceneKeys';
import { createControls, anyJustDown, type Controls } from './controls';

export class BootScene extends Phaser.Scene {
  private controls!: Controls;

  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.controls = createControls(this);

    addPixelText(this, 40, 70, 'CHRONOFROST', 18).setColor('#9be7d0');
    addPixelText(this, 70, 96, 'AETHERBOUND', 12);
    addPixelText(this, 36, 150, 'A GameBoy-style time RPG', 8).setColor('#8fb9a3');
    const prompt = addPixelText(this, 60, 210, 'Press E / Space', 10);

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
      this.scene.start(SceneKeys.Town);
    }
  }
}
