import Phaser from 'phaser';
import { GAME, COLORS } from '../config/gameConfig';
import { addPixelText, addPanel } from '../ui/text';
import { SceneKeys } from './sceneKeys';
import { createControls, anyJustDown, type Controls } from './controls';
import {
  forfeitPvpMatch,
  getActivePvpMatch,
  getLeaderboard,
  getMatchState,
  getMyPvpEligibility,
  isMatchState,
  queueForPvp,
  submitPvpAction,
  type DuelAction,
  type EligibilityResult,
  type PublicMatchState,
  type RankedPlayer,
} from '../services/pvpApi';
import { authenticateForPvp, getPvpSessionToken, isPvpAuthenticated } from '../services/pvpSession';
import { fighterLine, leaderboardLines, matchOutcomeText, secondsUntil } from '../services/pvpView';

type View = 'menu' | 'leaderboard' | 'eligibility' | 'queue' | 'match' | 'result';

const POLL_MS = 2000;

export class PvpScene extends Phaser.Scene {
  private controls!: Controls;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private view: View = 'menu';
  private busy = false;
  private status = '';
  private poll?: Phaser.Time.TimerEvent;

  private leaderboard: RankedPlayer[] = [];
  private eligibility: EligibilityResult | null = null;
  private match: PublicMatchState | null = null;

  constructor() {
    super(SceneKeys.Pvp);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.controls = createControls(this);
    this.view = 'menu';
    this.status = '';
    this.match = null;

    this.timerText = addPixelText(this, GAME.width - 60, 6, '', 8).setColor('#e07a5f');

    this.poll = this.time.addEvent({ delay: POLL_MS, loop: true, callback: () => this.onPoll() });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.poll?.remove());

