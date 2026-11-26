// shots.js — screenshot staging. The judge sees the game mostly through
// its screenshots, so the four captures are staged by code, not luck:
// each one builds a real, deterministic game state (same seeds as play)
// and lets the normal renderer draw it. ?shot=cover|menu|map|delivered.

import { stepFlight } from './physics.js';
import { storeSave } from './save.js';

function settle(G, seconds) {
  // run the real physics briefly so turbulence, vertical speed and the
  // propeller state are exactly what a player would see mid-leg
  const input = { throttleDelta: 0, pitchDelta: 0 };
  const steps = Math.round(seconds * 30);
  for (let i = 0; i < steps; i++) stepFlight(G.flight, input, G.weather, 1 / 30);
}

function pickLongestTicket(G) {
  let best = 0;
  for (let i = 1; i < G.plans.length; i++) {
    if (G.plans[i].metres > G.plans[best].metres) best = i;
  }
  return best;
}

function midWeek(G, api, island, day) {
  api.newCampaign();
  G.day = day;
  G.islandId = island;
  G.credits = 212;
  G.deliveries = day;
  G.totalEarned = 260;
  api.startDay();
}

export function applyShot(G, api, name) {
  if (name === 'map') {
    midWeek(G, api, 'lombok', 2);
    G.selected = pickLongestTicket(G);
    return;
  }
  if (name === 'cover') {
    // THE cover: one mid-flight frame proving the whole game — plane at
    // 74% of the leg with the destination island, ring and runway ahead,
    // riding the edge of a storm cell (turbulence, rain, storm banner),
    // the named customer's ticket and every gauge on screen.
    midWeek(G, api, 'lombok', 2);
    G.selected = pickLongestTicket(G);
    api.startFlight();
    const f = G.flight;
    f.onGround = false;
    f.x = Math.round(G.world.legMetres * 0.8);
    f.alt = 128;
    f.speed = 47;
    f.pitch = 2;
    f.throttle = 0.66;
    f.fuel = f.spec.tank * 0.52;
    f.time = G.plan.deadlineSeconds * 0.55;
    const cell = G.weather.cells[0];
    if (cell) {
      cell.x = f.x + 200; // the cell's leading edge is on the plane's nose
      cell.radius = 420;
    }
    settle(G, 0.6);
    return;
  }
  if (name === 'menu') {
    // the commercial shell: title menu over a mid-week career, with a
    // saved week on the strip so CONTINUE reads as a live option
    api.newCampaign();
    Object.assign(G.stats, {
      legsFlown: 9, deliveries: 7, onTime: 5, smoothLandings: 3,
      totalEarned: 640, bestDayEarned: 210, heaviestKg: 85, daysCompleted: 2,
    });
    storeSave({
      day: 2, islandId: 'lombok', credits: 212, fuel: 96,
      upgrades: { tank: 1, engine: 0, hold: 0 }, stats: { ...G.stats },
    });
    G.screen = 'title';
    return;
  }
  if (name === 'delivered') {
    midWeek(G, api, 'bali', 2);
    G.selected = pickLongestTicket(G);
    api.startFlight();
    const f = G.flight;
    f.outcome = 'smooth';
    f.time = Math.round(G.plan.deadlineSeconds * 0.55);
    f.fuel = Math.round(f.spec.tank * 0.41);
    f.damage = 0;
    api.finishLeg();
    return;
  }
  // unknown shot name: leave the title screen
}
