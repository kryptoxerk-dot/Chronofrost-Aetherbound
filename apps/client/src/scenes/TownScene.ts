import Phaser from 'phaser';
import { ENV, GAME, COLORS } from '../config/gameConfig';
import { addPixelText } from '../ui/text';
import { getGameState, updateGameState } from '../systems/gameState';
import { SceneKeys } from './sceneKeys';
import { createControls, anyDown, anyJustDown, type Controls } from './controls';

interface Interactable {
  zone: Phaser.Geom.Rectangle;
  label: string;
  onInteract: () => void;
}

const PLAYER_SIZE = 12;
const INTERACT_RANGE = 26;

export class TownScene extends Phaser.Scene {
  private controls!: Controls;
  private player!: Phaser.GameObjects.Rectangle;
  private prompt!: Phaser.GameObjects.Text;
  private interactables: Interactable[] = [];

  constructor() {
    super(SceneKeys.Town);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.controls = createControls(this);
    this.interactables = [];

    // Ground accents.
    const g = this.add.graphics();
    g.fillStyle(COLORS.dark, 1);
    g.fillRect(0, 200, GAME.width, GAME.height - 200);
    g.fillStyle(0x16302b, 1);
    for (let x = 8; x < GAME.width; x += 32) g.fillRect(x, 210, 16, 16);

    addPixelText(this, 8, 6, 'FROSTHOLLOW TOWN', 8).setColor('#9be7d0');

    this.buildStructure(244, 48, 'DUNGEON', COLORS.danger, () => {
      const state = getGameState();
      if (!state.questAccepted) {
        this.flash('Elder: speak with me before you descend.');
        return;
      }
      this.scene.start(SceneKeys.Dungeon);
    });

    this.buildStructure(40, 210, 'SHOP', COLORS.ice, () => {
      this.scene.start(SceneKeys.Shop);
    });

    if (ENV.pvpEnabled) {
      this.buildStructure(160, 210, 'ARENA', COLORS.mid, () => {
        this.scene.start(SceneKeys.Pvp);
      });
    }

    // The quest-giver NPC.
    this.buildNpc(60, 70);

    this.player = this.add.rectangle(160, 150, PLAYER_SIZE, PLAYER_SIZE, COLORS.light);

    this.prompt = addPixelText(this, 8, GAME.height - 16, '', 8).setColor('#d6f8b8');
  }

  private buildStructure(x: number, y: number, label: string, color: number, onInteract: () => void): void {
    const rect = this.add.rectangle(x, y, 36, 28, color).setStrokeStyle(2, COLORS.light);
    addPixelText(this, x - 18, y + 18, label, 8);
    this.interactables.push({
      zone: new Phaser.Geom.Rectangle(rect.x - 18, rect.y - 14, 36, 28),
      label: `${label} ([E])`,
      onInteract,
    });
  }

  private buildNpc(x: number, y: number): void {
    this.add.rectangle(x, y, 12, 14, 0xe8d9a0).setStrokeStyle(1, COLORS.light);
    addPixelText(this, x - 14, y + 12, 'ELDER', 8);
    this.interactables.push({
      zone: new Phaser.Geom.Rectangle(x - 8, y - 8, 16, 16),
      label: 'Talk to Elder ([E])',
      onInteract: () => this.talkToElder(),
    });
  }

  private talkToElder(): void {
    const state = getGameState();
    if (state.bossDefeated) {
      this.flash('Elder: the Chrono Warden is vanquished. Frosthollow thanks you.');
      return;
    }
    if (!state.questAccepted) {
      updateGameState({ questAccepted: true });
      this.flash('Quest accepted: clear the dungeon and defeat the Chrono Warden.');
      return;
    }
    this.flash('Elder: the Chrono Warden waits below. Use Chronofreeze wisely.');
  }

  private flash(message: string): void {
    this.prompt.setText(message);
    this.time.delayedCall(2600, () => {
      if (this.prompt.text === message) this.prompt.setText('');
    });
  }

  update(_time: number, delta: number): void {
    const speed = (GAME.moveSpeed * delta) / 1000;
    let dx = 0;
    let dy = 0;
    if (anyDown(this.controls.left)) dx -= 1;
    if (anyDown(this.controls.right)) dx += 1;
    if (anyDown(this.controls.up)) dy -= 1;
    if (anyDown(this.controls.down)) dy += 1;
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    const half = PLAYER_SIZE / 2;
    this.player.x = Phaser.Math.Clamp(this.player.x + dx * speed, half, GAME.width - half);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy * speed, 16 + half, GAME.height - 18 - half);

    const near = this.nearestInteractable();
    if (near && !this.prompt.text.includes(':')) {
      this.prompt.setText(near.label);
    } else if (!near && !this.prompt.text.includes(':')) {
      this.prompt.setText('');
    }

    if (near && anyJustDown(this.controls.interact)) {
      near.onInteract();
    }
  }

  private nearestInteractable(): Interactable | null {
    for (const item of this.interactables) {
      const cx = item.zone.centerX;
      const cy = item.zone.centerY;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, cx, cy) <= INTERACT_RANGE) {
        return item;
      }
    }
    return null;
  }
}
