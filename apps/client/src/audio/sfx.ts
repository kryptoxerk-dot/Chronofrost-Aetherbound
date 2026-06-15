import { isMuted } from '../systems/gameState';

// Tiny procedural sound system. No audio assets ship with the game: every cue is
// a short synthesized blip generated with the Web Audio API. This keeps the
// bundle asset-free while giving combat and menus tactile feedback. It degrades
// to a no-op when muted or when Web Audio is unavailable (Node tests, old
// browsers), so callers can fire cues unconditionally.

export type SfxName =
  | 'select'
  | 'attack'
  | 'freeze'
  | 'defend'
  | 'hit'
  | 'victory'
  | 'defeat'
  | 'purchase';

export interface ToneSpec {
  /** Oscillator wave shape. */
  type: OscillatorType;
  /** Start frequency in Hz. */
  freq: number;
  /** Optional glide target frequency in Hz (for sweeps). */
  sweepTo?: number;
  /** Duration in milliseconds. */
  durationMs: number;
  /** Peak gain (0..1). */
  gain: number;
}

// Pure, data-only cue definitions — exported so they can be unit-tested without
// a real audio context.
export const SFX_SPECS: Record<SfxName, ToneSpec> = {
  select: { type: 'square', freq: 660, durationMs: 60, gain: 0.05 },
  attack: { type: 'square', freq: 320, sweepTo: 180, durationMs: 110, gain: 0.07 },
  freeze: { type: 'sine', freq: 880, sweepTo: 1320, durationMs: 200, gain: 0.06 },
  defend: { type: 'triangle', freq: 240, durationMs: 120, gain: 0.06 },
  hit: { type: 'sawtooth', freq: 160, sweepTo: 90, durationMs: 90, gain: 0.06 },
  victory: { type: 'square', freq: 523, sweepTo: 1047, durationMs: 320, gain: 0.06 },
  defeat: { type: 'triangle', freq: 300, sweepTo: 120, durationMs: 360, gain: 0.06 },
  purchase: { type: 'square', freq: 784, sweepTo: 1047, durationMs: 160, gain: 0.06 },
};

/** Pure decision: should a cue actually be synthesized right now? */
export function shouldPlaySfx(muted: boolean, hasAudio: boolean): boolean {
  return !muted && hasAudio;
}

type AudioCtor = typeof AudioContext;

function getAudioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = getAudioCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Play a named cue. No-op when muted or when Web Audio is unavailable. */
export function playSfx(name: SfxName): void {
  if (!shouldPlaySfx(isMuted(), getAudioCtor() !== null)) return;
  const audio = audioContext();
  if (!audio) return;

  // Some browsers start the context suspended until a user gesture; our cues are
  // always triggered by key presses, so a resume here is safe and ignored if not
  // needed.
  if (audio.state === 'suspended') void audio.resume().catch(() => undefined);

  const spec = SFX_SPECS[name];
  const now = audio.currentTime;
  const end = now + spec.durationMs / 1000;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = spec.type;
  osc.frequency.setValueAtTime(spec.freq, now);
  if (spec.sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.sweepTo), end);

  // Short attack + exponential decay envelope to avoid clicks.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(spec.gain, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(end + 0.02);
}
