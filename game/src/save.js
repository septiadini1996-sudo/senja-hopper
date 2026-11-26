// save.js — the campaign save: one JSON record in localStorage holding
// the day, the island, the purse, the upgrades, the career stats and the
// challenge progress, so Continue on the title screen resumes the week
// exactly where the pilot left it. Every access is guarded: a browser
// that refuses storage simply plays without saving.

const SAVE_KEY = 'senja-hopper-save-v1';
const SETTINGS_KEY = 'senja-hopper-settings-v1';

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function hasSave() {
  const s = read(SAVE_KEY);
  return !!(s && typeof s.day === 'number' && s.islandId);
}

export function loadSave() {
  return read(SAVE_KEY);
}

export function storeSave(snapshot) {
  return write(SAVE_KEY, { ...snapshot, savedAt: Date.now() });
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

export function loadSettings() {
  return read(SETTINGS_KEY);
}

export function storeSettings(settings) {
  return write(SETTINGS_KEY, settings);
}
