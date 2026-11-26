// physics.js — the flight model and the leg's terrain. Pure logic, no
// canvas and no DOM: the same step function the game loop calls is flown
// headlessly by the build tests, so what is tested is what is played.
//
// The model is an arcade flight model with real discipline in it: thrust,
// drag and gravity along the flight path, a wing that stalls below its
// speed, wind that moves the ground speed, storm turbulence, and a
// touchdown judge that reads sink rate and speed. Nothing here ends the
// campaign: the worst landing costs money and pride, never progress.

import { PLANE, LANDING } from './config.js';
import { turbulenceAt, gustAt } from './weather.js';

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// The world of one leg: two island plateaus at 12 m with flat runways,
// open sea between them. legMetres is the sky between the runway starts.
export function makeLegWorld(plan) {
  const L = plan.metres + 490;
  return {
    legMetres: L,
    runwayA: { x0: -700, x1: 430, alt: 12 },
    runwayB: { x0: L - 60, x1: L + 570, alt: 12 },
    destStart: L - 60 - 570, // ground of the destination island begins here
  };
}

export function terrainAt(world, x) {
  const a = world.runwayA;
  const b = world.runwayB;
  // origin island: flat behind and on the runway, falling to the sea after it
  const heightA = x <= a.x1 ? a.alt : a.alt * (1 - smoothstep(a.x1, a.x1 + 570, x));
  // destination island: rises out of the sea, holds its plateau across the
  // runway, then falls back to the sea behind it
  let heightB;
  if (x < b.x0) heightB = b.alt * smoothstep(b.x0 - 570, b.x0, x);
  else if (x <= b.x1) heightB = b.alt;
  else heightB = b.alt * (1 - smoothstep(b.x1, b.x1 + 570, x));
  return Math.max(0, heightA, heightB);
}

export function planeSpecFor(upgrades) {
  return {
    tank: PLANE.baseTankLitres + upgrades.tank * PLANE.tankPerUpgrade,
    thrust: PLANE.baseThrust + upgrades.engine * PLANE.thrustPerUpgrade,
    holdKg: PLANE.baseHoldKg + upgrades.hold * PLANE.holdPerUpgrade,
  };
}

export function newFlight(spec, world, fuelLitres) {
  return {
    x: -140,
    alt: world.runwayA.alt,
    speed: 0, // airspeed along the flight path, m/s
    pitch: 0, // degrees, nose up positive
    throttle: 0,
    fuel: fuelLitres,
    damage: 0,
    onGround: true,
    water: false,
    stopped: false,
    outcome: null, // 'smooth' | 'firm' | 'hard' | 'water' | 'rough'
    bounced: 0,
    time: 0,
    maxAlt: 0,
    turb: 0,
    spec,
    world,
  };
}

// Places the plane on a fresh approach after an overfly: forgiving, costs
// a little time, never a restart of the leg.
export function resetApproach(f, world) {
  f.x = world.runwayB.x0 - 2500;
  f.alt = 210;
  f.speed = 50;
  f.pitch = 0;
  f.onGround = false;
  f.time += 25;
}

