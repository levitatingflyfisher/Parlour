// Globle — the daily geography hunt. You name a country; the game tells you how
// CLOSE it sits to today's hidden answer (great-circle distance + a warmer/colder
// reading) and WHICH WAY to head (a compass arrow toward the answer). It honours
// the "graded proximity" rule: every guess is a metric to reason along, not a
// binary right/wrong. Pure logic, an offline centroid table bundled below — no
// server and no stored state: the puzzle is a deterministic function of the day.

// ~90 widely-known countries, each with an approximate centroid (degrees).
// lat: +N/-S, lon: +E/-W. Accuracy is "good enough for a game", not survey-grade.
export const COUNTRIES = [
  // Europe
  { name: 'United Kingdom', lat: 54.0, lon: -2.4 },
  { name: 'Ireland', lat: 53.2, lon: -8.0 },
  { name: 'France', lat: 46.6, lon: 2.4 },
  { name: 'Spain', lat: 40.3, lon: -3.7 },
  { name: 'Portugal', lat: 39.5, lon: -8.0 },
  { name: 'Germany', lat: 51.2, lon: 10.4 },
  { name: 'Italy', lat: 42.8, lon: 12.6 },
  { name: 'Netherlands', lat: 52.2, lon: 5.5 },
  { name: 'Belgium', lat: 50.6, lon: 4.7 },
  { name: 'Switzerland', lat: 46.8, lon: 8.2 },
  { name: 'Austria', lat: 47.6, lon: 14.1 },
  { name: 'Poland', lat: 52.0, lon: 19.4 },
  { name: 'Sweden', lat: 62.0, lon: 15.0 },
  { name: 'Norway', lat: 64.0, lon: 11.0 },
  { name: 'Finland', lat: 64.0, lon: 26.0 },
  { name: 'Denmark', lat: 56.0, lon: 9.5 },
  { name: 'Iceland', lat: 64.9, lon: -18.6 },
  { name: 'Greece', lat: 39.0, lon: 22.0 },
  { name: 'Czechia', lat: 49.8, lon: 15.5 },
  { name: 'Hungary', lat: 47.2, lon: 19.5 },
  { name: 'Romania', lat: 45.9, lon: 25.0 },
  { name: 'Croatia', lat: 45.1, lon: 15.2 },
  { name: 'Ukraine', lat: 49.0, lon: 32.0 },
  { name: 'Russia', lat: 61.5, lon: 105.0 },
  { name: 'Turkey', lat: 39.0, lon: 35.0 },
  // Americas
  { name: 'United States', lat: 39.8, lon: -98.6 },
  { name: 'Canada', lat: 56.1, lon: -106.3 },
  { name: 'Mexico', lat: 23.6, lon: -102.5 },
  { name: 'Guatemala', lat: 15.8, lon: -90.2 },
  { name: 'Costa Rica', lat: 9.7, lon: -83.8 },
  { name: 'Panama', lat: 8.5, lon: -80.8 },
  { name: 'Cuba', lat: 21.5, lon: -79.5 },
  { name: 'Jamaica', lat: 18.1, lon: -77.3 },
  { name: 'Colombia', lat: 4.6, lon: -74.3 },
  { name: 'Venezuela', lat: 6.4, lon: -66.6 },
  { name: 'Ecuador', lat: -1.8, lon: -78.2 },
  { name: 'Peru', lat: -9.2, lon: -75.0 },
  { name: 'Bolivia', lat: -16.3, lon: -63.6 },
  { name: 'Brazil', lat: -10.8, lon: -52.9 },
  { name: 'Chile', lat: -35.7, lon: -71.5 },
  { name: 'Argentina', lat: -38.4, lon: -63.6 },
  { name: 'Uruguay', lat: -32.8, lon: -56.0 },
  { name: 'Paraguay', lat: -23.4, lon: -58.4 },
  // Africa
  { name: 'Morocco', lat: 31.8, lon: -7.1 },
  { name: 'Algeria', lat: 28.0, lon: 1.7 },
  { name: 'Tunisia', lat: 33.9, lon: 9.5 },
  { name: 'Libya', lat: 26.3, lon: 17.2 },
  { name: 'Egypt', lat: 26.8, lon: 30.8 },
  { name: 'Sudan', lat: 12.9, lon: 30.2 },
  { name: 'Senegal', lat: 14.5, lon: -14.5 },
  { name: 'Mali', lat: 17.6, lon: -4.0 },
  { name: 'Ghana', lat: 7.9, lon: -1.0 },
  { name: 'Nigeria', lat: 9.1, lon: 8.7 },
  { name: 'Cameroon', lat: 7.4, lon: 12.4 },
  { name: 'Ethiopia', lat: 9.1, lon: 40.5 },
  { name: 'Kenya', lat: 0.0, lon: 37.9 },
  { name: 'Uganda', lat: 1.4, lon: 32.3 },
  { name: 'Tanzania', lat: -6.4, lon: 34.9 },
  { name: 'Angola', lat: -11.2, lon: 17.9 },
  { name: 'Zimbabwe', lat: -19.0, lon: 29.2 },
  { name: 'Madagascar', lat: -18.8, lon: 46.9 },
  { name: 'South Africa', lat: -30.6, lon: 22.9 },
  // Asia & Middle East
  { name: 'Israel', lat: 31.0, lon: 34.8 },
  { name: 'Lebanon', lat: 33.9, lon: 35.9 },
  { name: 'Jordan', lat: 30.6, lon: 36.2 },
  { name: 'Syria', lat: 34.8, lon: 38.9 },
  { name: 'Iraq', lat: 33.2, lon: 43.7 },
  { name: 'Saudi Arabia', lat: 23.9, lon: 45.1 },
  { name: 'United Arab Emirates', lat: 23.4, lon: 53.8 },
  { name: 'Qatar', lat: 25.4, lon: 51.2 },
  { name: 'Iran', lat: 32.4, lon: 53.7 },
  { name: 'Afghanistan', lat: 33.9, lon: 67.7 },
  { name: 'Kazakhstan', lat: 48.0, lon: 66.9 },
  { name: 'Pakistan', lat: 30.4, lon: 69.3 },
  { name: 'India', lat: 20.6, lon: 79.0 },
  { name: 'Nepal', lat: 28.4, lon: 84.1 },
  { name: 'Sri Lanka', lat: 7.9, lon: 80.8 },
  { name: 'Bangladesh', lat: 23.7, lon: 90.4 },
  { name: 'Mongolia', lat: 46.9, lon: 103.8 },
  { name: 'China', lat: 35.9, lon: 104.2 },
  { name: 'Thailand', lat: 15.9, lon: 101.0 },
  { name: 'Vietnam', lat: 14.1, lon: 108.3 },
  { name: 'Malaysia', lat: 4.2, lon: 102.0 },
  { name: 'Singapore', lat: 1.35, lon: 103.8 },
  { name: 'Indonesia', lat: -0.8, lon: 113.9 },
  { name: 'Philippines', lat: 12.9, lon: 121.8 },
  { name: 'South Korea', lat: 36.5, lon: 127.8 },
  { name: 'North Korea', lat: 40.3, lon: 127.5 },
  { name: 'Japan', lat: 36.2, lon: 138.3 },
  // Oceania
  { name: 'Papua New Guinea', lat: -6.3, lon: 143.9 },
  { name: 'Australia', lat: -25.3, lon: 133.8 },
  { name: 'New Zealand', lat: -41.8, lon: 171.8 },
  { name: 'Fiji', lat: -17.7, lon: 178.0 },
];

