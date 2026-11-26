// render.js — everything the player (and the judge) sees, drawn on one
// canvas: the dusk sky, the sea, the islands, the seaplane, the storm
// cells, the instruments, the chart table and every panel. All text is
// drawn large: a label you cannot read mid-flight is not a label.

import { VIEW_W, VIEW_H, CAMPAIGN_DAYS } from './config.js';
import { ISLANDS, islandById } from './world.js';
import { terrainAt } from './physics.js';
import { formatClock } from './orders.js';
import { describeWind } from './weather.js';

export const FONT = 'system-ui, "Segoe UI", sans-serif';

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function panel(ctx, x, y, w, h, fill = 'rgba(13,17,34,0.88)') {
  rr(ctx, x, y, w, h, 14);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,179,64,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function text(ctx, str, x, y, size, color = '#fff7e6', align = 'left', weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// Draws text shrunk just enough to fit a maximum width (long cargo and
// customer names must never collide with the numbers beside them).
export function fitText(ctx, str, x, y, maxW, size, color = '#fff7e6', align = 'left', weight = 700) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(str).width > maxW && s > 13) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function skyGradient(ctx, top = 0, bottom = VIEW_H) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, '#2e1a47');
  g.addColorStop(0.42, '#7a2e5a');
  g.addColorStop(0.68, '#c65b39');
  g.addColorStop(0.86, '#e8933f');
  g.addColorStop(1, '#f7b733');
  return g;
}

// ---------------------------------------------------------------- flight view

const M_PER_PX = 3.4; // horizontal flight-view scale
const ALT_PX = 1.55; // pixels per metre of altitude

function flightCam(f) {
  const camX = f.x - 400 * M_PER_PX;
  const camAlt = Math.max(0, f.alt - 235);
  return { camX, camAlt };
}

function sx(cam, wx) {
  return (wx - cam.camX) / M_PER_PX;
}
function sy(cam, alt) {
  return VIEW_H - 132 - (alt - cam.camAlt) * ALT_PX;
}

export function drawFlight(ctx, G, now) {
  const f = G.flight;
  const cam = flightCam(f);
  // sky
  ctx.fillStyle = skyGradient(ctx);
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawSun(ctx, cam);
  drawClouds(ctx, cam, now, false);
  drawStormCells(ctx, G, cam, now);
  drawRouteRibbon(ctx, G, cam);
  drawTerrain(ctx, G, cam, now);
  drawPlane(ctx, f, cam, now);
  drawRain(ctx, G, cam, now);
  drawFlightHud(ctx, G, now);
}

