import Phaser from 'phaser';
import { GAME, COLORS } from '../config/gameConfig';
import { addPixelText, addPanel } from '../ui/text';
import {
  createBattle,
  nextActor,
  heroAct,
  enemyAct,
  canFreeze,
  type BattleState,
  type EnemyId,
  type Side,
} from '../systems/combat';
import { SceneKeys } from './sceneKeys';
import { createControls, anyJustDown, type Controls } from './controls';

export interface BattleLaunchData {
  enemyId: EnemyId;
  parentKey: string;
}

export interface BattleResult {
  enemyId: EnemyId;
  winner: Side | null;
}

type Phase = 'idle' | 'awaitingInput' | 'enemyTurn' | 'over';

export class BattleScene extends Phaser.Scene {
  private controls!: Controls;
  private state!: BattleState;
  private enemyId!: EnemyId;
  private parentKey = SceneKeys.Dungeon as string;
  private phase: Phase = 'idle';

  private bars!: Phaser.GameObjects.Graphics;
  private heroText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private commandText!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.Battle);
  }

  create(data: BattleLaunchData): void {
    this.enemyId = data.enemyId;
    this.parentKey = data.parentKey ?? SceneKeys.Dungeon;
    this.controls = createControls(this);
    this.state = createBattle(this.enemyId, { rng: () => Math.random() });
    this.phase = 'idle';

    this.cameras.main.setBackgroundColor(0x05100e);
    addPanel(this, 6, 6, GAME.width - 12, GAME.height - 12);

    // Combatant avatars.
    this.add.rectangle(70, 120, 28, 28, COLORS.light).setStrokeStyle(2, COLORS.ice);
    this.add.rectangle(250, 90, this.state.enemy.maxHp > 30 ? 34 : 24, this.state.enemy.maxHp > 30 ? 34 : 24, COLORS.danger)
      .setStrokeStyle(2, COLORS.ice);

    this.enemyText = addPixelText(this, 150, 30, '', 8).setColor('#ffd9cf');
    this.heroText = addPixelText(this, 16, 150, '', 8);
    this.logText = addPixelText(this, 16, 200, '', 8).setColor('#cfe9d6');
    this.commandText = addPixelText(this, 16, 240, '', 8).setColor('#9be7d0');
    this.bars = this.add.graphics();

    this.redraw();
    this.advance();
  }

  /** Move the timeline to the next actor and react to whose turn it is. */
  private advance(): void {
    if (this.state.over) {
      this.enterOver();
      return;
    }
    const side = nextActor(this.state);
    if (side === 'hero') {
      this.phase = 'awaitingInput';
      this.redraw();
    } else {
      this.phase = 'enemyTurn';
      this.redraw();
      this.time.delayedCall(550, () => {
        enemyAct(this.state);
        this.redraw();
        this.time.delayedCall(250, () => this.advance());
      });
    }
  }

  private enterOver(): void {
    this.phase = 'over';
    this.redraw();
  }

  update(): void {
    if (this.phase === 'awaitingInput') {
      if (Phaser.Input.Keyboard.JustDown(this.controls.attack)) return this.resolveHero('attack');
      if (Phaser.Input.Keyboard.JustDown(this.controls.freeze)) return this.resolveHero('freeze');
      if (Phaser.Input.Keyboard.JustDown(this.controls.defend)) return this.resolveHero('defend');
      return;
    }
    if (this.phase === 'over' && anyJustDown(this.controls.interact)) {
      this.finish();
    }
  }

  private resolveHero(action: 'attack' | 'freeze' | 'defend'): void {
    if (action === 'freeze' && !canFreeze(this.state.hero)) {
      this.logText.setText('Not enough MP to Chronofreeze.');
      return;
    }
    this.phase = 'idle';
    heroAct(this.state, action);
    this.redraw();
    this.time.delayedCall(250, () => this.advance());
  }

  private finish(): void {
    const result: BattleResult = { enemyId: this.enemyId, winner: this.state.winner };
    const parent = this.scene.get(this.parentKey);
    this.scene.stop();
    this.scene.resume(this.parentKey);
    parent.events.emit('battle:result', result);
  }

  private redraw(): void {
    const { hero, enemy } = this.state;
    this.enemyText.setText(`${enemy.name}`);
    this.heroText.setText(`${hero.name}\nHP ${hero.hp}/${hero.maxHp}   MP ${hero.mp}/${hero.maxMp}`);

    this.bars.clear();
    this.drawBar(150, 44, 150, enemy.hp / enemy.maxHp, COLORS.danger);
    this.drawBar(16, 178, 150, hero.hp / hero.maxHp, COLORS.ice);

    if (this.phase === 'over') {
      const won = this.state.winner === 'hero';
      this.logText.setText(won ? `You defeated ${enemy.name}!` : 'You were defeated...');
      this.commandText.setText('Press E / Space to continue');
      return;
    }

    const last = this.state.log[this.state.log.length - 1] ?? 'Battle start!';
    this.logText.setText(last);

    if (this.phase === 'awaitingInput') {
      const freeze = canFreeze(hero) ? '[F] Freeze' : '[F] Freeze (no MP)';
      this.commandText.setText(`[A] Attack   ${freeze}   [D] Defend`);
    } else {
      this.commandText.setText(`${enemy.name} is acting...`);
    }
  }

  private drawBar(x: number, y: number, width: number, ratio: number, color: number): void {
    const clamped = Phaser.Math.Clamp(ratio, 0, 1);
    this.bars.fillStyle(0x14241f, 1);
    this.bars.fillRect(x, y, width, 6);
    this.bars.fillStyle(color, 1);
    this.bars.fillRect(x, y, Math.round(width * clamped), 6);
    this.bars.lineStyle(1, COLORS.light, 1);
    this.bars.strokeRect(x, y, width, 6);
  }
}
