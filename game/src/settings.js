// settings.js — the options the Settings screen edits: difficulty
// (which leans on the weather and the deadlines) and sound. Both are
// real: difficulty is applied when a day is generated, and the sound
// flag gates every synth in audio.js. Settings persist on their own
// record, separate from the campaign save.

import { loadSettings, storeSettings } from './save.js';

export const DIFFICULTIES = [
  { id: 'calm', label: 'CALM SKIES', windScale: 0.65, deadlineScale: 1.18, note: 'gentler wind, kinder deadlines — learn the plane' },
  { id: 'normal', label: 'TRADE WINDS', windScale: 1.0, deadlineScale: 1.0, note: 'the week as the co-op flies it' },
  { id: 'stormy', label: 'MONSOON SEASON', windScale: 1.35, deadlineScale: 0.9, note: 'hard wind, tight deadlines — bragging rights' },
];

const state = {
  difficulty: 'normal',
  sound: true,
};

export function initSettings() {
  const saved = loadSettings();
  if (saved) {
    if (DIFFICULTIES.some((d) => d.id === saved.difficulty)) state.difficulty = saved.difficulty;
    if (typeof saved.sound === 'boolean') state.sound = saved.sound;
  }
  return state;
}

export function getSettings() {
  return state;
}

export function difficultyOf() {
  return DIFFICULTIES.find((d) => d.id === state.difficulty) ?? DIFFICULTIES[1];
}

export function cycleDifficulty() {
  const i = DIFFICULTIES.findIndex((d) => d.id === state.difficulty);
  state.difficulty = DIFFICULTIES[(i + 1) % DIFFICULTIES.length].id;
  storeSettings(state);
  return state.difficulty;
}

export function toggleSound() {
  state.sound = !state.sound;
  storeSettings(state);
  return state.sound;
}
