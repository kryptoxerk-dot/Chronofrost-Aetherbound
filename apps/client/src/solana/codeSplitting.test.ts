import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Guards the wallet/Solana code-splitting: the heavy @solana bundle must stay
// off the guest/combat/PvP path and load only via the lazy loader. A regression
// here (a static `from '@solana'` or a static wallet/purchase import in an
// eager module) would silently pull ~250 KB back into first load.

const SRC = join(process.cwd(), 'src');

function read(rel: string): string {
  return readFileSync(join(SRC, rel), 'utf8');
}

describe('solana code-splitting', () => {
  it('the entry (main.ts) does not statically import @solana or buffer', () => {
    const main = read('main.ts');
    expect(main).not.toMatch(/from\s+'@solana/);
    expect(main).not.toMatch(/from\s+'buffer'/);
  });

  it('no scene statically imports @solana or the wallet/purchase modules', () => {
    const scenesDir = join(SRC, 'scenes');
    for (const file of readdirSync(scenesDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      const src = readFileSync(join(scenesDir, file), 'utf8');
      expect(src, `${file} must not static-import @solana`).not.toMatch(/import\s+[^;]*from\s+'@solana/);
      expect(src, `${file} must not static-import solana/wallet`).not.toMatch(/from\s+'[^']*solana\/wallet'/);
      expect(src, `${file} must not static-import solana/purchase`).not.toMatch(/from\s+'[^']*solana\/purchase'/);
    }
  });

  it('the lazy loader exists and dynamically imports the solana modules', () => {
    const loader = read('solana/loadSolana.ts');
    expect(loader).toMatch(/import\('\.\/wallet'\)/);
    expect(loader).toMatch(/import\('\.\/purchase'\)/);
    expect(loader).toMatch(/import\('buffer'\)/);
  });
});
