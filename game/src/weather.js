// weather.js — the sky over a leg: wind and storm cells, generated per
// campaign day so the week starts kind and ends honest.

import { WEATHER_RAMP } from './config.js';
import { randRange, randInt } from './random.js';

// Builds the weather for one leg. windX is the along-track wind in m/s:
// negative is a headwind (it slows the ground speed), positive a tailwind.
// Storm cells sit along the leg; inside one the air bumps the plane around.
export function makeWeather(rng, dayIndex, legMetres, windScale = 1) {
  const ramp = WEATHER_RAMP[Math.min(dayIndex, WEATHER_RAMP.length - 1)];
  const windSpeed = randRange(rng, 1.5, Math.max(2, ramp.windMax)) * windScale;
  const headwind = rng() < 0.62; // most days the trade wind is against you
  const windX = Math.round((headwind ? -windSpeed : windSpeed) * 10) / 10;
  const crosswind = Math.round(randRange(rng, 0, windSpeed * 0.55) * 10) / 10;

  const cells = [];
  for (let i = 0; i < ramp.storms; i++) {
    const frac = 0.3 + 0.45 * ((i + rng() * 0.7) / Math.max(1, ramp.storms));
    cells.push({
      x: Math.round(legMetres * Math.min(0.82, frac)),
      radius: Math.round(ramp.stormRadius * randRange(rng, 0.85, 1.2)),
      drift: randRange(rng, -1.2, 1.2), // m/s the cell wanders along the leg
      strength: randRange(rng, 0.7, 1.15),
    });
  }

  const windText = windX <= -0.5
    ? `headwind ${Math.abs(windX).toFixed(0)} m/s`
    : windX >= 0.5
      ? `tailwind ${windX.toFixed(0)} m/s`
      : 'calm air';
  const stormText = cells.length === 0
    ? 'no storm cells'
    : `${cells.length} storm cell${cells.length > 1 ? 's' : ''} on the route`;
  return { windX, crosswind, cells, summary: `${windText} · ${stormText}` };
}

// How hard the air is shaking the plane at a point: 0 in clear air, up to
// the cell's strength at its heart. Used by physics for turbulence.
export function turbulenceAt(weather, x, t) {
  let worst = 0;
  for (const cell of weather.cells) {
    const cx = cell.x + cell.drift * t;
    const d = Math.abs(x - cx);
    if (d < cell.radius) {
      const inside = 1 - d / cell.radius;
      worst = Math.max(worst, inside * cell.strength);
    }
  }
  return worst;
}

export function gustAt(weather, t) {
  // a slow breathing in the wind so no two seconds of a leg feel the same
  return Math.sin(t * 0.35) * 0.9 + Math.sin(t * 0.13 + 1.7) * 0.6;
}

export function describeWind(windX) {
  if (windX <= -0.5) return `HEADWIND ${Math.abs(windX).toFixed(0)}`;
  if (windX >= 0.5) return `TAILWIND ${windX.toFixed(0)}`;
  return 'CALM';
}

export { randInt };