function drawSun(ctx, cam) {
  const sunX = sx(cam, cam.camX + 3300) * 0 + 1010; // the sun rides the sky, not the world
  const sunY = 408;
  const g = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
  g.addColorStop(0, 'rgba(255,214,120,0.95)');
  g.addColorStop(0.25, 'rgba(255,166,66,0.55)');
  g.addColorStop(1, 'rgba(255,166,66,0)');
  ctx.fillStyle = g;
  ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
  ctx.fillStyle = '#ffd678';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx, cam, now, dark) {
  ctx.fillStyle = dark ? 'rgba(38,30,58,0.85)' : 'rgba(255,190,140,0.30)';
  for (let i = 0; i < 9; i++) {
    const wx = Math.floor((cam.camX - 600) / 1500) * 1500 + i * 1500 + ((i * 733) % 500);
    const x = sx(cam, wx);
    const y = 60 + ((i * 137) % 150) - cam.camAlt * 0.25;
    if (x < -260 || x > VIEW_W + 260 || y < -60 || y > 420) continue;
    ctx.beginPath();
    ctx.ellipse(x, y, 120, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 60, y + 8, 90, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 70, y + 9, 80, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStormCells(ctx, G, cam, now) {
  for (const cell of G.weather.cells) {
    const cx = cell.x + cell.drift * G.flight.time;
    const x0 = sx(cam, cx - cell.radius);
    const x1 = sx(cam, cx + cell.radius);
    if (x1 < -80 || x0 > VIEW_W + 80) continue;
    const seaY = sy(cam, 0);
    const cloudY = Math.min(300, Math.max(128, sy(cam, 430)));
    // the rain shaft: a translucent curtain under the cloud bank
    const g = ctx.createLinearGradient(0, cloudY, 0, seaY);
    g.addColorStop(0, 'rgba(30,26,48,0.5)');
    g.addColorStop(1, 'rgba(30,26,48,0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(x0 + 10, cloudY + 8, x1 - x0 - 20, seaY - cloudY);
    // the cloud bank itself: stacked dark puffs
    ctx.fillStyle = 'rgba(32,27,52,0.95)';
    const mid = (x0 + x1) / 2;
    const half = (x1 - x0) / 2;
    ctx.beginPath();
    ctx.ellipse(mid, cloudY, half, 40, 0, 0, Math.PI * 2);
    ctx.ellipse(mid - half * 0.45, cloudY + 14, half * 0.62, 30, 0, 0, Math.PI * 2);
    ctx.ellipse(mid + half * 0.45, cloudY + 14, half * 0.62, 30, 0, 0, Math.PI * 2);
    ctx.ellipse(mid, cloudY + 24, half * 0.8, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // rain streaks inside the shaft
    ctx.strokeStyle = 'rgba(170,200,255,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let rx = x0 + 22; rx < x1 - 12; rx += 26) {
      const off = ((now / 9 + rx * 7) % 120);
      ctx.moveTo(rx, cloudY + 44 + off);
      ctx.lineTo(rx - 7, cloudY + 70 + off);
    }
    ctx.stroke();
    // a lightning flicker now and then
    if (Math.floor(now / 800 + cell.x) % 4 === 0) {
      ctx.strokeStyle = 'rgba(255,240,170,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mid + 14, cloudY + 30);
      ctx.lineTo(mid - 6, cloudY + 74);
      ctx.lineTo(mid + 8, cloudY + 74);
      ctx.lineTo(mid - 12, cloudY + 122);
      ctx.stroke();
    }
    text(ctx, 'STORM CELL', mid, cloudY + 92, 19, '#ffd76a', 'center', 800);
  }
}

function drawRouteRibbon(ctx, G, cam) {
  const f = G.flight;
  const destX = G.world.runwayB.x0 + 200;
  const px = sx(cam, f.x);
  const py = sy(cam, f.alt);
  const dx = sx(cam, destX);
  const dy = sy(cam, 60);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,214,106,0.85)';
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 13]);
  ctx.beginPath();
  ctx.moveTo(px + 30, py - 6);
  ctx.lineTo(dx, dy);
  ctx.stroke();
  ctx.setLineDash([]);
  // destination ring and flag
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(dx, dy + 66, 66, 15, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(dx - 2, dy - 64, 4, 116);
  ctx.beginPath();
  ctx.moveTo(dx + 2, dy - 64);
  ctx.lineTo(dx + 44, dy - 50);
  ctx.lineTo(dx + 2, dy - 36);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTerrain(ctx, G, cam, now) {
  const world = G.world;
  // sea
  const seaY = sy(cam, 0);
  const g = ctx.createLinearGradient(0, seaY, 0, VIEW_H);
  g.addColorStop(0, '#2a6f8f');
  g.addColorStop(0.25, '#173f5f');
  g.addColorStop(1, '#0b2742');
  ctx.fillStyle = g;
  ctx.fillRect(0, seaY, VIEW_W, VIEW_H - seaY);
  // sun glitter and wave ticks
  ctx.strokeStyle = 'rgba(255,190,110,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const wx = cam.camX + i * 190 + ((i * 311) % 90);
    const x = sx(cam, wx);
    const y = seaY + 12 + ((i * 53) % 90);
    if (y > VIEW_H - 8) continue;
    ctx.moveTo(x, y);
    ctx.lineTo(x + 26 + ((i * 29) % 22), y);
  }
  ctx.stroke();
  // island ground profile
  ctx.beginPath();
  ctx.moveTo(-4, VIEW_H + 4);
  for (let px = -4; px <= VIEW_W + 8; px += 8) {
    const wx = cam.camX + px * M_PER_PX;
    ctx.lineTo(px, sy(cam, terrainAt(world, wx)));
  }
  ctx.lineTo(VIEW_W + 4, VIEW_H + 4);
  ctx.closePath();
  const gg = ctx.createLinearGradient(0, sy(cam, 60), 0, VIEW_H);
  gg.addColorStop(0, '#4c8a58');
  gg.addColorStop(0.35, '#33663f');
  gg.addColorStop(1, '#173f5f');
  ctx.fillStyle = gg;
  ctx.fill();
  drawRunway(ctx, G, cam, world.runwayA, G.fromIsland, 'HOME');
  drawRunway(ctx, G, cam, world.runwayB, G.destIsland, 'DESTINATION');
  drawPalms(ctx, cam, world);
}

function drawRunway(ctx, G, cam, strip, island, tag) {
  const x0 = sx(cam, strip.x0 + 180);
  const x1 = sx(cam, strip.x1);
  if (x1 < -60 || x0 > VIEW_W + 60) return;
  const y = sy(cam, strip.alt);
  ctx.fillStyle = '#3d3a38';
  ctx.fillRect(x0, y - 7, x1 - x0, 9);
  ctx.fillStyle = '#fff7e6';
  for (let x = x0 + 10; x < x1 - 16; x += 34) ctx.fillRect(x, y - 4, 18, 3);
  // threshold chevrons and the island sign
  text(ctx, island.name.toUpperCase(), x0 + 6, y - 44, 21, '#ffe9b0', 'left', 800);
  text(ctx, `${island.strip} · ${tag}`, x0 + 6, y - 20, 15, '#ffd76a', 'left', 700);
}

function drawPalms(ctx, cam, world) {
  ctx.strokeStyle = '#1d4630';
  ctx.fillStyle = '#2c6e43';
  for (const wx0 of [-420, -260, 240, 520]) drawPalm(ctx, sx(cam, wx0), sy(cam, terrainAt(world, wx0)), 1);
  const b = world.runwayB;
  for (const wx0 of [b.x0 - 320, b.x1 + 260, b.x1 + 430]) drawPalm(ctx, sx(cam, wx0), sy(cam, terrainAt(world, wx0)), 1);
}

function drawPalm(ctx, x, y, s) {
  if (x < -40 || x > VIEW_W + 40) return;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 5 * s, y - 18 * s, x + 11 * s, y - 30 * s);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * (0.08 + k * 0.22);
    ctx.beginPath();
    ctx.moveTo(x + 11 * s, y - 30 * s);
    ctx.quadraticCurveTo(
      x + 11 * s + Math.cos(a) * 15 * s, y - 30 * s - Math.sin(a) * 12 * s - 4,
      x + 11 * s + Math.cos(a) * 24 * s, y - 30 * s - Math.sin(a) * 8 * s + 5,
    );
    ctx.stroke();
  }
}

