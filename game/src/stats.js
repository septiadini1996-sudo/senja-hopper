// stats.js — the pilot's career numbers, kept across the whole week
// (and across sessions, inside the save): legs, landings, earnings and
// the extremes the Challenges screen measures itself against.

export function freshStats() {
  return {
    legsFlown: 0,
    deliveries: 0,
    onTime: 0,
    smoothLandings: 0,
    waterLandings: 0,
    totalEarned: 0,
    bestDayEarned: 0,
    heaviestKg: 0,
    stormDeliveries: 0, // deliveries after real time inside a storm cell
    cleanDeliveries: 0, // deliveries with an untouched airframe
    daysCompleted: 0,
    deliveredAfterWater: 0,
    papuaDeliveries: 0,
  };
}

// Folds one finished leg into the career record. `leg` carries the
// flight's own facts; the money lines were already settled by main.
export function recordLeg(stats, leg) {
  stats.legsFlown += 1;
  if (leg.kind === 'water') {
    stats.waterLandings += 1;
    return stats;
  }
  if (leg.kind !== 'smooth' && leg.kind !== 'firm' && leg.kind !== 'hard') return stats;
  stats.deliveries += 1;
  if (leg.onTime) stats.onTime += 1;
  if (leg.kind === 'smooth') stats.smoothLandings += 1;
  if (leg.throughStorm) stats.stormDeliveries += 1;
  if (leg.damage === 0) stats.cleanDeliveries += 1;
  if (leg.kg > stats.heaviestKg) stats.heaviestKg = leg.kg;
  if (leg.hadWaterBefore) stats.deliveredAfterWater += 1;
  if (leg.toPapua) stats.papuaDeliveries += 1;
  const earned = Math.max(0, leg.pay + leg.bonus);
  stats.totalEarned += earned;
  if (earned > stats.bestDayEarned) stats.bestDayEarned = earned;
  return stats;
}

export function recordDayCompleted(stats) {
  stats.daysCompleted += 1;
  return stats;
}
