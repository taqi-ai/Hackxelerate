"use client";

/**
 * Tiny UI sound engine, synthesized with the Web Audio API (no audio files to load).
 * Sounds are short, soft and pitched to a pentatonic scale so they never clash. Off when the user
 * mutes them (persisted), and silent until the first user gesture (browser autoplay rules).
 */
export type Sound = "tap" | "soft" | "open" | "close" | "toggle" | "success" | "error" | "tick" | "whoosh";

const KEY = "ascora-sound";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let lastTick = 0;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage blocked: keep the in-memory default */
  }
  window.dispatchEvent(new CustomEvent("ascora-sound", { detail: on }));
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    // gentle low-pass keeps every sound warm rather than clicky
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5200;
    master.connect(lp).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = "sine", glideTo?: number) {
  const ac = ctx!;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(master!);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(start: number, dur: number, vol: number, from: number, to: number) {
  const ac = ctx!;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(from, start);
  bp.frequency.exponentialRampToValueAtTime(to, start + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(bp).connect(g).connect(master!);
  src.start(start);
}

export function play(s: Sound) {
  if (!soundEnabled()) return;
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime + 0.005;
  switch (s) {
    case "tap":
      tone(880, t, 0.06, 0.05, "triangle", 760);
      break;
    case "soft":
      tone(660, t, 0.05, 0.025, "sine");
      break;
    case "tick": {
      const now = performance.now();
      if (now - lastTick < 45) return; // sliders fire fast: keep it a texture, not a buzz
      lastTick = now;
      tone(1320, t, 0.025, 0.018, "sine");
      break;
    }
    case "toggle":
      tone(587, t, 0.07, 0.04, "triangle");
      tone(880, t + 0.05, 0.08, 0.035, "triangle");
      break;
    case "open":
      tone(523, t, 0.12, 0.035, "sine", 784);
      noise(t, 0.12, 0.012, 600, 2400);
      break;
    case "close":
      tone(784, t, 0.1, 0.03, "sine", 523);
      break;
    case "whoosh":
      noise(t, 0.35, 0.03, 300, 3200);
      break;
    case "success":
      // C major pentatonic arpeggio: C6 E6 G6
      tone(1046.5, t, 0.16, 0.045, "sine");
      tone(1318.5, t + 0.07, 0.16, 0.04, "sine");
      tone(1568, t + 0.14, 0.28, 0.04, "sine");
      break;
    case "error":
      tone(330, t, 0.14, 0.05, "triangle", 260);
      tone(247, t + 0.1, 0.18, 0.04, "triangle");
      break;
  }
}
