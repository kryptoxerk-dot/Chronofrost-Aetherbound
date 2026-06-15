import Phaser from 'phaser';
import { GAME, COLORS } from '../config/gameConfig';
import { addPixelText } from '../ui/text';
import { ENEMY_CONFIG, HERO_CONFIG } from '../config/balance';
import { FROSTGLASS_CAVERN_NODES, type DungeonNode } from '../config/dungeonPlan';
import { addReward, healHero, setHeroVitals, updateGameState } from '../systems/gameState';
import { recordFunnelEvent } from '../systems/analytics';
import type { EnemyId } from '../systems/combat';
import { SceneKeys } from './sceneKeys';
import { createControls, anyDown, anyJustDown, type Controls } from './controls';
import type { BattleResult } from './BattleScene';

interface DungeonEnemy {
  sprite: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  enemyId: EnemyId;
  isBoss: boolean;
  defeated: boolean;
}

interface DungeonShrine {
  sprite: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  node: Extract<DungeonNode, { kind: 'shrine' }>;
  used: boolean;
}

const PLAYER_SIZE = 12;
const SPAWN = { x: 24, y: 144 };

export class DungeonScene extends Phaser.Scene {
  private controls!: Controls;
  private player!: Phaser.GameObjects.Rectangle;
  private prompt!: Phaser.GameObjects.Text;
  private enemies: DungeonEnemy[] = [];
  private shrines: DungeonShrine[] = [];
  private activeEnemy: DungeonEnemy | null = null;

  constructor() {
    super(SceneKeys.Dungeon);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x081311);
    this.controls = createControls(this);
    this.enemies = [];
    this.shrines = [];
    this.activeEnemy = null;

    addPixelText(this, 8, 6, 'CHRONO DUNGEON', 8).setColor('#9be7d0');
    addPixelText(this, 8, GAME.height - 28, '[Esc] retreat to town   touch foes to battle', 8).setColor('#8fb9a3');
    addPixelText(this, 8, 20, 'Frostglass Cavern: Slime -> Wraith -> Shrine -> Golem -> Warden', 8)
      .setColor('#cfe9d6');

    setHeroVitals(HERO_CONFIG.maxHp, HERO_CONFIG.maxMp);
    recordFunnelEvent('dungeon_entered');
    for (const node of FROSTGLASS_CAVERN_NODES) {
      if (node.kind === 'shrine') this.spawnShrine(node);
      else this.spawnEnemy(node.x, node.y, node.enemyId, node.kind === 'boss');
    }

    this.player = this.add.rectangle(SPAWN.x, SPAWN.y, PLAYER_SIZE, PLAYER_SIZE, COLORS.light);
    this.prompt = addPixelText(this, 8, GAME.height - 16, '', 8);

    // Battle outcomes come back as an event on this scene.
    this.events.on('battle:result', this.onBattleResult, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('battle:result', this.onBattleResult, this);
    });
  }

  private spawnEnemy(x: number, y: number, enemyId: EnemyId, isBoss: boolean): void {
    const cfg = ENEMY_CONFIG[enemyId];
    const size = isBoss ? 20 : 14;
    const color = isBoss ? COLORS.danger : COLORS.mid;
    const sprite = this.add.rectangle(x, y, size, size, color).setStrokeStyle(2, COLORS.ice);
    const label = addPixelText(this, x - 20, y + size / 2 + 2, cfg.name, 8).setColor('#cfe9d6');
    this.enemies.push({ sprite, label, enemyId, isBoss, defeated: false });
  }

  private spawnShrine(node: Extract<DungeonNode, { kind: 'shrine' }>): void {
    const sprite = this.add.rectangle(node.x, node.y, 16, 18, COLORS.ice).setStrokeStyle(2, COLORS.light);
    const label = addPixelText(this, node.x - 22, node.y + 14, 'AETHER SHRINE', 8).setColor('#d6f8b8');
    this.shrines.push({ sprite, label, node, used: false });
  }

  private startBattle(enemy: DungeonEnemy): void {
    this.activeEnemy = enemy;
    recordFunnelEvent('battle_started');
    if (enemy.isBoss) recordFunnelEvent('boss_reached');
    this.scene.launch(SceneKeys.Battle, { enemyId: enemy.enemyId, parentKey: SceneKeys.Dungeon });
    this.scene.pause();
  }

  private onBattleResult(result: BattleResult): void {
    const enemy = this.activeEnemy;
    this.activeEnemy = null;
    if (!enemy) return;

    if (result.winner !== 'hero') {
      // Defeat: send the player home to recover. Progress so far is kept.
      recordFunnelEvent('hero_defeated');
      setHeroVitals(HERO_CONFIG.maxHp, HERO_CONFIG.maxMp);
      this.scene.start(SceneKeys.Town);
      return;
    }

    const cfg = ENEMY_CONFIG[enemy.enemyId];
    enemy.defeated = true;
    recordFunnelEvent('enemy_defeated');
    if (enemy.isBoss) recordFunnelEvent('boss_defeated');
    enemy.sprite.destroy();
    enemy.label.destroy();
    const { leveledUp, level } = addReward({ gold: cfg.gold, xp: cfg.xp });
    this.flash(`Defeated ${cfg.name}! +${cfg.gold}g +${cfg.xp}xp${leveledUp ? ` — level ${level}!` : ''}`);

    if (enemy.isBoss) {
      updateGameState({ bossDefeated: true, questComplete: true });
      this.time.delayedCall(1800, () => {
        setHeroVitals(HERO_CONFIG.maxHp, HERO_CONFIG.maxMp);
        this.scene.start(SceneKeys.Town);
      });
    }
  }

  private flash(message: string): void {
    this.prompt.setText(message);
    this.time.delayedCall(2400, () => {
      if (this.prompt.text === message) this.prompt.setText('');
    });
  }

  update(_time: number, delta: number): void {
    if (anyJustDown([this.controls.back])) {
      recordFunnelEvent('dungeon_retreat');
      this.scene.start(SceneKeys.Town);
      return;
    }

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
    this.player.y = Phaser.Math.Clamp(this.player.y + dy * speed, 16 + half, GAME.height - 30 - half);

    for (const enemy of this.enemies) {
      if (enemy.defeated) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y) <= 18) {
        this.startBattle(enemy);
        break;
      }
    }

    for (const shrine of this.shrines) {
      if (shrine.used) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, shrine.sprite.x, shrine.sprite.y) <= 18) {
        shrine.used = true;
        recordFunnelEvent('shrine_used');
        shrine.sprite.setFillStyle(0x24443d);
        shrine.label.setColor('#8fb9a3');
        const state = healHero(shrine.node.healHp, shrine.node.restoreMp, HERO_CONFIG.maxHp, HERO_CONFIG.maxMp);
        this.flash(`Aether Shrine restored HP ${state.hp}/${HERO_CONFIG.maxHp} MP ${state.mp}/${HERO_CONFIG.maxMp}.`);
        break;
      }
    }
  }
}