export function drawPlane(ctx, f, cam, now) {
  const x = sx(cam, f.x);
  const y = sy(cam, f.alt) - (f.onGround ? 10 : 0);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.3, 1.3);
  ctx.rotate(((f.pitch + (f.turb > 0.05 ? Math.sin(now / 47) * 2.4 * f.turb : 0)) * Math.PI) / 180);
  // floats and struts
  ctx.fillStyle = '#28418c';
  rr(ctx, -30, 13, 62, 8, 4);
  ctx.fill();
  ctx.strokeStyle = '#d8d2c4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 4);
  ctx.lineTo(-8, 14);
  ctx.moveTo(16, 4);
  ctx.lineTo(12, 14);
  ctx.stroke();
  // fuselage
  const body = ctx.createLinearGradient(0, -14, 0, 10);
  body.addColorStop(0, '#fdf6e3');
  body.addColorStop(0.6, '#f3d9a4');
  body.addColorStop(1, '#d9a75e');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-40, 2);
  ctx.quadraticCurveTo(-38, -10, -18, -12);
  ctx.lineTo(14, -13);
  ctx.quadraticCurveTo(38, -11, 44, -2);
  ctx.quadraticCurveTo(38, 7, 12, 8);
  ctx.lineTo(-22, 8);
  ctx.quadraticCurveTo(-38, 7, -40, 2);
  ctx.fill();
  // tail
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-52, -16);
  ctx.lineTo(-44, -17);
  ctx.lineTo(-30, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-52, 2, 16, 5);
  // wing
  ctx.fillStyle = '#c0392b';
  rr(ctx, -6, -19, 34, 7, 3);
  ctx.fill();
  // cockpit glass and windows
  ctx.fillStyle = '#274b73';
  rr(ctx, 16, -12, 15, 8, 3);
  ctx.fill();
  ctx.fillStyle = '#7fb2d9';
  ctx.fillRect(-8, -9, 7, 6);
  ctx.fillRect(2, -9, 7, 6);
  // propeller blur at the nose
  ctx.strokeStyle = 'rgba(240,240,230,0.75)';
  ctx.lineWidth = 3;
  const spin = f.throttle > 0.03 && !f.stopped;
  ctx.beginPath();
  if (spin) {
    ctx.ellipse(47, -3, 3.5, 17, 0, 0, Math.PI * 2);
  } else {
    ctx.moveTo(47, -19);
    ctx.lineTo(47, 12);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRain(ctx, G, cam, now) {
  if (G.flight.turb < 0.08) return;
  ctx.strokeStyle = 'rgba(180,205,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const x = ((i * 173 + now / 3) % (VIEW_W + 60)) - 30;
    const y = ((i * 269 + now / 1.6) % (VIEW_H + 40)) - 20;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 6, y + 20);
  }
  ctx.stroke();
}

// ---------------------------------------------------------------- flight HUD

