"use client";

// Small synthesized LCARS-style sound engine built on the Web Audio API -
// no audio assets, so nothing to source, license, or host. Every effect is
// a short stack of oscillator blips shaped with a fast attack / exponential
// decay envelope, which is what gives them that computer-chirp character.

interface Tone {
  freq: number;
  duration: number; // seconds
  type?: OscillatorType;
  gain?: number;
  delay?: number; // seconds, relative to the call
  glideTo?: number; // exponential frequency glide target
}

const MUTE_KEY = "quasar-isolinear:sound-muted";

let ctx: AudioContext | null = null;
const listeners = new Set<(muted: boolean) => void>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) ctx = new AudioCtor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setSoundMuted(muted: boolean) {
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  listeners.forEach((fn) => fn(muted));
  if (!muted) getCtx(); // first unmute doubles as the unlock gesture
}

export function subscribeSoundMuted(fn: (muted: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Call from any click handler to satisfy browser autoplay-unlock rules. */
export function unlockAudio() {
  getCtx();
}

function playTones(tones: Tone[]) {
  if (isSoundMuted()) return;
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value = 0.4;
  master.connect(audio.destination);

  for (const t of tones) {
    const start = now + (t.delay ?? 0);
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = t.type ?? "sine";
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(t.glideTo, 1), start + t.duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(t.gain ?? 0.5, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + t.duration + 0.02);
  }
}

export function playButtonClick() {
  playTones([{ freq: 720, duration: 0.045, type: "square", gain: 0.14 }]);
}

export function playNavSelect() {
  playTones([
    { freq: 540, duration: 0.05, gain: 0.22 },
    { freq: 860, duration: 0.07, delay: 0.03, gain: 0.2 },
  ]);
}

export function playPlace() {
  playTones([
    { freq: 660, duration: 0.06, gain: 0.28 },
    { freq: 990, duration: 0.09, delay: 0.045, gain: 0.24 },
  ]);
}

export function playRuleOut() {
  playTones([{ freq: 240, duration: 0.09, type: "sawtooth", gain: 0.16, glideTo: 150 }]);
}

export function playVerifySuccess() {
  playTones([
    { freq: 523.25, duration: 0.09, gain: 0.26 },
    { freq: 659.25, duration: 0.09, delay: 0.08, gain: 0.26 },
    { freq: 783.99, duration: 0.18, delay: 0.16, gain: 0.28 },
  ]);
}

export function playVerifyFail() {
  playTones([
    { freq: 300, duration: 0.16, type: "square", gain: 0.2, glideTo: 170 },
    { freq: 290, duration: 0.16, delay: 0.03, type: "square", gain: 0.12, glideTo: 160 },
  ]);
}

export function playReset() {
  playTones([{ freq: 480, duration: 0.16, gain: 0.18, glideTo: 190 }]);
}

export function playSweepPing() {
  playTones([{ freq: 1500, duration: 0.03, gain: 0.1 }]);
}
