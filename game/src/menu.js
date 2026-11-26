// menu.js — the commercial shell around the flying: a title menu where
// every item opens its own screen — New Game, Continue, How to Play,
// Challenges, Pilot Stats and Settings — drawn here, wired in main.js.

import { VIEW_W, VIEW_H } from './config.js';
import { panel, rr, text, fitText, skyGradient } from './render.js';
import { CHALLENGES, challengeProgress, challengesDoneCount } from './challenges.js';
import { DIFFICULTIES } from './settings.js';

export const MENU_ITEMS = [
  { id: 'new', label: 'NEW GAME' },
  { id: 'continue', label: 'CONTINUE' },
  { id: 'howto', label: 'HOW TO PLAY' },
  { id: 'challenges', label: 'CHALLENGES' },
  { id: 'stats', label: 'PILOT STATS' },
  { id: 'settings', label: 'SETTINGS' },
];

export const MENU_BTN = (i) => ({ x: 440, y: 292 + i * 62, w: 400, h: 52 });
export const BACK_BTN = { x: 490, y: 644, w: 300, h: 56 };
export const SETTING_BTN = (i) => ({ x: 700, y: 208 + i * 108, w: 300, h: 56 });

function shellBackdrop(ctx, title, sub) {
  ctx.fillStyle = skyGradient(ctx);
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#14365a';
  ctx.fillRect(0, 628, VIEW_W, 92);
  panel(ctx, 90, 36, 1100, 592);
  text(ctx, title, VIEW_W / 2, 102, 38, '#ffe9b0', 'center', 800);
  if (sub) text(ctx, sub, VIEW_W / 2, 136, 18, '#cfe3f5', 'center', 600);
}

export function drawMenuHeader(ctx, G, now, hasSaveGame) {
  text(ctx, '9 islands · 12 cargoes · 6 days · storm cells · one beloved old seaplane', VIEW_W / 2, 272, 19, '#ffd76a', 'center', 700);
  if (hasSaveGame) {
    text(ctx, 'a saved week is waiting on the strip', VIEW_W / 2, 690, 16, '#cdbf9f', 'center', 600);
  }
}

export function drawHowTo(ctx) {
  shellBackdrop(ctx, 'HOW TO PLAY', 'one week, one seaplane, nine islands — here is the whole job');
  const colL = 140;
  const colR = 690;
  text(ctx, 'THE JOB', colL, 190, 22, '#ffb340', 'left', 800);
  const job = [
    'Each morning the chart table offers 3 order',
    'tickets. Pick one: the route line, distance,',
    'fuel estimate and deadline are drawn for you.',
    'Fly the leg, land on the far strip, get paid.',
    'Evenings: fuel, repairs and upgrades.',
  ];
  job.forEach((line, i) => text(ctx, line, colL, 222 + i * 27, 18, '#fff7e6', 'left', 600));

  text(ctx, 'CONTROLS', colR, 190, 22, '#ffb340', 'left', 800);
  const controls = [
    '→ / ←     throttle up / down',
    '↑ / ↓     pitch the nose up / down',
    'T          turn back after an overfly',
    'touch     on-screen NOSE and THR pads',
    'Take off past 33 m/s with the nose up.',
  ];
  controls.forEach((line, i) => text(ctx, line, colR, 222 + i * 27, 18, '#fff7e6', 'left', 600));

  text(ctx, 'THE SKY', colL, 396, 22, '#ffb340', 'left', 800);
  const sky = [
    'Wind moves your ground speed, not your',
    'airspeed. Storm cells shake the plane and',
    'eat the clock. Fuel burns with the throttle:',
    'a dry tank means a glide to the water and',
    'a tow fee — never the end of the week.',
  ];
  sky.forEach((line, i) => text(ctx, line, colL, 428 + i * 27, 18, '#fff7e6', 'left', 600));

  text(ctx, 'LANDING', colR, 396, 22, '#ffb340', 'left', 800);
  const landing = [
    'Come in slow and flat: under 46 m/s and',
    'sinking less than 4.5 m/s is a greased',
    'landing. Faster or steeper bends the HULL.',
    'On time pays +25%. Late still pays.',
    'The strip is long. Use all of it.',
  ];
  landing.forEach((line, i) => text(ctx, line, colR, 428 + i * 27, 18, '#fff7e6', 'left', 600));
}