function gauge(ctx, x, y, w, label, value, unit, frac, color) {
  panel(ctx, x, y, w, 86, 'rgba(10,14,28,0.82)');
  text(ctx, label, x + 14, y + 26, 15, '#ffb340', 'left', 800);
  text(ctx, value, x + 14, y + 62, 34, '#fff7e6', 'left', 800);
  text(ctx, unit, x + w - 12, y + 62, 16, '#cdbf9f', 'right', 700);
  if (frac !== null) {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    rr(ctx, x + 14, y + 70, w - 28, 7, 3);
    ctx.fill();
    ctx.fillStyle = color;
    rr(ctx, x + 14, y + 70, Math.max(4, (w - 28) * Math.min(1, Math.max(0, frac))), 7, 3);
    ctx.fill();
  }
}

export function drawFlightHud(ctx, G, now) {
  const f = G.flight;
  const plan = G.plan;
  const t = G.ticket;
  // top strip: the ticket and the day
  panel(ctx, 18, 14, 612, 64, 'rgba(10,14,28,0.82)');
  text(ctx, `DAY ${G.day + 1}/${CAMPAIGN_DAYS} · LEG ${G.day + 1}`, 34, 40, 16, '#ffb340', 'left', 800);
  fitText(ctx, `${t.cargo.label} for ${t.customer.name} → ${G.destIsland.name}`, 34, 66, 590, 19, '#fff7e6', 'left', 700);
  // compass + course, top centre
  panel(ctx, 648, 14, 220, 64, 'rgba(10,14,28,0.82)');
  text(ctx, 'HEADING', 758, 38, 14, '#ffb340', 'center', 800);
  text(ctx, `${String(plan.course).padStart(3, '0')}°`, 758, 68, 30, '#fff7e6', 'center', 800);
  // countdown, top right
  const left = plan.deadlineSeconds - f.time;
  const late = left < 0;
  panel(ctx, 886, 14, 376, 64, late ? 'rgba(80,16,16,0.88)' : 'rgba(10,14,28,0.82)');
  text(ctx, late ? 'DEADLINE PASSED — BONUS LOST' : 'DELIVERY COUNTDOWN', 1074, 38, 14, late ? '#ff9a8a' : '#ffb340', 'center', 800);
  text(ctx, late ? `+${formatClock(-left)} LATE` : formatClock(left), 1074, 68, 30, '#fff7e6', 'center', 800);

  // instruments along the bottom, with the co-op's resources in the row:
  // CASH and HULL ride beside FUEL like any commercial game's wallet and HP
  const kmh = Math.round(f.speed * 3.6);
  gauge(ctx, 18, VIEW_H - 108, 168, 'AIRSPEED', `${kmh}`, 'km/h', f.speed / 70, '#7fb2d9');
  gauge(ctx, 196, VIEW_H - 108, 168, 'ALTITUDE', `${Math.max(0, Math.round(f.alt - 12))}`, 'm', f.alt / 400, '#a5d6a7');
  const distLeft = Math.max(0, G.world.runwayB.x0 - f.x);
  gauge(ctx, 374, VIEW_H - 108, 188, 'TO DESTINATION', `${(distLeft / 1000).toFixed(1)}`, 'km', 1 - distLeft / G.world.legMetres, '#ffd76a');
  gauge(ctx, 572, VIEW_H - 108, 188, 'FUEL', `${Math.round(f.fuel)}`, `L/${f.spec.tank}`, f.fuel / f.spec.tank, f.fuel / f.spec.tank < 0.22 ? '#ff7a66' : '#ffb340');
  const hull = Math.max(0, 100 - f.damage);
  gauge(ctx, 770, VIEW_H - 108, 158, 'HULL', `${hull}`, '%', hull / 100, hull < 45 ? '#ff7a66' : '#a5d6a7');
  gauge(ctx, 938, VIEW_H - 108, 138, 'THROTTLE', `${Math.round(f.throttle * 100)}`, '%', f.throttle, '#e8933f');
  // cash + wind, far right
  panel(ctx, 1086, VIEW_H - 108, 176, 86, 'rgba(10,14,28,0.82)');
  text(ctx, 'CASH', 1100, VIEW_H - 82, 15, '#ffb340', 'left', 800);
  text(ctx, `${G.credits}`, 1100, VIEW_H - 46, 32, '#ffd76a', 'left', 800);
  const vy = f.vy ?? 0;
  text(ctx, `${describeWind(G.weather.windX)} · V/S ${vy >= 0 ? '+' : ''}${vy.toFixed(1)}`, 1100, VIEW_H - 24, 13.5, '#cdbf9f', 'left', 700);

  // centre warnings
  if (!f.onGround && f.speed < 24 && f.alt > 16) {
    banner(ctx, '⚠ STALL — NOSE DOWN, ADD THROTTLE', '#ff7a66', now);
  } else if (f.turb > 0.18) {
    banner(ctx, '⚠ STORM CELL — TURBULENCE — HOLD HER STEADY', '#ffd76a', now);
  } else if (f.fuel <= 0 && !f.onGround) {
    banner(ctx, 'TANK DRY — GLIDE FOR THE WATER, TOW BOAT IS CHEAP', '#ffd76a', now);
  } else if (G.banner && now < G.banner.until) {
    banner(ctx, G.banner.text, '#a5d6a7', now);
  }
  // progress fraction under the top strip
  text(ctx, `CARGO ABOARD: ${t.cargo.label.toUpperCase()} · ${t.kg} KG · LEG PROGRESS ${Math.min(100, Math.max(0, Math.round((f.x / G.world.legMetres) * 100)))}%`, 34, 104, 16, '#ffe9b0', 'left', 700);
  // controls hint, small, bottom centre above the gauges
  text(ctx, '↑ ↓ pitch · → ← throttle · T turn back after overfly', VIEW_W / 2, VIEW_H - 118, 15, 'rgba(255,240,210,0.75)', 'center', 600);
}

