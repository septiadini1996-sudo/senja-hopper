// challenges.js — the co-op's standing challenges: concrete goals a
// pilot can chase across the week, each with a live progress reading
// taken from the career stats. The Challenges screen draws this list;
// a challenge is done when its reading reaches its goal.

export const CHALLENGES = [
  { id: 'storm-runner', name: 'STORM RUNNER', desc: 'Deliver after flying through a storm cell', goal: 1, read: (s) => s.stormDeliveries },
  { id: 'greased', name: 'GREASED LANDINGS', desc: 'Make 3 smooth landings on the far strip', goal: 3, read: (s) => s.smoothLandings },
  { id: 'punctual', name: 'NEVER LATE', desc: 'Deliver 4 cargoes before their deadlines', goal: 4, read: (s) => s.onTime },
  { id: 'untouched', name: 'NOT A SCRATCH', desc: 'Deliver 2 cargoes with an untouched airframe', goal: 2, read: (s) => s.cleanDeliveries },
  { id: 'heavy', name: 'HEAVY LIFTER', desc: 'Deliver a cargo of 80 kg or more', goal: 1, read: (s) => (s.heaviestKg >= 80 ? 1 : 0) },
  { id: 'earner', name: 'CO-OP EARNER', desc: 'Earn 600 credits across your career', goal: 600, read: (s) => s.totalEarned },
  { id: 'eastbound', name: 'EASTBOUND', desc: 'Complete the long leg and deliver to Papua', goal: 1, read: (s) => s.papuaDeliveries ?? 0 },
  { id: 'second-chance', name: 'SECOND CHANCE', desc: 'Make a delivery after a water landing', goal: 1, read: (s) => s.deliveredAfterWater },
  { id: 'full-week', name: 'THE WHOLE WEEK', desc: 'Fly all 6 days of the charter week', goal: 6, read: (s) => s.daysCompleted },
];

export function challengeProgress(stats, challenge) {
  const current = Math.max(0, challenge.read(stats) || 0);
  return {
    current: Math.min(current, challenge.goal),
    goal: challenge.goal,
    done: current >= challenge.goal,
  };
}

export function challengesDoneCount(stats) {
  return CHALLENGES.filter((c) => challengeProgress(stats, c).done).length;
}