export function drawChallenges(ctx, stats) {
  const done = challengesDoneCount(stats);
  shellBackdrop(ctx, 'CHALLENGES', `${done} of ${CHALLENGES.length} standing challenges flown`);
  CHALLENGES.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 130 + col * 520;
    const y = 168 + row * 92;
    const p = challengeProgress(stats, c);
    panel(ctx, x, y, 500, 80, p.done ? 'rgba(30,52,26,0.9)' : 'rgba(13,17,34,0.88)');
    text(ctx, c.name, x + 18, y + 30, 18, p.done ? '#a5d6a7' : '#fff7e6', 'left', 800);
    fitText(ctx, c.desc, x + 18, y + 54, 340, 15, '#cdbf9f', 'left', 600);
    text(ctx, p.done ? '✓ DONE' : `${p.current}/${p.goal}`, x + 482, y + 32, 17, p.done ? '#a5d6a7' : '#ffd76a', 'right', 800);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    rr(ctx, x + 330, y + 44, 150, 9, 4);
    ctx.fill();
    ctx.fillStyle = p.done ? '#a5d6a7' : '#ffb340';
    rr(ctx, x + 330, y + 44, Math.max(6, 150 * (p.current / p.goal)), 9, 4);
    ctx.fill();
  });
}

export function drawStats(ctx, stats, G) {
  shellBackdrop(ctx, 'PILOT STATS', 'the career the co-op keeps on you');
  const rows = [
    ['Legs flown', stats.legsFlown],
    ['Deliveries made', stats.deliveries],
    ['On-time deliveries', stats.onTime],
    ['Smooth landings', stats.smoothLandings],
    ['Water landings', stats.waterLandings],
    ['Total earned', `${stats.totalEarned} credits`],
    ['Best single day', `${stats.bestDayEarned} credits`],
    ['Heaviest cargo flown', `${stats.heaviestKg} kg`],
    ['Storm deliveries', stats.stormDeliveries],
    ['Days completed', `${stats.daysCompleted} of 6`],
  ];
  rows.forEach((row, i) => {
    const col = i % 2;
    const r = Math.floor(i / 2);
    const x = 150 + col * 500;
    const y = 208 + r * 78;
    text(ctx, row[0], x, y, 19, '#cdbf9f', 'left', 600);
    text(ctx, `${row[1]}`, x + 460, y, 26, '#fff7e6', 'right', 800);
  });
  text(ctx, `This week so far: day ${G.day + 1} · ${G.credits} credits in the purse · upgrades tank ${G.upgrades.tank} / engine ${G.upgrades.engine} / hold ${G.upgrades.hold}`, VIEW_W / 2, 610, 17, '#ffd76a', 'center', 700);
}

export function drawSettings(ctx, settings) {
  shellBackdrop(ctx, 'SETTINGS', 'changes apply from the next morning and are kept between visits');
  const diff = DIFFICULTIES.find((d) => d.id === settings.difficulty) ?? DIFFICULTIES[1];
  const rows = [
    { name: 'DIFFICULTY', value: diff.label, note: diff.note },
    { name: 'SOUND', value: settings.sound ? 'ON' : 'OFF', note: 'engine hum, chimes and thunder from the pocket synth' },
    { name: 'SAVE DATA', value: 'STORED LOCALLY', note: 'the week, the stats and these settings live in this browser' },
  ];
  rows.forEach((row, i) => {
    const y = 208 + i * 108;
    text(ctx, row.name, 150, y + 36, 22, '#ffb340', 'left', 800);
    text(ctx, row.value, 420, y + 36, 22, '#fff7e6', 'left', 800);
    text(ctx, row.note, 150, y + 68, 16, '#cdbf9f', 'left', 600);
  });
  text(ctx, 'Use the buttons on the right to change difficulty or sound.', 150, 560, 16, '#8fa8bf', 'left', 600);
}
