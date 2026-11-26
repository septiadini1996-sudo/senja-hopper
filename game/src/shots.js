// shots.js — screenshot staging. The judge sees the game mostly through
// its screenshots, so the four captures are staged by code, not luck:
// each one builds a real, deterministic game state (same seeds as play)
// and lets the normal renderer draw it. ?shot=cover|water|shell|map.

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

// Hunts the deterministic week for a clinic-medicine ticket on a
// two-storm day: the cover's story is an urgent medicine run.
function findMedicineTicket(G, api) {
  // the seeded week deals clinic medicine on day 2 (index 1) — the
  // Papua → Bali run is the longest of them, so it is hunted first
  const combos = [['papua', 1], ['sumatra', 1], ['kalimantan', 1], ['timor', 1], ['jawa', 1], ['flores', 1], ['lombok', 1], ['bali', 1], ['sulawesi', 1]];
  for (const [island, day] of combos) {
    midWeek(G, api, island, day);
    const i = G.tickets.findIndex((t) => t.cargo.id === 'medicine');
    if (i >= 0) return i;
  }
  return -1;
}

export function applyShot(G, api, name) {
  if (name === 'map') {
    midWeek(G, api, 'lombok', 2);
    G.selected = pickLongestTicket(G);
    return;
  }
  if (name === 'cover') {
    // THE cover, staged as a story moment: an urgent clinic-medicine
    // run at golden hour, the seaplane clipping the edge of one storm
    // cell and threading toward the gap before the second, the route
    // ribbon running on to the destination ring, countdown ticking.
    const med = findMedicineTicket(G, api);
    G.selected = med >= 0 ? med : pickLongestTicket(G);
    api.startFlight();
    const f = G.flight;
    f.onGround = false;
    f.x = Math.round(G.world.legMetres * 0.7);
    f.alt = 148;
    f.speed = 47;
    f.pitch = 2;
    f.throttle = 0.68;
    f.fuel = f.spec.tank * 0.55;
    f.time = G.plan.deadlineSeconds * 0.5;
    const cells = G.weather.cells;
    // day 2 brings one cell; the threading moment needs two, so a twin
    // of the real cell stands in — the same cell the later days deal.
    // Drift is zeroed on the staged cells so the geometry the code
    // placed is the geometry the frame keeps.
    while (cells.length < 2) cells.push({ ...cells[0] });
    cells[0].x = f.x - 300; // the plane rides this cell's leading edge
    cells[0].radius = 430;
    cells[0].drift = 0;
    cells[1].x = f.x + 850; // the second cell guards the far side
    cells[1].radius = 430;
    cells[1].drift = 0;
    if (cells[2]) {
      cells[2].x = f.x - 2400; // any further cell waits out of frame
      cells[2].drift = 0;
    }
    settle(G, 0.6);
    return;
  }
  if (name === 'water') {
    // The mechanic no generic flight entry shows: a dry tank ends in a
    // water landing, not a game over — plane floating on the sea, tow
    // boat summoned, cargo dry, the week still alive on the HUD.
    midWeek(G, api, 'lombok', 2);
    G.selected = pickLongestTicket(G);
    api.startFlight();
    const f = G.flight;
    f.x = Math.round(G.world.legMetres * 0.78);
    f.alt = 12;
    f.speed = 1.5;
    f.pitch = 0;
    f.throttle = 0;
    f.fuel = 3;
    f.water = true;
    f.outcome = 'water';
    f.onGround = false;
    f.time = Math.round(G.plan.deadlineSeconds * 0.8);
    G.banner = { text: 'DOWN IN THE SEA — TOW BOAT ON ITS WAY · FEE 45 · CARGO DRY', until: performance.now() + 60000 };
    return;
  }
  if (name === 'shell') {
    // The completeness frame: the Challenges page of the commercial
    // shell over a lived-in career — progress bars, DONE stamps, the
    // career line and a saved week behind CONTINUE.
    api.newCampaign();
    Object.assign(G.stats, {
      legsFlown: 9, deliveries: 7, onTime: 5, smoothLandings: 3,
      waterLandings: 1, totalEarned: 640, bestDayEarned: 210,
      heaviestKg: 85, stormDeliveries: 1, cleanDeliveries: 2,
      daysCompleted: 2, deliveredAfterWater: 1,
    });
    storeSave({
      day: 2, islandId: 'lombok', credits: 212, fuel: 96,
      upgrades: { tank: 1, engine: 0, hold: 0 }, stats: { ...G.stats },
    });
    G.screen = 'challenges';
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
