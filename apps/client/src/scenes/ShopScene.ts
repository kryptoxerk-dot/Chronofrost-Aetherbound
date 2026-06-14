import Phaser from 'phaser';
import { GAME, COLORS } from '../config/gameConfig';
import { addPixelText, addPanel } from '../ui/text';
import { SHOP_ITEMS } from '../config/balance';
import { getGameState, spendGold, grantInventory, hasItem } from '../systems/gameState';
import { connectPhantom, getAetherBalance } from '../solana/wallet';
import { buildAndSendAetherPurchase } from '../solana/purchase';
import { requestQuote, confirmPurchase } from '../services/api';
import { SceneKeys } from './sceneKeys';
import { createControls, anyJustDown, type Controls } from './controls';

export class ShopScene extends Phaser.Scene {
  private controls!: Controls;
  private selected = 0;
  private busy = false;
  private itemTexts: Phaser.GameObjects.Text[] = [];
  private status!: Phaser.GameObjects.Text;
  private walletText!: Phaser.GameObjects.Text;
  private keyC!: Phaser.Input.Keyboard.Key;
  private keyP!: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SceneKeys.Shop);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x06140f);
    this.controls = createControls(this);
    this.selected = 0;
    this.busy = false;
    this.itemTexts = [];

    const kb = this.input.keyboard!;
    this.keyC = kb.addKey('C', true, false);
    this.keyP = kb.addKey('P', true, false);

    addPanel(this, 6, 6, GAME.width - 12, GAME.height - 12);
    addPixelText(this, 16, 14, 'COSMETIC SHOP', 10).setColor('#9be7d0');
    addPixelText(this, 16, 30, 'Cosmetics only — no power for sale.', 8).setColor('#8fb9a3');

    SHOP_ITEMS.forEach((_, i) => {
      this.itemTexts.push(addPixelText(this, 20, 52 + i * 28, '', 8));
    });

    this.walletText = addPixelText(this, 16, GAME.height - 58, '', 8).setColor('#cfe9d6');
    this.status = addPixelText(this, 16, GAME.height - 44, '', 8).setColor('#d6f8b8');
    addPixelText(this, 16, GAME.height - 28, '[Up/Down] pick  [E] buy w/ Gold  [P] $AETHER', 8).setColor('#8fb9a3');
    addPixelText(this, 16, GAME.height - 16, '[C] connect wallet   [Esc] leave', 8).setColor('#8fb9a3');

    this.redraw();
  }

  private redraw(): void {
    const state = getGameState();
    SHOP_ITEMS.forEach((item, i) => {
      const owned = hasItem(item.id);
      const cursor = i === this.selected ? '>' : ' ';
      const ownedTag = owned ? '  [OWNED]' : '';
      this.itemTexts[i]
        .setText(`${cursor} ${item.name} — ${item.priceGold}g${ownedTag}`)
        .setColor(i === this.selected ? '#d6f8b8' : '#8fb9a3');
    });

    const wallet = state.walletAddress;
    this.walletText.setText(
      wallet
        ? `Wallet ${wallet.slice(0, 4)}..${wallet.slice(-4)}  $AETHER ${state.aetherBalanceUi ?? '—'}   Gold ${state.gold}`
        : `Guest mode — Gold ${state.gold}`,
    );
  }

  private flash(message: string): void {
    this.status.setText(message);
  }

  update(): void {
    if (anyJustDown([this.controls.back])) {
      this.scene.start(SceneKeys.Town);
      return;
    }
    if (this.busy) return;

    if (anyJustDown(this.controls.up)) {
      this.selected = (this.selected + SHOP_ITEMS.length - 1) % SHOP_ITEMS.length;
      this.redraw();
    } else if (anyJustDown(this.controls.down)) {
      this.selected = (this.selected + 1) % SHOP_ITEMS.length;
      this.redraw();
    } else if (anyJustDown(this.controls.interact)) {
      this.buyWithGold();
    } else if (Phaser.Input.Keyboard.JustDown(this.keyC)) {
      void this.connectWallet();
    } else if (Phaser.Input.Keyboard.JustDown(this.keyP)) {
      void this.buyWithAether();
    }
  }

  private buyWithGold(): void {
    const item = SHOP_ITEMS[this.selected];
    if (hasItem(item.id)) {
      this.flash('Already owned.');
      return;
    }
    if (!spendGold(item.priceGold)) {
      this.flash('Not enough Gold.');
      return;
    }
    grantInventory(item.id);
    this.flash(`Purchased ${item.name} with Gold.`);
    this.redraw();
  }

  private async connectWallet(): Promise<void> {
    this.busy = true;
    try {
      const wallet = await connectPhantom();
      this.flash('Wallet connected (devnet).');
      await getAetherBalance(wallet).catch(() => undefined);
    } catch (err) {
      this.flash(err instanceof Error ? err.message : 'Wallet connect failed.');
    } finally {
      this.busy = false;
      this.redraw();
    }
  }

  private async buyWithAether(): Promise<void> {
    const item = SHOP_ITEMS[this.selected];
    const state = getGameState();
    if (!state.walletAddress) {
      this.flash('Connect a wallet first ([C]).');
      return;
    }
    if (hasItem(item.id)) {
      this.flash('Already owned.');
      return;
    }

    this.busy = true;
    try {
      this.flash('Requesting quote...');
      const quote = await requestQuote(state.walletAddress, item.id);
      this.flash('Approve the transfer in your wallet...');
      const signature = await buildAndSendAetherPurchase(quote);
      this.flash('Verifying on-chain...');
      const result = await confirmPurchase(quote.orderId, signature);
      if (result.ok) {
        grantInventory(item.id);
        this.flash(`Purchased ${item.name} with $AETHER.`);
      } else {
        this.flash('Purchase not confirmed.');
      }
    } catch (err) {
      this.flash(err instanceof Error ? err.message : 'Devnet purchase failed.');
    } finally {
      this.busy = false;
      this.redraw();
    }
  }
}