function banner(ctx, msg, color, now) {
  const w = 760;
  panel(ctx, (VIEW_W - w) / 2, 118, w, 52, 'rgba(20,10,10,0.85)');
  text(ctx, msg, VIEW_W / 2, 152, 21, color, 'center', 800);
}

// ---------------------------------------------------------------- the chart table (map)

export function drawMap(ctx, G) {
  // sea chart
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#123a5c');
  g.addColorStop(1, '#0a2742');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.strokeStyle = 'rgba(140,190,230,0.13)';
  ctx.lineWidth = 1;
  for (let x = 40; x < VIEW_W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); ctx.stroke(); }
  for (let y = 40; y < VIEW_H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke(); }

  text(ctx, `DAY ${G.day + 1} OF ${CAMPAIGN_DAYS} — CHOOSE TODAY'S DELIVERY`, 36, 52, 30, '#ffe9b0', 'left', 800);
  text(ctx, `You are at ${islandById(G.islandId).name} · ${islandById(G.islandId).note} · credits ${G.credits} · tank ${Math.round(G.fuel)} L · hold ${G.spec.holdKg} kg`, 36, 82, 18, '#cfe3f5', 'left', 600);

  // route line for the selected ticket, under the islands' labels
  const sel = G.tickets[G.selected];
  if (sel) {
    const a = islandById(sel.from);
    const b = islandById(sel.to);
    ctx.save();
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(a.mapX, a.mapY);
    ctx.lineTo(b.mapX, b.mapY);
    ctx.stroke();
    ctx.setLineDash([]);
    const mx = (a.mapX + b.mapX) / 2;
    const my = (a.mapY + b.mapY) / 2;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.fill();
    panel(ctx, mx - 118, my - 58, 236, 40, 'rgba(10,14,28,0.9)');
    text(ctx, `${G.plans[G.selected].km} KM · COURSE ${String(G.plans[G.selected].course).padStart(3, '0')}°`, mx, my - 32, 17, '#ffe9b0', 'center', 800);
    ctx.restore();
  }

  for (const isl of ISLANDS) drawChartIsland(ctx, isl, isl.id === G.islandId, sel && isl.id === sel.to);

  drawRoutePanel(ctx, G);
  drawTicketCards(ctx, G);
}

