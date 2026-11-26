// main.js — Senja Hopper's state machine and game loop: title → chart
// table → flight → result → evening shop → next day, for a six-day
// charter week over nine islands. Input is keyboard, mouse and touch;
// the physics runs on a fixed step so every machine flies the same sky.

import { VIEW_W, VIEW_H, CAMPAIGN_DAYS, ECONOMY, LANDING } from './config.js';
import { makeRng } from './random.js';
import { HOME_ISLAND, islandById } from './world.js';
import { makeWeather } from './weather.js';
import { makeOrders, planRoute } from './orders.js';
import { makeLegWorld, newFlight, stepFlight, planeSpecFor, resetApproach } from './physics.js';
import {
  drawFlight, drawMap, drawTitle, drawResult, drawShop, drawEnd,
  TICKET_CARD, FLY_BTN, SHOP_ROW, NEXT_BTN, BIG_BTN, text, rr,
} from './render.js';
import { clearButtons, addButton, drawButtons, hitButton } from './ui.js';
import { ensureAudio, engineSound, chimeDelivered, thudHard, splashSound, thunderGrumble, setSoundEnabled } from './audio.js';
import { hasSave, loadSave, storeSave, clearSave } from './save.js';
import { initSettings, getSettings, difficultyOf, cycleDifficulty, toggleSound } from './settings.js';
import { freshStats, recordLeg, recordDayCompleted } from './stats.js';
import { MENU_ITEMS, MENU_BTN, BACK_BTN, SETTING_BTN, drawMenuHeader, drawHowTo, drawChallenges, drawStats, drawSettings } from './menu.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const statusEl = document.getElementById('status');

const CAMPAIGN_SEED = 20261126;

export const G = {
  screen: 'title',
  day: 0,
  islandId: HOME_ISLAND,
  credits: ECONOMY.startCredits,
  fuel: 0,
  upgrades: { tank: 0, engine: 0, hold: 0 },
  spec: planeSpecFor({ tank: 0, engine: 0, hold: 0 }),
  tickets: [],
  plans: [],
  weathers: [],
  selected: 0,
  flight: null,
  world: null,
  weather: null,
  ticket: null,
  plan: null,
  fromIsland: null,
  destIsland: null,
  result: null,
  deliveries: 0,
  waterLandings: 0,
  totalEarned: 0,
  banner: null,
  endTimer: -1,
  thunderAt: 0,
  stats: freshStats(),
  maxTurb: 0,
};

G.fuel = G.spec.tank;
initSettings();
setSoundEnabled(getSettings().sound);

// The save snapshot: enough to resume at the start of `resumeDay`.
function persist(resumeDay) {
  storeSave({
    day: resumeDay,
    islandId: G.islandId,
    credits: G.credits,
    fuel: G.fuel,
    upgrades: { ...G.upgrades },
    stats: { ...G.stats },
  });
}

export function continueGame() {
  const s = loadSave();
  if (!s) return;
  G.day = s.day;
  G.islandId = s.islandId;
  G.credits = s.credits;
  G.upgrades = { tank: 0, engine: 0, hold: 0, ...s.upgrades };
  G.stats = { ...freshStats(), ...s.stats };
  G.deliveries = G.stats.deliveries;
  G.waterLandings = G.stats.waterLandings;
  G.totalEarned = G.stats.totalEarned;
  refreshSpec();
  G.fuel = Math.min(G.spec.tank, s.fuel ?? G.spec.tank);
  if (G.day >= CAMPAIGN_DAYS) {
    G.screen = 'end';
    return;
  }
  startDay();
}

const keys = {};
const holds = { pitchUp: false, pitchDown: false, thrUp: false, thrDown: false };
let lastTime = 0;
let accumulator = 0;

function refreshSpec() {
  G.spec = planeSpecFor(G.upgrades);
  if (G.fuel > G.spec.tank) G.fuel = G.spec.tank;
}