    // If a session + active match already exist, drop straight into it.
    if (isPvpAuthenticated()) {
      this.refreshActiveMatch();
    }
    this.render();
  }

  // --- input ---

  update(): void {
    this.renderTimer();

    if (anyJustDown([this.controls.back])) {
      this.onBack();
      return;
    }
    if (this.busy) return;

    switch (this.view) {
      case 'menu':
        return this.handleMenuKeys();
      case 'match':
        return this.handleMatchKeys();
      default:
        return;
    }
  }

  private handleMenuKeys(): void {
    if (Phaser.Input.Keyboard.JustDown(this.key('C')) && !isPvpAuthenticated()) {
      this.run('Connecting wallet…', async () => {
        await authenticateForPvp();
        this.setStatus('Signed in. Choose [Q] queue, [G] eligibility, [L] leaderboard.');
        await this.refreshActiveMatch();
      });
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.key('Q'))) {
      this.requireAuthThen(() => this.doQueue());
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.key('G'))) {
      this.requireAuthThen(() => this.doEligibility());
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.key('L'))) {
      this.doLeaderboard();
    }
  }

  private handleMatchKeys(): void {
    if (!this.match || this.match.status !== 'active') return;
    if (Phaser.Input.Keyboard.JustDown(this.controls.attack)) return this.act('attack');
    if (Phaser.Input.Keyboard.JustDown(this.controls.freeze)) return this.act('freeze');
    if (Phaser.Input.Keyboard.JustDown(this.controls.defend)) return this.act('defend');
    if (Phaser.Input.Keyboard.JustDown(this.key('X'))) {
      const token = getPvpSessionToken();
      const id = this.match.matchId;
      if (!token) return;
      this.run('Forfeiting…', async () => {
        this.applyMatch(await forfeitPvpMatch(token, id));
      });
    }
  }

  private onBack(): void {
    if (this.view === 'menu') {
      this.poll?.remove();
      this.scene.start(SceneKeys.Town);
      return;
    }
    // From a sub-view, return to the menu (but never abandon an active match by accident).
    if (this.view === 'match' && this.match?.status === 'active') {
      this.setStatus('Use [X] to forfeit; you cannot leave an active ranked match.');
      return;
    }
    this.view = 'menu';
    this.status = '';
    this.render();
  }

  // --- actions ---

  private act(action: DuelAction): void {
    const token = getPvpSessionToken();
    if (!token || !this.match) return;
    if (!this.match.yourTurn) {
      this.setStatus('Not your turn — waiting for opponent.');
      return;
    }
    const id = this.match.matchId;
    this.run(`Submitting ${action}…`, async () => {
      this.applyMatch(await submitPvpAction(token, id, action));
    });
  }

  private doQueue(): void {
    const token = getPvpSessionToken();
    if (!token) return;
    this.run('Joining ranked queue…', async () => {
      const result = await queueForPvp(token);
      if (result.status === 'matched') {
        this.applyMatch(result.match);
        this.setStatus('Match found!');
      } else {
        this.view = 'queue';
        this.setStatus('Queued. Waiting for an opponent…');
      }
    });
  }

  private doEligibility(): void {
    const token = getPvpSessionToken();
    if (!token) return;
    this.run('Checking eligibility…', async () => {
      this.eligibility = await getMyPvpEligibility(token);
      this.view = 'eligibility';
      this.status = '';
    });
  }

  private doLeaderboard(): void {
    this.run('Loading leaderboard…', async () => {
      this.leaderboard = await getLeaderboard(10);
      this.view = 'leaderboard';
      this.status = '';
    });
  }

  private async refreshActiveMatch(): Promise<void> {
    const token = getPvpSessionToken();
    if (!token) return;
    const result = await getActivePvpMatch(token);
    if (isMatchState(result)) this.applyMatch(result);
  }

  private onPoll(): void {
    if (this.busy) return;
    const token = getPvpSessionToken();
    if (!token) return;

    if (this.view === 'queue') {
      void getActivePvpMatch(token).then((result) => {
        if (isMatchState(result)) {
          this.applyMatch(result);
          this.setStatus('Match found!');
        }
      }).catch(() => undefined);
      return;
    }

    if (this.view === 'match' && this.match && this.match.status === 'active' && !this.match.yourTurn) {
      const id = this.match.matchId;
      void getMatchState(token, id).then((state) => this.applyMatch(state)).catch(() => undefined);
    }
  }

  private applyMatch(state: PublicMatchState): void {
    this.match = state;
    this.view = state.status === 'complete' ? 'result' : 'match';
    this.render();
  }

  // --- helpers ---

  private requireAuthThen(action: () => void): void {
    if (!isPvpAuthenticated()) {
      this.setStatus('Press [C] to connect your wallet first.');
      return;
    }
    action();
  }

  private run(pending: string, work: () => Promise<void>): void {
    this.busy = true;
    this.setStatus(pending);
    work()
      .catch((err: unknown) => this.setStatus(err instanceof Error ? err.message : 'Request failed.'))
      .finally(() => {
        this.busy = false;
        this.render();
      });
  }

  private key(code: string): Phaser.Input.Keyboard.Key {
    return this.input.keyboard!.addKey(code, true, false);
  }

  private setStatus(message: string): void {
    this.status = message;
    this.render();
  }

  // --- rendering ---

  private render(): void {
    for (const el of this.elements) el.destroy();
    this.elements = [];

    this.push(addPanel(this, 6, 4, GAME.width - 12, GAME.height - 8));
    this.push(addPixelText(this, 12, 8, 'AETHER ARENA — RANKED PVP', 8).setColor('#9be7d0'));

    const auth = isPvpAuthenticated() ? 'wallet signed in' : 'guest (not signed in)';
    this.push(addPixelText(this, 12, 22, auth, 8).setColor('#8fb9a8'));

    if (this.view === 'menu') this.renderMenu();
    else if (this.view === 'leaderboard') this.renderLeaderboard();
    else if (this.view === 'eligibility') this.renderEligibility();
    else if (this.view === 'queue') this.renderQueue();
    else if (this.view === 'match' || this.view === 'result') this.renderMatch();

    if (this.status) {
      this.push(addPixelText(this, 12, GAME.height - 22, this.status.slice(0, 46), 8).setColor('#d6f8b8'));
    }
  }

  private renderMenu(): void {
    const lines = isPvpAuthenticated()
      ? ['[Q] Find ranked match', '[G] My eligibility', '[L] Leaderboard', '[Esc] Back to town']
      : ['[C] Connect wallet & sign in', '[L] Leaderboard (public)', '[Esc] Back to town'];
    lines.forEach((line, i) => this.push(addPixelText(this, 16, 44 + i * 16, line, 8)));
    this.push(
      addPixelText(this, 16, 44 + lines.length * 16 + 8, 'No staking. No betting. Rewards are studio-funded.', 8).setColor('#6f8f81'),
    );
  }

  private renderLeaderboard(): void {
    this.push(addPixelText(this, 12, 40, 'TOP RANKED', 8).setColor('#9be7d0'));
    const lines = leaderboardLines(this.leaderboard);
    if (lines.length === 0) this.push(addPixelText(this, 16, 58, 'No ranked players yet.', 8));
    lines.slice(0, 10).forEach((line, i) => this.push(addPixelText(this, 16, 58 + i * 14, line, 8)));
    this.push(addPixelText(this, 12, GAME.height - 36, '[Esc] Back', 8).setColor('#8fb9a8'));
  }

  private renderEligibility(): void {
    const e = this.eligibility;
    this.push(addPixelText(this, 12, 40, 'RANKED ELIGIBILITY', 8).setColor('#9be7d0'));
    if (!e) {
      this.push(addPixelText(this, 16, 58, 'Unknown.', 8));
      return;
    }
    const color = e.eligible ? '#9be7d0' : '#e07a5f';
    this.push(addPixelText(this, 16, 58, `Status: ${e.status}`, 8).setColor(color));
    this.push(addPixelText(this, 16, 74, `Eligible for rewards: ${e.eligible ? 'yes' : 'not yet'}`, 8));
    const notes = [...e.reasons.map((r) => `- ${r}`), ...e.warnings.map((w) => `! ${w}`)].slice(0, 8);
    notes.forEach((line, i) => this.push(addPixelText(this, 16, 92 + i * 14, line.slice(0, 44), 8).setColor('#cfd8c8')));
    this.push(addPixelText(this, 12, GAME.height - 36, '[Esc] Back', 8).setColor('#8fb9a8'));
  }

  private renderQueue(): void {
    this.push(addPixelText(this, 12, 60, 'Searching for an opponent…', 8));
    this.push(addPixelText(this, 12, 76, 'Matchmaking is server-authoritative.', 8).setColor('#6f8f81'));
    this.push(addPixelText(this, 12, GAME.height - 36, '[Esc] Leave queue', 8).setColor('#8fb9a8'));
  }

  private renderMatch(): void {
    const m = this.match;
    if (!m) return;

    m.fighters.forEach((f, i) => {
      this.push(addPixelText(this, 12, 40 + i * 16, fighterLine(f, m.viewerId), 8).setColor(f.id === m.viewerId ? '#d6f8b8' : '#9be7d0'));
    });

    const logTop = 76;
    this.push(addPixelText(this, 12, logTop, 'BATTLE LOG', 8).setColor('#8fb9a8'));
    m.recentLog.slice(-5).forEach((line, i) => this.push(addPixelText(this, 12, logTop + 14 + i * 12, `· ${line}`.slice(0, 46), 8).setColor('#cfd8c8')));

    if (m.status === 'complete' || this.view === 'result') {
      this.push(addPixelText(this, 12, GAME.height - 54, matchOutcomeText(m), 8).setColor('#9be7d0'));
      this.push(addPixelText(this, 12, GAME.height - 36, '[Esc] Back to arena menu', 8).setColor('#8fb9a8'));
      this.timerText.setText('');
      return;
    }

    const turnLine = m.yourTurn ? 'YOUR TURN: [A]ttack  [F]reeze  [D]efend' : "Opponent's turn — waiting…";
    this.push(addPixelText(this, 12, GAME.height - 36, turnLine, 8).setColor(m.yourTurn ? '#d6f8b8' : '#8fb9a8'));
    this.push(addPixelText(this, 12, GAME.height - 22, '[X] Forfeit', 8).setColor('#e07a5f'));
  }

  private push(obj: Phaser.GameObjects.GameObject): void {
    this.elements.push(obj);
  }

  // Keep the turn-timer countdown live without re-rendering the whole view.
  // (Phaser calls update() every frame; we only touch one text object.)
  private renderTimer(): void {
    if (this.view !== 'match' || !this.match || this.match.status !== 'active') {
      this.timerText.setText('');
      return;
    }
    const secs = secondsUntil(this.match.turnDeadlineAt, Date.now());
    this.timerText.setText(`${secs}s`);
  }
}
