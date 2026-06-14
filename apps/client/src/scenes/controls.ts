import Phaser from 'phaser';

// Centralized key bindings. Arrow keys and WASD both move; E/Space interact;
// A/F/D are battle commands; Esc backs out.

export interface Controls {
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
  interact: Phaser.Input.Keyboard.Key[];
  attack: Phaser.Input.Keyboard.Key;
  freeze: Phaser.Input.Keyboard.Key;
  defend: Phaser.Input.Keyboard.Key;
  back: Phaser.Input.Keyboard.Key;
}

export function createControls(scene: Phaser.Scene): Controls {
  const kb = scene.input.keyboard;
  if (!kb) throw new Error('Keyboard input is unavailable.');
  const key = (code: string) => kb.addKey(code, true, false);
  return {
    up: [key('UP'), key('W')],
    down: [key('DOWN'), key('S')],
    left: [key('LEFT'), key('A')],
    right: [key('RIGHT'), key('D')],
    interact: [key('E'), key('SPACE')],
    attack: key('A'),
    freeze: key('F'),
    defend: key('D'),
    back: key('ESC'),
  };
}

export function anyDown(keys: Phaser.Input.Keyboard.Key[]): boolean {
  return keys.some((k) => k.isDown);
}

export function anyJustDown(keys: Phaser.Input.Keyboard.Key[]): boolean {
  return keys.some((k) => Phaser.Input.Keyboard.JustDown(k));
}