export function newCampaign() {
  clearSave();
  G.day = 0;
  G.islandId = HOME_ISLAND;
  G.credits = ECONOMY.startCredits;
  G.upgrades = { tank: 0, engine: 0, hold: 0 };
  refreshSpec();
  G.fuel = G.spec.tank;
  G.deliveries = 0;
  G.waterLandings = 0;
  G.totalEarned = 0;
  G.stats = freshStats();
  startDay();
}

export function startDay() {
  const rng = makeRng(CAMPAIGN_SEED + G.day * 977);
  const diff = difficultyOf();
  G.tickets = makeOrders(rng, G.day, G.islandId, G.spec.holdKg);
  G.plans = G.tickets.map((t) => {
    const plan = planRoute(t, G.spec.tank);
    plan.deadlineSeconds = Math.round(plan.deadlineSeconds * diff.deadlineScale);
    return plan;
  });
  G.weathers = G.tickets.map((t, i) => makeWeather(makeRng(CAMPAIGN_SEED + G.day * 977 + 31 + i * 131), G.day, G.plans[i].metres, diff.windScale));
  G.selected = 0;
  G.screen = 'map';
  persist(G.day);
  setStatus(`Day ${G.day + 1}: choose a delivery from ${islandById(G.islandId).name}.`);
}

export function startFlight() {
  G.ticket = G.tickets[G.selected];
  G.plan = G.plans[G.selected];
  G.weather = G.weathers[G.selected];
  G.fromIsland = islandById(G.ticket.from);
  G.destIsland = islandById(G.ticket.to);
  G.world = makeLegWorld(G.plan);
  G.flight = newFlight(G.spec, G.world, G.fuel);
  G.maxTurb = 0;
  G.endTimer = -1;
  G.banner = { text: `WHEELS UP WHEN READY — ${G.destIsland.name.toUpperCase()} ${G.plan.km} KM · COURSE ${String(G.plan.course).padStart(3, '0')}°`, until: performance.now() + 4200 };
  G.screen = 'fly';
  setStatus(`Flying to ${G.destIsland.name}.`);
}

function finishLeg() {
  const f = G.flight;
  const kind = f.outcome;
  const lines = [];
  let delivered = false;
  if (kind === 'smooth' || kind === 'firm' || kind === 'hard') {
    delivered = true;
    const onTime = f.time <= G.plan.deadlineSeconds;
    lines.push([`Delivery pay — ${G.ticket.cargo.label}`, G.ticket.pay]);
    if (onTime) lines.push(['On-time bonus (+25%)', Math.round(G.ticket.pay * 0.25)]);
    G.totalEarned += G.ticket.pay + (onTime ? Math.round(G.ticket.pay * 0.25) : 0);
    G.deliveries += 1;
    G.result = { kind, onTime, timeLeft: G.plan.deadlineSeconds - f.time };
    if (kind === 'smooth') chimeDelivered(); else thudHard();
  } else if (kind === 'water') {
    lines.push(['Tow boat fee — cargo recovered, pay lost', -LANDING.towFee]);
    G.waterLandings += 1;
    G.result = { kind, onTime: false, timeLeft: 0 };
    splashSound();
  } else {
    // 'ground': back on the origin island — nothing earned, nothing lost but fuel
    G.result = { kind: 'returned', onTime: false, timeLeft: 0 };
  }
  if (f.damage > 0 && kind !== 'returned') {
    lines.push([`Airframe repairs (${f.damage} pts)`, -Math.round(f.damage * LANDING.repairPerDamage)]);
  }
  const topUp = Math.ceil((G.spec.tank - f.fuel) * ECONOMY.fuelPricePerLitre);
  if (topUp > 0) lines.push([`Fuel top-up to ${G.spec.tank} L`, -topUp]);
  for (const [, amount] of lines) G.credits += amount;
  G.result.lines = lines;
  if (delivered || kind === 'water') G.islandId = G.ticket.to;
  G.fuel = G.spec.tank;
  if (kind !== 'returned') {
    const wasOnTime = delivered && f.time <= G.plan.deadlineSeconds;
    recordLeg(G.stats, {
      kind,
      onTime: wasOnTime,
      throughStorm: G.maxTurb > 0.25,
      damage: f.damage,
      kg: G.ticket.kg,
      pay: delivered ? G.ticket.pay : 0,
      bonus: wasOnTime ? Math.round(G.ticket.pay * 0.25) : 0,
      hadWaterBefore: G.stats.waterLandings > 0,
      toPapua: G.ticket.to === 'papua',
    });
    recordDayCompleted(G.stats);
    persist(G.day + 1);
  }
  engineSound(0, false);
  G.screen = 'result';
  setStatus(kind === 'water' ? 'Water landing. The tow boat found you.' : 'Delivered.');
}