// Common shorthands → the canonical name in COUNTRIES, so a player typing "USA"
// or "UK" isn't rejected. Keys are matched case-insensitively (and trimmed).
const ALIASES = {
  usa: 'United States', us: 'United States', america: 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom', britain: 'United Kingdom', 'great britain': 'United Kingdom',
  england: 'United Kingdom',
  uae: 'United Arab Emirates', emirates: 'United Arab Emirates',
  korea: 'South Korea', 'south korea': 'South Korea',
  'czech republic': 'Czechia',
  holland: 'Netherlands', 'the netherlands': 'Netherlands',
  png: 'Papua New Guinea',
};

const R_EARTH = 6371; // mean Earth radius, km
const MAX_KM = Math.PI * R_EARTH; // ~20015 km — the farthest two points can be
const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

/// Great-circle (haversine) distance in km between two {lat,lon} points.
/// 0 for identical points; ~MAX_KM at antipodes.
export function distanceKm(a, b) {
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const dPhi = toRad(b.lat - a.lat);
  const dLam = toRad(b.lon - a.lon);
  const h = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/// Initial compass bearing from a → b, in degrees [0,360): 0 = due north,
/// 90 = east, 180 = south, 270 = west. (The forward azimuth along the
/// great circle; it's the direction you'd set off in to reach b.)
export function bearing(a, b) {
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const dLam = toRad(b.lon - a.lon);
  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']; // N, NE, E, SE, S, SW, W, NW

/// One of 8 arrows for a bearing in degrees, snapping to the nearest 45°.
export function bearingArrow(deg) {
  const i = Math.round(((((deg % 360) + 360) % 360) / 45)) % 8;
  return ARROWS[i];
}

/// "Hotness" 0–100 from a distance: 100 at 0 km, falling linearly to 0 at the
/// antipode. Drives the warmer/colder colour (high = close = hot).
export function proximity(km) {
  const p = 100 * (1 - km / MAX_KM);
  return Math.max(0, Math.round(p));
}

/// Look up a country by name, case-insensitively and trimmed; accepts common
/// aliases (USA, UK, UAE, …). Returns the country object, or null if unknown.
export function findCountry(name) {
  if (name == null) return null;
  const q = String(name).trim().toLowerCase();
  if (!q) return null;
  const direct = COUNTRIES.find((c) => c.name.toLowerCase() === q);
  if (direct) return direct;
  const canonical = ALIASES[q];
  return canonical ? COUNTRIES.find((c) => c.name === canonical) || null : null;
}

/// Deterministic answer for an integer seed (e.g. YYYYMMDD): the same seed always
/// yields the same country, with no server and no stored state. Mixes the seed's
/// bits so consecutive days land on unrelated countries. Returns a COUNTRIES item.
export function dailyAnswer(seed) {
  let a = (seed >>> 0) || 1;
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  a = (a ^ (a >>> 16)) >>> 0;
  return COUNTRIES[a % COUNTRIES.length];
}

/// Score a guessed country name against today's `answer` country. Returns the
/// resolved country, distance in km, an arrow pointing toward the answer, a
/// 0–100 proximity, and whether it's the answer — or null if the name is unknown.
export function guess(answer, name) {
  const country = findCountry(name);
  if (!country) return null;
  const km = distanceKm(country, answer);
  return {
    country,
    km,
    arrow: bearingArrow(bearing(country, answer)),
    proximity: proximity(km),
    correct: country.name === answer.name,
  };
}