// input: { throttleDelta: -1..1 held keys, pitchDelta: -1..1 }
// Returns a list of event strings for the game layer ('takeoff', 'stall',
// 'touchdown', 'bounce', 'splashdown', 'overfly').
export function stepFlight(f, input, weather, dt) {
  const events = [];
  const spec = f.spec;
  f.time += dt;

  // throttle lever moves toward the held direction, or holds its setting
  if (input.throttleDelta) {
    f.throttle = clamp(f.throttle + input.throttleDelta * dt * 0.55, 0, 1);
  }
  if (f.fuel <= 0) f.throttle = 0;

  // pitch follows the stick, slower on the ground until there is airflow
  const pitchRate = f.onGround ? 14 : 42;
  if (input.pitchDelta) {
    f.pitch = clamp(f.pitch + input.pitchDelta * pitchRate * dt, -14, 19);
  }

  const pitchRad = (f.pitch * Math.PI) / 180;
  const drag = PLANE.cruiseDrag * f.speed * Math.abs(f.speed);
  const thrust = f.throttle * spec.thrust * (f.damage >= 60 ? 0.55 : 1);
  const along = thrust - drag - 9.8 * Math.sin(pitchRad) * (f.onGround ? 0 : 1);
  f.speed = Math.max(0, f.speed + along * dt);
  if (f.onGround) {
    // rolling friction and brakes when the lever is at idle
    f.speed = Math.max(0, f.speed - (f.throttle < 0.05 ? 7.5 : 1.1) * dt);
  }

  // fuel burn follows the lever
  if (f.throttle > 0 && f.fuel > 0) {
    f.fuel = Math.max(0, f.fuel - f.throttle * PLANE.burnPerSecond * dt);
  }

  const turb = turbulenceAt(weather, f.x, f.time);
  f.turb = turb;
  const gust = gustAt(weather, f.time) * (0.4 + turb);

  if (f.onGround) {
    f.alt = terrainAt(f.world, f.x);
    const rotateSpeed = 33;
    if (f.speed > rotateSpeed && f.pitch > 4) {
      f.onGround = false;
      events.push('takeoff');
    }
  } else {
    // vertical speed from the flight path, with the stall taking its tax
    let vy = f.speed * Math.sin(pitchRad);
    if (f.speed < PLANE.stallSpeed) {
      vy -= (PLANE.stallSpeed - f.speed) * 0.62;
      f.pitch = Math.max(-14, f.pitch - 16 * dt); // the nose drops away
      events.push('stall');
    }
    // storm turbulence: a shaking hand on the stick, deterministic wobble
    if (turb > 0.02) {
      vy += Math.sin(f.time * 11.3) * 5.2 * turb + Math.sin(f.time * 23.7) * 2.1 * turb;
    }
    f.alt += vy * dt;
    f.vy = vy;
    if (f.alt > 1250) f.alt = 1250;
    f.maxAlt = Math.max(f.maxAlt, f.alt);

    const ground = terrainAt(f.world, f.x);
    if (f.alt <= ground) {
      f.alt = ground;
      const outcome = judgeTouchdown(f, vy);
      events.push(...outcome.events);
      if (outcome.bounce) {
        f.alt = ground + 6;
        f.vy = 3;
        f.bounced += 1;
      } else {
        f.onGround = true;
        f.outcome = outcome.kind;
        f.damage = Math.min(100, f.damage + outcome.damage);
        if (outcome.kind === 'water') f.water = true;
      }
    }
  }

  const groundSpeed = f.speed * Math.cos(pitchRad) + weather.windX + gust * 0.4;
  f.groundSpeed = f.onGround ? f.speed : groundSpeed;
  f.x += f.groundSpeed * dt;

  if (!f.onGround && f.x > f.world.runwayB.x1 + 420 && !f.overflown) {
    f.overflown = true;
    events.push('overfly');
  }
  if (f.onGround && f.speed < 0.4 && f.throttle < 0.05) f.stopped = true;
  return events;
}

// Reads a touchdown the way an instructor would: where, how fast down,
// how fast along. Only the destination island counts as a delivery.
function judgeTouchdown(f, vy) {
  const world = f.world;
  const sink = -vy;
  // open water: past the origin island's falling shore, wherever the
  // terrain has fully given up to the sea (the far side of the destination
  // island included — flying past it and splashing down is a water landing)
  const overSea = terrainAt(world, f.x) <= 0.01 && f.x > world.runwayA.x1 + 570;
  if (overSea) {
    const heavy = sink > 9;
    return {
      kind: 'water',
      damage: heavy ? 26 : 8,
      bounce: false,
      events: ['splashdown'],
    };
  }
  const onDestination = f.x >= world.destStart;
  if (sink <= LANDING.maxSinkRate && f.speed <= LANDING.maxTouchdownSpeed) {
    return { kind: onDestination ? 'smooth' : 'ground', damage: 0, bounce: false, events: ['touchdown'] };
  }
  if (sink <= LANDING.bounceSinkRate) {
    return { kind: onDestination ? 'firm' : 'ground', damage: 9, bounce: false, events: ['touchdown'] };
  }
  // a genuinely hard arrival: bounce back into the air if there is speed
  if (f.speed > PLANE.stallSpeed + 6) {
    return { kind: 'hard', damage: 16, bounce: true, events: ['bounce'] };
  }
  return { kind: onDestination ? 'hard' : 'ground', damage: 20, bounce: false, events: ['touchdown'] };
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
