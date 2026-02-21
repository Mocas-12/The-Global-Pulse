export const COUNTRY_METADATA = {
  CN: { population: 1420000000, region: 'AS', birthRateFactor: 1.20, deathRateFactor: 0.98 },
  IN: { population: 1410000000, region: 'AS', birthRateFactor: 0.98, deathRateFactor: 1.01 },
  US: { population: 334000000, region: 'NA', birthRateFactor: 0.96, deathRateFactor: 1.02 },
  ID: { population: 277000000, region: 'AS', birthRateFactor: 1.02, deathRateFactor: 0.99 },
  PK: { population: 240000000, region: 'AS', birthRateFactor: 1.04, deathRateFactor: 1.01 },
  BR: { population: 216000000, region: 'SA', birthRateFactor: 0.98, deathRateFactor: 1.0 },
  NG: { population: 223000000, region: 'AF', birthRateFactor: 1.08, deathRateFactor: 1.06 },
  BD: { population: 171000000, region: 'AS', birthRateFactor: 1.03, deathRateFactor: 1.02 },
  RU: { population: 144000000, region: 'EU', birthRateFactor: 0.90, deathRateFactor: 1.03 },
  JP: { population: 124000000, region: 'AS', birthRateFactor: 0.88, deathRateFactor: 1.04 },
  GB: { population: 67000000, region: 'EU', birthRateFactor: 0.94, deathRateFactor: 1.03 },
  // Europe detailed
  DE: { population: 84000000, region: 'EU', birthRateFactor: 0.93, deathRateFactor: 1.04 },
  FR: { population: 68000000, region: 'EU', birthRateFactor: 0.95, deathRateFactor: 1.02 },
  PL: { population: 38000000, region: 'EU', birthRateFactor: 0.92, deathRateFactor: 1.03 },
  NL: { population: 18000000, region: 'EU', birthRateFactor: 0.94, deathRateFactor: 1.02 },
  BE: { population: 11600000, region: 'EU', birthRateFactor: 0.94, deathRateFactor: 1.02 },
  AT: { population: 9000000, region: 'EU', birthRateFactor: 0.93, deathRateFactor: 1.02 },
  CZ: { population: 10700000, region: 'EU', birthRateFactor: 0.93, deathRateFactor: 1.02 },
  SK: { population: 5500000, region: 'EU', birthRateFactor: 0.92, deathRateFactor: 1.02 },
  HU: { population: 9700000, region: 'EU', birthRateFactor: 0.92, deathRateFactor: 1.03 },
  RO: { population: 19000000, region: 'EU', birthRateFactor: 0.91, deathRateFactor: 1.03 },
  BG: { population: 6800000, region: 'EU', birthRateFactor: 0.90, deathRateFactor: 1.04 },
  GR: { population: 10400000, region: 'EU', birthRateFactor: 0.91, deathRateFactor: 1.03 },
  IT: { population: 59000000, region: 'EU', birthRateFactor: 0.92, deathRateFactor: 1.05 },
  ES: { population: 48000000, region: 'EU', birthRateFactor: 0.93, deathRateFactor: 1.03 },
  PT: { population: 10300000, region: 'EU', birthRateFactor: 0.92, deathRateFactor: 1.03 },
  SE: { population: 10500000, region: 'EU', birthRateFactor: 0.94, deathRateFactor: 1.02 },
  NO: { population: 5400000, region: 'EU', birthRateFactor: 0.95, deathRateFactor: 1.02 },
  FI: { population: 5600000, region: 'EU', birthRateFactor: 0.93, deathRateFactor: 1.03 },
  DK: { population: 5900000, region: 'EU', birthRateFactor: 0.95, deathRateFactor: 1.02 },
  IE: { population: 5200000, region: 'EU', birthRateFactor: 0.96, deathRateFactor: 1.01 },
  CH: { population: 8900000, region: 'EU', birthRateFactor: 0.94, deathRateFactor: 1.02 },
  UA: { population: 37000000, region: 'EU', birthRateFactor: 0.90, deathRateFactor: 1.05 },
}

export const getTotalPopulation = () =>
  Object.values(COUNTRY_METADATA).reduce((s, v) => s + (v.population || 0), 0)

export const seededRand = (seedStr, tSec, salt = 0) => {
  let h = 2166136261
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  h ^= (tSec + salt) >>> 0
  h = (h * 1597334677) >>> 0
  const x = (h ^ (h >>> 13)) >>> 0
  return (x % 10000) / 10000
}