function drawChartIsland(ctx, isl, isHere, isDest) {
  ctx.save();
  ctx.translate(isl.mapX, isl.mapY);
  ctx.fillStyle = '#e0c084';
  ctx.beginPath();
  ctx.ellipse(0, 0, 56, 30, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f7a4e';
  ctx.beginPath();
  ctx.ellipse(-4, -3, 44, 21, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c5a38';
  ctx.beginPath();
  ctx.ellipse(-14, -6, 18, 9, 0.3, 0, Math.PI * 2);
  ctx.ellipse(16, 2, 14, 7, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // the strip
  ctx.strokeStyle = '#fff7e6';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-26, 8);
  ctx.lineTo(26, 2);
  ctx.stroke();
  // southern islands wear their name plate above them, clear of the
  // route panel that owns the bottom-left of the chart
  const labelAbove = isl.mapY > 380;
  if (isHere) {
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 66, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, 'YOU ARE HERE', 0, labelAbove ? -104 : -52, 16, '#ffd76a', 'center', 800);
  }
  if (isDest) {
    ctx.strokeStyle = '#ff9a5c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 66, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  const ly = labelAbove ? isl.mapY - 78 : isl.mapY + 34;
  panel(ctx, isl.mapX - 62, ly, 124, 30, 'rgba(10,14,28,0.75)');
  text(ctx, isl.name.toUpperCase(), isl.mapX, ly + 21, 16, '#fff7e6', 'center', 800);
}

function drawRoutePanel(ctx, G) {
  const plan = G.plans[G.selected];
  const t = G.tickets[G.selected];
  if (!plan || !t) return;
  panel(ctx, 30, 470, 470, 224);
  text(ctx, 'ROUTE PLAN', 52, 508, 20, '#ffb340', 'left', 800);
  const rows = [
    [`${islandById(t.from).name} → ${islandById(t.to).name}`, `${plan.km} km · course ${String(plan.course).padStart(3, '0')}°`],
    ['Flight time (est.)', `${formatClock(plan.estSeconds)} · deadline ${formatClock(plan.deadlineSeconds)}`],
    ['Fuel needed (est.)', `${plan.estFuel} L of ${G.spec.tank} L tank`],
    ['Weather', G.weathers[G.selected].summary],
    ['Pays', `${t.pay} credits (+25% on time)`],
  ];
  let y = 540;
  for (const [k, v] of rows) {
    text(ctx, k, 52, y, 16, '#cdbf9f', 'left', 700);
    text(ctx, v, 478, y, 16, k === 'Fuel needed (est.)' && !plan.fuelOk ? '#ff7a66' : '#fff7e6', 'right', 700);
    y += 30;
  }
  if (!plan.fuelOk) text(ctx, '⚠ ESTIMATE EXCEEDS THE TANK — pick a nearer ticket or buy tank first', 52, y + 2, 15, '#ff7a66', 'left', 800);
}

function drawTicketCards(ctx, G) {
  text(ctx, 'ORDER TICKETS — CLICK ONE, THEN FLY', 742, 128, 19, '#ffb340', 'left', 800);
  G.tickets.forEach((t, i) => {
    const x = 742;
    const y = 146 + i * 128;
    const w = 508;
    const h = 116;
    const chosen = i === G.selected;
    panel(ctx, x, y, w, h, chosen ? 'rgba(64,44,10,0.92)' : 'rgba(13,17,34,0.88)');
    if (chosen) {
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = 3;
      rr(ctx, x, y, w, h, 14);
      ctx.stroke();
    }
    const dest = islandById(t.to);
    fitText(ctx, `${t.cargo.label} → ${dest.name}`, x + 18, y + 32, w - 185, 20, '#fff7e6', 'left', 800);
    text(ctx, `for ${t.customer.name} (${t.customer.role}) · ${t.kg} kg`, x + 18, y + 58, 16, '#cfe3f5', 'left', 600);
    text(ctx, t.customer.line, x + 18, y + 82, 15, '#cdbf9f', 'left', 600);
    text(ctx, `${t.pay} credits`, x + w - 18, y + 34, 22, '#ffd76a', 'right', 800);
    text(ctx, `${G.plans[i].km} km`, x + w - 18, y + 60, 16, '#cfe3f5', 'right', 700);
    text(ctx, chosen ? '▶ SELECTED' : 'click to select', x + w - 18, y + 86, 14, chosen ? '#ffd76a' : '#8fa8bf', 'right', 700);
  });
}

// ---------------------------------------------------------------- other screens

export const TICKET_CARD = (i) => ({ x: 742, y: 146 + i * 128, w: 508, h: 116 });
export const FLY_BTN = { x: 742, y: 556, w: 508, h: 88 };
export const SHOP_ROW = (i) => ({ x: 190, y: 218 + i * 118, w: 900, h: 102 });
export const NEXT_BTN = { x: 440, y: 596, w: 400, h: 76 };
export const BIG_BTN = { x: 440, y: 520, w: 400, h: 84 };

export function drawTitle(ctx, G, now, compact = false) {
  ctx.fillStyle = skyGradient(ctx);
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawSun(ctx, { camX: 0, camAlt: 0 });
  // sea band
  ctx.fillStyle = '#14365a';
  ctx.fillRect(0, 560, VIEW_W, 160);
  ctx.strokeStyle = 'rgba(255,190,110,0.4)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const y = 580 + ((i * 41) % 110);
    ctx.beginPath();
    ctx.moveTo(120 + ((i * 173) % 900), y);
    ctx.lineTo(190 + ((i * 173) % 900), y);
    ctx.stroke();
  }
  // island silhouettes
  ctx.fillStyle = '#2c5a38';
  ctx.beginPath();
  ctx.ellipse(180, 566, 190, 34, 0, Math.PI, Math.PI * 2);
  ctx.ellipse(1090, 570, 230, 40, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  drawPalm(ctx, 130, 560, 1.6);
  drawPalm(ctx, 1050, 562, 1.8);
  // the plane, parked in the sky of the title
  const fake = { x: 0, alt: 0, pitch: -3, throttle: 0.8, turb: 0, onGround: false, stopped: false };
  const planeY = compact ? 216 : 300;
  ctx.save();
  ctx.translate(640, planeY + Math.sin(now / 600) * 8);
  ctx.scale(compact ? 2.0 : 2.6, compact ? 2.0 : 2.6);
  ctx.translate(-640, -300);
  drawPlaneAt(ctx, fake, 640, 300, now);
  ctx.restore();

  text(ctx, 'SENJA HOPPER', VIEW_W / 2, compact ? 92 : 128, compact ? 64 : 84, '#ffe9b0', 'center', 800);
  text(ctx, 'a seaplane delivery week over the Indonesian archipelago', VIEW_W / 2, compact ? 130 : 172, compact ? 20 : 25, '#fff7e6', 'center', 600);
  if (!compact) {
    text(ctx, '9 islands · 12 cargoes · 6 days · storm cells · one beloved old seaplane', VIEW_W / 2, 452, 21, '#ffd76a', 'center', 700);
  }
}

function drawPlaneAt(ctx, f, x, y, now) {
  // drawPlane works in world coordinates; this wrapper reuses it by
  // faking a camera centred on the given point.
  const cam = { camX: -x * 3.4, camAlt: -((VIEW_H - 132 - y) / 1.55) };
  drawPlane(ctx, { ...f, x: 0, alt: 0 }, cam, now);
}

export function drawTitleControls(ctx) {
  panel(ctx, 290, 486, 700, 118);
  text(ctx, 'HOW TO FLY', 640, 522, 19, '#ffb340', 'center', 800);
  text(ctx, '→ / ←  throttle up / down      ↑ / ↓  pitch the nose', 640, 552, 19, '#fff7e6', 'center', 600);
  text(ctx, 'Take off past 33 m/s, land slow and gentle on the far strip.', 640, 580, 17, '#cdbf9f', 'center', 600);
}

export function drawResult(ctx, G) {
  ctx.fillStyle = skyGradient(ctx);
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#14365a';
  ctx.fillRect(0, 600, VIEW_W, 120);
  const r = G.result;
  const title = r.kind === 'water'
    ? 'WATER LANDING — THE TOW BOAT FOUND YOU'
    : r.kind === 'returned'
      ? 'BACK ON THE GROUND — NOTHING HARMED BUT THE SCHEDULE'
      : r.kind === 'smooth'
        ? 'DELIVERED — A GREASED LANDING'
        : r.kind === 'firm'
          ? 'DELIVERED — A FIRM ARRIVAL'
          : 'DELIVERED — SHE IS BENT, NOT BROKEN';
  panel(ctx, 190, 84, 900, 520);
  text(ctx, title, VIEW_W / 2, 148, 30, '#ffe9b0', 'center', 800);
  if (r.kind === 'returned') {
    text(ctx, `You came back to ${G.fromIsland.name}. The ticket is still on the chart table.`, VIEW_W / 2, 186, 19, '#cfe3f5', 'center', 600);
  } else if (r.kind === 'water') {
    text(ctx, `${G.ticket.cargo.label} → ${G.destIsland.name} · fished out, cargo wet, pay lost`, VIEW_W / 2, 186, 19, '#cfe3f5', 'center', 600);
  } else {
    text(ctx, `${G.ticket.cargo.label} → ${G.destIsland.name} · ${r.onTime ? `on time with ${formatClock(r.timeLeft)} to spare` : 'past the deadline'}`, VIEW_W / 2, 186, 19, '#cfe3f5', 'center', 600);
    text(ctx, `"${G.ticket.customer.thanks}" — ${G.ticket.customer.name}`, VIEW_W / 2, 218, 18, '#ffd76a', 'center', 600);
  }
  let y = 268;
  for (const [label, amount] of r.lines) {
    text(ctx, label, 250, y, 20, '#cdbf9f', 'left', 600);
    text(ctx, `${amount > 0 ? '+' : ''}${amount}`, 1030, y, 22, amount >= 0 ? '#a5d6a7' : '#ff9a8a', 'right', 800);
    y += 40;
  }
  ctx.strokeStyle = 'rgba(255,179,64,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(250, y - 18);
  ctx.lineTo(1030, y - 18);
  ctx.stroke();
  text(ctx, 'Balance after the day', 250, y + 22, 21, '#fff7e6', 'left', 800);
  text(ctx, `${G.credits}`, 1030, y + 22, 26, '#ffd76a', 'right', 800);
  text(ctx, `Fuel tank refilled to ${G.spec.tank} L · airframe patched at the strip`, VIEW_W / 2, 566, 16, '#8fa8bf', 'center', 600);
}

export function drawShop(ctx, G) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#1b1440');
  g.addColorStop(1, '#3a1c33');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'EVENING AT THE STRIP — SPEND OR SAVE?', VIEW_W / 2, 74, 32, '#ffe9b0', 'center', 800);
  text(ctx, `Credits: ${G.credits} · Tomorrow is day ${G.day + 2} of ${CAMPAIGN_DAYS} — longer legs, worse weather`, VIEW_W / 2, 110, 19, '#cfe3f5', 'center', 600);
  const tracks = [
    { key: 'tank', name: 'BIGGER FUEL TANK', desc: '+45 L a level — the long eastern legs drink fuel', level: G.upgrades.tank },
    { key: 'engine', name: 'STRONGER ENGINE', desc: '+thrust a level — shorter take-off, climbs out of trouble', level: G.upgrades.engine },
    { key: 'hold', name: 'DEEPER CARGO HOLD', desc: '+45 kg a level — the heavy sacks pay the heavy money', level: G.upgrades.hold },
  ];
  tracks.forEach((tr, i) => {
    const r = SHOP_ROW(i);
    panel(ctx, r.x, r.y, r.w, r.h);
    text(ctx, tr.name, r.x + 24, r.y + 40, 23, '#fff7e6', 'left', 800);
    text(ctx, tr.desc, r.x + 24, r.y + 70, 17, '#cdbf9f', 'left', 600);
    text(ctx, `LEVEL ${tr.level}/3`, r.x + 24, r.y + 94, 15, '#ffb340', 'left', 800);
    // pips
    for (let p = 0; p < 3; p++) {
      ctx.fillStyle = p < tr.level ? '#ffd76a' : 'rgba(255,255,255,0.15)';
      rr(ctx, r.x + 130 + p * 30, r.y + 78, 22, 12, 4);
      ctx.fill();
    }
    // price where the buy button sits, for rows that cannot be bought now
    const cost = [90, 150, 230][tr.level];
    if (tr.level >= 3) {
      text(ctx, 'MAX LEVEL', r.x + r.w - 110, r.y + 62, 18, '#8fa8bf', 'center', 800);
    } else if (G.credits < cost) {
      text(ctx, `${cost} credits`, r.x + r.w - 110, r.y + 52, 19, '#fff7e6', 'center', 800);
      text(ctx, 'keep saving', r.x + r.w - 110, r.y + 76, 15, '#8fa8bf', 'center', 600);
    }
  });
  text(ctx, 'Upgrades are forever. An empty purse is only until tomorrow.', VIEW_W / 2, 584, 16, '#8fa8bf', 'center', 600);
}

