import { Platform } from "react-native";
import { triggerHaptic } from "./haptics";

export type SoundType = "tap" | "soft" | "open" | "close" | "toggle" | "success" | "error" | "tick" | "whoosh";

let audioCtx: any = null;
let masterGain: any = null;
let lastTick = 0;
let isMuted = false;

export function setSoundMuted(muted: boolean) {
  isMuted = muted;
}

export function isSoundMuted(): boolean {
  return isMuted;
}

function getAudioContext(): any {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.35;

      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 5200;
      masterGain.connect(filter).connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  start: number,
  dur: number,
  vol: number,
  type: OscillatorType = "sine",
  glideTo?: number
) {
  if (!audioCtx || !masterGain) return;
  try {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
    }
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(masterGain);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  } catch {
    // Ignore audio glitches
  }
}

export function playSound(s: SoundType) {
  // Always trigger haptics on native
  if (s === "success") triggerHaptic("success");
  else if (s === "error") triggerHaptic("error");
  else if (s === "tick" || s === "soft") triggerHaptic("light");
  else triggerHaptic("medium");

  if (isMuted || Platform.OS !== "web") return;

  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const t = ctx.currentTime + 0.005;

  switch (s) {
    case "tap":
      playTone(880, t, 0.06, 0.05, "triangle", 760);
      break;
    case "soft":
      playTone(660, t, 0.05, 0.025, "sine");
      break;
    case "tick": {
      const now = Date.now();
      if (now - lastTick < 45) return;
      lastTick = now;
      playTone(1320, t, 0.025, 0.018, "sine");
      break;
    }
    case "toggle":
      playTone(587, t, 0.07, 0.04, "triangle");
      playTone(880, t + 0.05, 0.08, 0.035, "triangle");
      break;
    case "open":
      playTone(523, t, 0.12, 0.035, "sine", 784);
      break;
    case "close":
      playTone(784, t, 0.1, 0.03, "sine", 523);
      break;
    case "success":
      playTone(1046.5, t, 0.16, 0.045, "sine");
      playTone(1318.5, t + 0.07, 0.16, 0.04, "sine");
      playTone(1568, t + 0.14, 0.28, 0.04, "sine");
      break;
    case "error":
      playTone(330, t, 0.14, 0.05, "triangle", 260);
      playTone(247, t + 0.1, 0.18, 0.04, "triangle");
      break;
  }
}
