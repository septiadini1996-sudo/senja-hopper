// world.js — the archipelago Senja Hopper flies over: nine named islands
// with their strips, the cargo and passenger catalogue, and the regular
// customers whose names go on the order tickets.

export const ISLANDS = [
  { id: 'sumatra', name: 'Sumatra', strip: 'Banda Strip', mapX: 145, mapY: 230, runway: 620, note: 'coffee country, morning mist' },
  { id: 'kalimantan', name: 'Kalimantan', strip: 'Riverbend Field', mapX: 307, mapY: 179, runway: 540, note: 'river haze, long final' },
  { id: 'jawa', name: 'Jawa', strip: 'Kota Baru Strip', mapX: 215, mapY: 370, runway: 700, note: 'busy strip, watch the kites' },
  { id: 'bali', name: 'Bali', strip: 'Senja Home Strip', mapX: 350, mapY: 395, runway: 760, note: 'home base of the co-op' },
  { id: 'sulawesi', name: 'Sulawesi', strip: 'Teluk Field', mapX: 443, mapY: 230, runway: 500, note: 'crosswind off the bay' },
  { id: 'lombok', name: 'Lombok', strip: 'Sasak Strip', mapX: 425, mapY: 445, runway: 560, note: 'volcano on the horizon' },
  { id: 'flores', name: 'Flores', strip: 'Labuan Field', mapX: 520, mapY: 410, runway: 480, note: 'short strip, honest wind' },
  { id: 'timor', name: 'Timor', strip: 'Atambua Strip', mapX: 600, mapY: 470, runway: 520, note: 'dry hills, thermals at noon' },
  { id: 'papua', name: 'Papua', strip: 'Sentani Field', mapX: 665, mapY: 253, runway: 660, note: 'the long leg east' },
];

export const HOME_ISLAND = 'bali';

export function islandById(id) {
  return ISLANDS.find((i) => i.id === id);
}

// Stylised chart scale: one map pixel is about 1.9 km of sea.
export function chartDistanceKm(a, b) {
  const dx = a.mapX - b.mapX;
  const dy = a.mapY - b.mapY;
  return Math.round(Math.hypot(dx, dy) * 1.9);
}

// Compass course from one island to another, degrees clockwise from north.
export function chartCourseDeg(a, b) {
  const dx = b.mapX - a.mapX;
  const dy = a.mapY - b.mapY; // map y grows downward, north is up
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return Math.round((deg + 360) % 360);
}

// The flight view flies left to right; a chart kilometre becomes this many
// metres of sky, clamped so a leg lasts about one to two minutes.
export function legLengthMetres(km) {
  return Math.round(Math.min(7600, Math.max(2300, km * 21)));
}

export const CARGO_TYPES = [
  { id: 'fish', label: 'Chilled fish crates', kg: [30, 55], fragile: false },
  { id: 'coffee', label: 'Coffee bean sacks', kg: [40, 80], fragile: false },
  { id: 'medicine', label: 'Clinic medicine vials', kg: [8, 18], fragile: true },
  { id: 'mail', label: 'Mail and parcel sacks', kg: [15, 35], fragile: false },
  { id: 'flowers', label: 'Frangipani flower crates', kg: [12, 26], fragile: true },
  { id: 'propeller', label: 'Spare propeller, crated', kg: [45, 60], fragile: false },
  { id: 'passenger', label: 'Passenger seat', kg: [70, 85], fragile: false },
  { id: 'rice', label: 'Rice sacks', kg: [50, 90], fragile: false },
  { id: 'batik', label: 'Batik cloth bolts', kg: [20, 40], fragile: false },
  { id: 'books', label: 'School book boxes', kg: [35, 65], fragile: false },
  { id: 'fruit', label: 'Mangosteen baskets', kg: [25, 50], fragile: true },
  { id: 'chickens', label: 'Live chicken crates', kg: [18, 30], fragile: true },
];

export const CUSTOMERS = [
  { name: 'Ibu Ratna', role: 'warung keeper', line: 'Her warung feeds the whole strip.', thanks: 'The warung is saved. Lunch is on me.' },
  { name: 'Pak Haji Umar', role: 'date importer', line: 'Counts every crate twice, kindly.', thanks: 'Counted twice. Perfect both times.' },
  { name: 'Dr. Sari', role: 'island clinic doctor', line: 'The clinic fridge must never warm.', thanks: 'Still cold. You may have saved a life.' },
  { name: 'Kapten Bimo', role: 'ferry captain', line: 'His ferry is waiting on this part.', thanks: 'The ferry sails at dusk because of you.' },
  { name: 'Mbak Tuti', role: 'florist', line: 'Wedding flowers wait for no one.', thanks: 'The bride cried. The good kind.' },
  { name: 'Pak Danu', role: 'fish buyer', line: 'Pays double if it arrives still cold.', thanks: 'Cold as the morning sea. Double, as promised.' },
  { name: 'Nenek Lastri', role: 'passenger, 81', line: 'First flight of her life, to her grandson.', thanks: 'She waved the whole way down.' },
  { name: 'Budi the postman', role: 'postal rider', line: 'Three villages share one mailbag.', thanks: 'Three villages send their thanks.' },
  { name: 'Sister Maria', role: 'school teacher', line: 'New term starts Monday, books or not.', thanks: 'Monday has books now. All forty kids.' },
  { name: 'Pak Eko', role: 'coffee grower', line: 'His beans won a prize in the capital.', thanks: 'Prize beans, flown like prize beans.' },
];
