// config.js — every tuning number for Senja Hopper in one place.
// Distances are metres, speeds metres/second, fuel litres, money rupiah
// thousands (shown in game as "Rp 120k" style is avoided; plain $ is used
// for the island charter co-op's books, labelled "credits" in the UI).

export const VIEW_W = 1280; // internal canvas resolution the game draws at
export const VIEW_H = 720;

export const CAMPAIGN_DAYS = 6; // a six-day charter week, one leg per day

export const PLANE = {
  baseTankLitres: 120, // fuel tank before upgrades
  tankPerUpgrade: 45, // +litres per tank upgrade level
  baseThrust: 26, // m/s^2 of engine push at full throttle
  thrustPerUpgrade: 5, // +thrust per engine upgrade level
  baseHoldKg: 90, // cargo hold before upgrades
  holdPerUpgrade: 45, // +kg per hold upgrade level
  stallSpeed: 24, // below this the wing stops holding the plane up
  cruiseDrag: 0.011, // quadratic drag coefficient
  burnPerSecond: 0.55, // litres per second at full throttle
  glideSink: 3.2, // m/s sink in a power-off glide
};

export const WORLD = {
  seaLevel: 0, // flight-view altitude of the water, metres
  ceiling: 900, // soft ceiling drawn on the altimeter tape
  metresPerPixel: 6, // flight view horizontal scale at zoom 1
};

export const LANDING = {
  maxTouchdownSpeed: 46, // m/s ground speed that still counts as gentle
  maxSinkRate: 4.5, // m/s downward at touchdown before it is a hard arrival
  bounceSinkRate: 7.5, // harder than this and the plane bounces / takes damage
  towFee: 45, // credits charged when a water landing needs the tow boat
  repairPerDamage: 3, // credits per point of airframe damage
};

export const ECONOMY = {
  fuelPricePerLitre: 0.55, // credits per litre at the island pump
  startCredits: 60, // the co-op floats the pilot this much on day one
  upgradeCost: [0, 90, 150, 230], // cost of upgrade levels 1..3, per track
};

export const WEATHER_RAMP = [
  // one row per campaign day: wind and storm pressure grow across the week
  { windMax: 4, storms: 0, stormRadius: 0 },
  { windMax: 6, storms: 1, stormRadius: 130 },
  { windMax: 8, storms: 1, stormRadius: 170 },
  { windMax: 10, storms: 2, stormRadius: 190 },
  { windMax: 12, storms: 2, stormRadius: 230 },
  { windMax: 14, storms: 3, stormRadius: 260 },
];
