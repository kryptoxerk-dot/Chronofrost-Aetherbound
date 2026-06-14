import Phaser from 'phaser';
import { COLORS } from '../config/gameConfig';

export function addPixelText(scene: Phaser.Scene, x: number, y: number, text: string, size = 8) {
  return scene.add.text(x, y, text, {
    fontFamily: 'monospace',
    fontSize: `${size}px`,
    color: '#d6f8b8',
    lineSpacing: 2,
  }).setResolution(1);
}

export function addPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.dark, 1);
  g.fillRect(x, y, w, h);
  g.lineStyle(2, COLORS.light, 1);
  g.strokeRect(x, y, w, h);
  return g;
}
