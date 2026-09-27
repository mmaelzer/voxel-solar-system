export interface AsteroidMaterial {
  id: string;
  name: string;
  classification: string;
  density: number; // Relative to standard rock (~3.0 g/cm³)
  densityGPerCm3: number; // True physical density g/cm³
  colorPalette: number[];
  coreColor: number;
  surfacePattern: 'radioactive' | 'radioactive_purple' | 'metallic' | 'craters' | 'continents' | 'crystal' | 'lava';
  orbitColor: number;
  badgeSymbol: string;
  description: string;
  lore: string;
}

export const ASTEROID_MATERIALS: AsteroidMaterial[] = [
  {
    id: 'uranium',
    name: 'Uranium-238 (Pitchblende)',
    classification: 'Super-Heavy Actinide Solid',
    density: 19.1 / 3.0, // ~6.37x rock
    densityGPerCm3: 19.1,
    colorPalette: [0x2ecc71, 0x27ae60, 0x1e8449, 0x145a32, 0x58d68d, 0x17202a],
    coreColor: 0x2ecc71,
    surfacePattern: 'radioactive',
    orbitColor: 0x2ecc71,
    badgeSymbol: 'U-92',
    description: 'Enriched natural radioactive metal with dense lead matrix.',
    lore: 'Emits a faint luminescent Cerenkov glow from alpha decay. Extremely dense.'
  },
  {
    id: 'plutonium',
    name: 'Plutonium-239',
    classification: 'Transuranic Fissile Solid',
    density: 19.8 / 3.0,
    densityGPerCm3: 19.8,
    colorPalette: [0x9b59b6, 0x8e44ad, 0x6c3483, 0x4a235a, 0xaf7ac5, 0x1b1226],
    coreColor: 0x9b59b6,
    surfacePattern: 'radioactive_purple',
    orbitColor: 0xaf7ac5,
    badgeSymbol: 'Pu-94',
    description: 'Hyper-dense synthetic transuranic solid.',
    lore: 'Warm to the touch from radioactive self-heating with a vibrant ionizing purple aura.'
  },
  {
    id: 'nickel_iron',
    name: 'M-Type Nickel-Iron',
    classification: 'Protoplanet Core Fragment',
    density: 7.8 / 3.0,
    densityGPerCm3: 7.8,
    colorPalette: [0xbdc3c7, 0x95a5a6, 0x7f8c8d, 0xd5dbdb, 0x566573, 0x2c3e50],
    coreColor: 0x95a5a6,
    surfacePattern: 'metallic',
    orbitColor: 0xa6b8c7,
    badgeSymbol: 'Fe-Ni',
    description: 'Solid kamacite-taenite metallic iron forged in protoplanetary cores.',
    lore: 'Direct remnant of asteroid 16 Psyche with high radar reflectivity.'
  },
  {
    id: 'carbon_chondrite',
    name: 'C-Type Carbonaceous',
    classification: 'Primordial Nebula Volatile',
    density: 2.2 / 3.0,
    densityGPerCm3: 2.2,
    colorPalette: [0x212f3d, 0x1c2833, 0x2c3e50, 0x34495e, 0x17202a, 0x566573],
    coreColor: 0x1c2833,
    surfacePattern: 'craters',
    orbitColor: 0x7f8c8d,
    badgeSymbol: 'C-Ch',
    description: 'Pristine ancient carbonaceous matrix rich in amino volatiles.',
    lore: 'Similar to asteroids Bennu and Ryugu; pitch-black albedo.'
  },
  {
    id: 'silicate_rock',
    name: 'S-Type Stony Silicate',
    classification: 'Basaltic Mantle Crust',
    density: 3.4 / 3.0,
    densityGPerCm3: 3.4,
    colorPalette: [0x7d6608, 0x9a7d0a, 0xb7950b, 0x5d6d7e, 0x34495e, 0x4d5656],
    coreColor: 0x7d6608,
    surfacePattern: 'continents',
    orbitColor: 0xb7950b,
    badgeSymbol: 'S-Si',
    description: 'Olivine-pyroxene stony silicate rock characteristic of the inner belt.',
    lore: 'Weathered stony regolith matching near-Earth asteroid Eros.'
  },
  {
    id: 'solid_gold',
    name: 'Aurum-79 Solid Gold',
    classification: 'Hypothetical Heavy Noble Solid',
    density: 19.3 / 3.0,
    densityGPerCm3: 19.3,
    colorPalette: [0xf1c40f, 0xf39c12, 0xd68910, 0xb7950b, 0xfad7a0, 0x7d6608],
    coreColor: 0xf1c40f,
    surfacePattern: 'metallic',
    orbitColor: 0xf1c40f,
    badgeSymbol: 'Au-79',
    description: 'Solid 24k gold monolithic asteroid formed via r-process kilonovae.',
    lore: 'Lustrous, un-corrodible metallic asteroid worth quintillions.'
  },
  {
    id: 'platinum',
    name: 'Pure Platinum (Pt-78)',
    classification: 'Heavy Siderophile Solid',
    density: 21.5 / 3.0,
    densityGPerCm3: 21.5,
    colorPalette: [0xe5e8e8, 0xd7dbdd, 0xb2babb, 0x99a3a4, 0xf8f9f9, 0x7f8c8d],
    coreColor: 0xd7dbdd,
    surfacePattern: 'metallic',
    orbitColor: 0xe5e8e8,
    badgeSymbol: 'Pt-78',
    description: 'Extreme-density platinum group noble metal.',
    lore: 'Highest density natural noble metal solid with mirror-bright finish.'
  },
  {
    id: 'diamond',
    name: 'Crystalline Diamond',
    classification: 'Compressed Carbon Lattice',
    density: 3.5 / 3.0,
    densityGPerCm3: 3.5,
    colorPalette: [0x5dade2, 0x85c1e9, 0xaed6f1, 0xebf5fb, 0x3498db, 0xffffff],
    coreColor: 0xaed6f1,
    surfacePattern: 'crystal',
    orbitColor: 0x5dade2,
    badgeSymbol: 'C-Dia',
    description: 'Single gigantic crystalline carbon diamond polyhedron.',
    lore: 'Remnant of a carbon white dwarf mantle compressed into crystalline gemstone.'
  },
  {
    id: 'neutronium',
    name: 'Degenerate Neutronium',
    classification: 'Hypothetical Quark Solid',
    density: 50.0 / 3.0, // Maximum cap
    densityGPerCm3: 50.0,
    colorPalette: [0x0b0c10, 0x1f2833, 0x45a29e, 0x66fcf1, 0x0f141d, 0x00f0ff],
    coreColor: 0x00f0ff,
    surfacePattern: 'crystal',
    orbitColor: 0x00f0ff,
    badgeSymbol: 'N-0',
    description: 'Hypothetical macro-chunk of stable neutron degenerate matter.',
    lore: 'Generates intense micro-gravitational pull despite compact dimensions.'
  },
  {
    id: 'antimatter',
    name: 'Antimatter / Plasma Crystal',
    classification: 'Exotic High-Energy Solid',
    density: 12.0 / 3.0,
    densityGPerCm3: 12.0,
    colorPalette: [0xe74c3c, 0xc0392b, 0xd35400, 0xe67e22, 0xf39c12, 0x922b21],
    coreColor: 0xe74c3c,
    surfacePattern: 'lava',
    orbitColor: 0xe74c3c,
    badgeSymbol: 'Anti-M',
    description: 'Metastable solid antimatter containment crystal.',
    lore: 'Releases catastrophic kinetic energy on physical collision.'
  }
];

export function getMaterialById(id: string): AsteroidMaterial {
  return ASTEROID_MATERIALS.find(m => m.id === id) || ASTEROID_MATERIALS[0];
}

export function computeAsteroidMass(radius: number, densityMultiplier: number): number {
  // Baseline: radius 3.5 with 1.0 density gives mass 30.0
  const baseR = 3.5;
  const volRatio = Math.pow(radius / baseR, 3);
  return Math.max(0.5, Math.round(30.0 * volRatio * densityMultiplier * 10) / 10);
}