// ---------------------------------------------------------------- input

function toGameCoords(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((evt.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((evt.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

const TOUCH_ZONES = [
  { x: 18, y: 418, w: 118, h: 62, hold: 'pitchUp', label: 'NOSE ▲' },
  { x: 18, y: 492, w: 118, h: 62, hold: 'pitchDown', label: 'NOSE ▼' },
  { x: VIEW_W - 136, y: 418, w: 118, h: 62, hold: 'thrUp', label: 'THR +' },
  { x: VIEW_W - 136, y: 492, w: 118, h: 62, hold: 'thrDown', label: 'THR −' },
];

canvas.addEventListener('pointerdown', (evt) => {
  ensureAudio();
  const p = toGameCoords(evt);
  if (G.screen === 'fly') {
    for (const z of TOUCH_ZONES) {
      if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) {
        holds[z.hold] = true;
        canvas.setPointerCapture(evt.pointerId);
        return;
      }
    }
    return;
  }
  const b = hitButton(p.x, p.y);
  if (b && b.action) b.action();
});

canvas.addEventListener('pointerup', () => {
  for (const k of Object.keys(holds)) holds[k] = false;
});
canvas.addEventListener('pointercancel', () => {
  for (const k of Object.keys(holds)) holds[k] = false;
});

window.addEventListener('keydown', (evt) => {
  ensureAudio();
  keys[evt.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(evt.code)) evt.preventDefault();
  if (G.screen === 'fly' && evt.code === 'KeyT' && G.flight && G.flight.overflown && !G.flight.outcome) {
    resetApproach(G.flight, G.world);
    G.flight.overflown = false;
    G.banner = { text: 'TURNED BACK — THE STRIP IS AHEAD, LINE HER UP AGAIN', until: performance.now() + 3600 };
  }
  if ((evt.code === 'Enter' || evt.code === 'Space') && G.screen === 'title') {
    newCampaign();
  }
  if (evt.code === 'Escape' && ['howto', 'challenges', 'stats', 'settings'].includes(G.screen)) {
    G.screen = 'title';
  }
});
window.addEventListener('keyup', (evt) => {
  keys[evt.code] = false;
});

function readInput() {
  return {
    throttleDelta: (keys.ArrowRight || keys.KeyD || holds.thrUp ? 1 : 0) - (keys.ArrowLeft || keys.KeyA || holds.thrDown ? 1 : 0),
    pitchDelta: (keys.ArrowUp || keys.KeyW || holds.pitchUp ? 1 : 0) - (keys.ArrowDown || keys.KeyS || holds.pitchDown ? 1 : 0),
  };
}

// ---------------------------------------------------------------- buttons per screen

function layoutButtons() {
  clearButtons();
  if (G.screen === 'title') {
    MENU_ITEMS.forEach((item, i) => {
      if (item.id === 'continue' && !hasSave()) return; // drawn muted in render
      const r = MENU_BTN(i);
      const action = {
        new: () => newCampaign(),
        continue: () => continueGame(),
        howto: () => { G.screen = 'howto'; },
        challenges: () => { G.screen = 'challenges'; },
        stats: () => { G.screen = 'stats'; },
        settings: () => { G.screen = 'settings'; },
      }[item.id];
      addButton(r.x, r.y, r.w, r.h, item.label, action, { primary: item.id === 'new', size: 21 });
    });
  } else if (G.screen === 'howto' || G.screen === 'challenges' || G.screen === 'stats') {
    addButton(BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h, '←  BACK TO MENU', () => { G.screen = 'title'; }, { primary: true, size: 20 });
  } else if (G.screen === 'settings') {
    addButton(SETTING_BTN(0).x, SETTING_BTN(0).y, SETTING_BTN(0).w, SETTING_BTN(0).h, 'CHANGE DIFFICULTY', () => cycleDifficulty(), { primary: true, size: 18 });
    addButton(SETTING_BTN(1).x, SETTING_BTN(1).y, SETTING_BTN(1).w, SETTING_BTN(1).h, getSettings().sound ? 'SOUND: ON' : 'SOUND: OFF', () => setSoundEnabled(toggleSound()), { primary: true, size: 18 });
    addButton(SETTING_BTN(2).x, SETTING_BTN(2).y, SETTING_BTN(2).w, SETTING_BTN(2).h, 'ERASE SAVE', () => clearSave(), { size: 18 });
    addButton(BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h, '←  BACK TO MENU', () => { G.screen = 'title'; }, { primary: true, size: 20 });
  } else if (G.screen === 'map') {
    G.tickets.forEach((t, i) => {
      const r = TICKET_CARD(i);
      addButton(r.x, r.y, r.w, r.h, '', () => { G.selected = i; }, { bare: true });
    });
    addButton(FLY_BTN.x, FLY_BTN.y, FLY_BTN.w, FLY_BTN.h, `✈  FLY — ${G.tickets[G.selected].cargo.label} → ${islandById(G.tickets[G.selected].to).name}`, () => startFlight(), { primary: true, size: 22 });
  } else if (G.screen === 'result') {
    const lastDay = G.day >= CAMPAIGN_DAYS - 1;
    const label = G.result.kind === 'returned' ? 'BACK TO THE CHART TABLE' : lastDay ? 'SEE THE WEEK’S RESULT' : 'EVENING SHOP → NEXT DAY';
    addButton(NEXT_BTN.x, NEXT_BTN.y, NEXT_BTN.w, NEXT_BTN.h, label, () => {
      if (G.result.kind === 'returned') {
        G.screen = 'map';
      } else if (lastDay) {
        G.screen = 'end';
      } else {
        G.screen = 'shop';
      }
    }, { primary: true, size: 20 });
  } else if (G.screen === 'shop') {
    const tracks = ['tank', 'engine', 'hold'];
    tracks.forEach((key, i) => {
      const level = G.upgrades[key];
      const cost = ECONOMY.upgradeCost[level + 1];
      if (level < 3 && cost !== undefined && G.credits >= cost) {
        const r = SHOP_ROW(i);
        addButton(r.x + r.w - 196, r.y + 25, 172, 52, `BUY — ${cost}`, () => {
          G.credits -= cost;
          G.upgrades[key] += 1;
          refreshSpec();
          persist(G.day + 1);
        }, { primary: true, size: 19 });
      }
    });
    addButton(NEXT_BTN.x, NEXT_BTN.y, NEXT_BTN.w, NEXT_BTN.h, `START DAY ${G.day + 2} →`, () => {
      G.day += 1;
      startDay();
    }, { primary: true, size: 22 });
  } else if (G.screen === 'end') {
    addButton(BIG_BTN.x, BIG_BTN.y + 60, BIG_BTN.w, BIG_BTN.h, '↻  FLY ANOTHER WEEK', () => { G.screen = 'title'; }, { primary: true, size: 24 });
  }
}

// ---------------------------------------------------------------- the loop

function stepSimulation(dt) {
  const f = G.flight;
  if (!f) return;
  const events = stepFlight(f, readInput(), G.weather, dt);
  if (f.turb > G.maxTurb) G.maxTurb = f.turb;
  const now = performance.now();
  for (const ev of events) {
    if (ev === 'takeoff') {
      G.banner = { text: 'AIRBORNE — CLIMB OUT, MIND THE WIND', until: now + 2600 };
      if (f.outcome === 'ground') f.outcome = null; // touched and went around again
    }
    if (ev === 'bounce') { G.banner = { text: 'BOUNCED — TOO FAST, TOO STEEP. EASE HER DOWN', until: now + 3200 }; thudHard(); }
    if (ev === 'overfly') G.banner = { text: 'YOU PASSED THE ISLAND — PRESS T TO TURN BACK', until: now + 60000 };
  }
  if (f.turb > 0.35 && now > G.thunderAt) {
    thunderGrumble();
    G.thunderAt = now + 9000;
  }
  engineSound(f.throttle, !f.onGround || f.speed > 2);
  // the leg ends once the plane has arrived and rolled to a stop (or the
  // tow boat has her): a touchdown alone does not cut the scene short
  if (f.outcome && (f.water || f.speed < 3) && G.endTimer < 0) G.endTimer = now + 1500;
}

function render(now) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  layoutButtons();
  if (G.screen === 'title') {
    drawTitle(ctx, G, now, true);
    drawMenuHeader(ctx, G, now, hasSave());
    if (!hasSave()) {
      const r = MENU_BTN(1);
      ctx.fillStyle = 'rgba(13,17,34,0.55)';
      ctx.strokeStyle = 'rgba(255,247,230,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 12);
      ctx.fill();
      ctx.stroke();
      text(ctx, 'CONTINUE — NO SAVED WEEK', r.x + r.w / 2, r.y + r.h / 2 + 8, 19, 'rgba(255,247,230,0.45)', 'center', 700);
    }
  } else if (G.screen === 'howto') {
    drawHowTo(ctx);
  } else if (G.screen === 'challenges') {
    drawChallenges(ctx, G.stats);
  } else if (G.screen === 'stats') {
    drawStats(ctx, G.stats, G);
  } else if (G.screen === 'settings') {
    drawSettings(ctx, getSettings());
  } else if (G.screen === 'map') {
    drawMap(ctx, G);
  } else if (G.screen === 'fly') {
    drawFlight(ctx, G, now);
    drawTouchZones();
  } else if (G.screen === 'result') {
    drawResult(ctx, G);
  } else if (G.screen === 'shop') {
    drawShop(ctx, G);
  } else if (G.screen === 'end') {
    drawEnd(ctx, G);
  }
  drawButtons(ctx);
}

function drawTouchZones() {
  for (const z of TOUCH_ZONES) {
    ctx.fillStyle = holds[z.hold] ? 'rgba(232,147,63,0.55)' : 'rgba(13,17,34,0.5)';
    ctx.strokeStyle = 'rgba(255,215,106,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(z.x, z.y, z.w, z.h, 12);
    ctx.fill();
    ctx.stroke();
    text(ctx, z.label, z.x + z.w / 2, z.y + z.h / 2 + 7, 18, '#fff7e6', 'center', 800);
  }
}

function frame(nowMs) {
  requestAnimationFrame(frame);
  const now = nowMs;
  if (G.screen === 'fly') {
    if (!lastTime) lastTime = now;
    accumulator += Math.min(250, now - lastTime);
    lastTime = now;
    while (accumulator >= 1000 / 30) {
      stepSimulation(1 / 30);
      accumulator -= 1000 / 30;
    }
    if (G.endTimer > 0 && now >= G.endTimer && G.flight && G.flight.outcome) {
      G.endTimer = -1;
      finishLeg();
    }
  } else {
    lastTime = 0;
    accumulator = 0;
  }
  render(now);
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
  canvas.style.left = '50%';
  canvas.style.top = '50%';
  canvas.style.transform = 'translate(-50%, -50%)';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// Screenshot staging: ?shot=cover|water|shell|map renders one
// deterministic frame of the named moment instead of starting the loop.
const params = new URLSearchParams(window.location.search);
if (params.get('shot')) {
  applyShot(G, { newCampaign, startDay, startFlight, finishLeg }, params.get('shot'));
  render(performance.now());
  requestAnimationFrame(() => render(performance.now()));
} else {
  requestAnimationFrame(frame);
}