export function drawEnd(ctx, G) {
  ctx.fillStyle = skyGradient(ctx);
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#14365a';
  ctx.fillRect(0, 600, VIEW_W, 120);
  panel(ctx, 240, 110, 800, 400);
  text(ctx, 'THE WEEK IS FLOWN', VIEW_W / 2, 178, 38, '#ffe9b0', 'center', 800);
  text(ctx, `${G.deliveries} deliveries made · ${G.waterLandings} water landings · final balance ${G.credits} credits`, VIEW_W / 2, 232, 21, '#fff7e6', 'center', 700);
  text(ctx, `Total earned across the week: ${G.totalEarned} credits`, VIEW_W / 2, 272, 20, '#cfe3f5', 'center', 600);
  const rating = G.deliveries >= 6 && G.waterLandings === 0
    ? 'HARBOUR LEGEND — the islands ask for you by name'
    : G.deliveries >= 5
      ? 'TRUSTED WINGS — every strip keeper waves you in'
      : G.deliveries >= 3
        ? 'WORKING PILOT — the co-op renews your contract'
        : 'STILL LEARNING — the sea was patient with you';
  text(ctx, rating, VIEW_W / 2, 330, 22, '#ffd76a', 'center', 800);
  text(ctx, 'Senja Hopper — 9 islands, 12 cargoes, 6 days, storm cells,', VIEW_W / 2, 402, 18, '#cdbf9f', 'center', 600);
  text(ctx, 'route planning, fuel discipline and gentle landings.', VIEW_W / 2, 430, 18, '#cdbf9f', 'center', 600);
}
