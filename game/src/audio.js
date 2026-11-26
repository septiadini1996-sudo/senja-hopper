// audio.js — a pocket WebAudio synth: engine hum, a delivery chime, a
// thunder grumble. No audio files, nothing to load, and nothing plays
// until the player has clicked or pressed a key (browser rules).

let ac = null;
let engineOsc = null;
let engineGain = null;
let enabled = true;

// The Settings screen's sound switch lands here: off means the engine
// stops and no synth speaks until it is switched back on.
export function setSoundEnabled(on) {
  enabled = on;
  if (!on) engineSound(0, false);
}

export function ensureAudio() {
  if (!enabled) return;
  if (ac) {
    if (ac.state === 'suspended') ac.resume();
    return;
  }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    ac = null;
  }
}

export function engineSound(throttle, running) {
  if (!ac || !enabled) {
    if (engineOsc) {
      try { engineOsc.stop(); } catch { /* already stopped */ }
      engineOsc = null;
      engineGain = null;
    }
    return;
  }
  if (running && !engineOsc) {
    engineOsc = ac.createOscillator();
    engineGain = ac.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain.gain.value = 0.0;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    engineOsc.connect(filter).connect(engineGain).connect(ac.destination);
    engineOsc.start();
  }
  if (engineOsc && engineGain) {
    const t = ac.currentTime;
    engineGain.gain.setTargetAtTime(running ? 0.015 + throttle * 0.05 : 0, t, 0.1);
    engineOsc.frequency.setTargetAtTime(48 + throttle * 55, t, 0.1);
    if (!running) {
      const osc = engineOsc;
      setTimeout(() => { try { osc.stop(); } catch { /* already stopped */ } }, 350);
      engineOsc = null;
      engineGain = null;
    }
  }
}

function blip(freq, at, dur, type = 'sine', vol = 0.08) {
  if (!ac || !enabled) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ac.currentTime + at);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + at + dur);
  o.connect(g).connect(ac.destination);
  o.start(ac.currentTime + at);
  o.stop(ac.currentTime + at + dur + 0.02);
}

export function chimeDelivered() {
  blip(660, 0, 0.22);
  blip(880, 0.13, 0.3);
  blip(990, 0.26, 0.42);
}

export function thudHard() {
  blip(72, 0, 0.3, 'triangle', 0.16);
}

export function splashSound() {
  blip(190, 0, 0.4, 'sine', 0.1);
  blip(140, 0.12, 0.5, 'sine', 0.09);
}

export function thunderGrumble() {
  blip(48, 0, 0.9, 'sawtooth', 0.05);
  blip(55, 0.3, 0.8, 'sawtooth', 0.04);
}
