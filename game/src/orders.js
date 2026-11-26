// orders.js — the order tickets on the map table: who is shipping what,
// where to, what it pays, and the route plan the pilot studies before
// committing: distance, course, fuel estimate and deadline.

import { CARGO_TYPES, CUSTOMERS, ISLANDS, islandById, chartDistanceKm, chartCourseDeg, legLengthMetres } from './world.js';
import { PLANE } from './config.js';
import { pick, randInt, shuffled } from './random.js';

let ticketSeq = 0;

// Three tickets are offered each morning. Exactly one is flown that day,
// so the choice is the strategy: near and safe, or far and paying.
export function makeOrders(rng, dayIndex, fromId, holdKg) {
  const from = islandById(fromId);
  const others = shuffled(rng, ISLANDS.filter((i) => i.id !== fromId));
  const customers = shuffled(rng, CUSTOMERS);
  const tickets = [];
  const usedDest = new Set();
  for (let n = 0; n < 3; n++) {
    const dest = others.find((i) => !usedDest.has(i.id)) ?? others[n];
    usedDest.add(dest.id);
    const cargo = pick(rng, CARGO_TYPES);
    const kg = Math.min(holdKg, randInt(rng, cargo.kg[0], cargo.kg[1]));
    const km = chartDistanceKm(from, dest);
    let pay = 26 + km * 0.16 + kg * 0.5;
    if (cargo.fragile) pay *= 1.35;
    if (cargo.id === 'passenger') pay *= 1.2;
    pay *= 1 + dayIndex * 0.06; // later days, the co-op's rates improve
    tickets.push({
      id: `T${dayIndex + 1}-${++ticketSeq}`,
      customer: customers[n % customers.length],
      cargo,
      kg,
      from: from.id,
      to: dest.id,
      km,
      pay: Math.round(pay),
    });
  }
  return tickets;
}

// The plan the map screen draws: the line, the numbers, the verdict on fuel.
export function planRoute(ticket, tankLitres) {
  const from = islandById(ticket.from);
  const to = islandById(ticket.to);
  const km = chartDistanceKm(from, to);
  const metres = legLengthMetres(km);
  const cruise = 44; // m/s the plan assumes (the base engine's honest cruise)
  const estSeconds = Math.round(metres / cruise) + 38; // climb + approach
  // cruise burns at roughly 62% throttle; the plan adds a weather margin
  const estFuel = Math.round((metres / cruise) * PLANE.burnPerSecond * 0.62 * 1.25 + 10);
  return {
    km,
    course: chartCourseDeg(from, to),
    metres,
    estSeconds,
    estFuel,
    fuelOk: estFuel <= tankLitres,
    fuelMargin: tankLitres - estFuel,
    deadlineSeconds: Math.round(estSeconds * 1.6 + 45),
  };
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
