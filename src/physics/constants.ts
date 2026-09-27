import * as THREE from 'three';
import { CelestialBody } from './types';

export const G = 100; // Gravitational constant for the simulation
export const SOFTENING = 0.5; // Minimal softening to prevent division by zero without weakening gravity
export const COLLISION_RESTITUTION = 0.2; // Inelastic collision coefficient

export interface BodyInitTemplate {
  id: string;
  name: string;
  type: 'star' | 'planet' | 'moon';
  mass: number;
  radius: number;
  distance: number; // Distance from Sun or parent body
  angle: number; // Initial orbital angle (radians)
  orbitColor: number;
  coreColor: number;
  colorPalette: number[];
  surfacePattern: 'bands' | 'continents' | 'craters' | 'lava' | 'ice' | 'gas_rings' | 'sun';
  rotationSpeed: number;
  voxelResolution: number;
  hasRings?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  ringColor?: number;
  parentBodyId?: string;
}

export interface ScaleConfig {
  distance: number;
  radius: number;
}

export const EXAGGERATED_SCALE_DATA: Record<string, ScaleConfig> = {
  sun: { distance: 0, radius: 18.0 },
  mercury: { distance: 52, radius: 2.6 },
  venus: { distance: 88, radius: 4.4 },
  earth: { distance: 135, radius: 4.8 },
  moon: { distance: 9.5, radius: 1.3 },
  mars: { distance: 190, radius: 3.6 },
  phobos: { distance: 6.0, radius: 0.9 },
  jupiter: { distance: 275, radius: 10.5 },
  io: { distance: 16.0, radius: 1.3 },
  europa: { distance: 21.0, radius: 1.2 },
  ganymede: { distance: 27.0, radius: 1.6 },
  callisto: { distance: 34.0, radius: 1.5 },
  saturn: { distance: 380, radius: 8.8 },
  titan: { distance: 23.0, radius: 1.6 },
  uranus: { distance: 510, radius: 6.2 },
  neptune: { distance: 660, radius: 6.0 }
};

export const ACCURATE_SCALE_DATA: Record<string, ScaleConfig> = {
  sun: { distance: 0, radius: 9.3 },
  mercury: { distance: 774, radius: 0.033 },
  venus: { distance: 1446, radius: 0.081 },
  earth: { distance: 2000, radius: 0.085 },
  moon: { distance: 5.14, radius: 0.023 },
  mars: { distance: 3048, radius: 0.045 },
  phobos: { distance: 0.25, radius: 0.008 },
  jupiter: { distance: 10408, radius: 0.93 },
  io: { distance: 5.6, radius: 0.024 },
  europa: { distance: 8.9, radius: 0.021 },
  ganymede: { distance: 14.2, radius: 0.035 },
  callisto: { distance: 25.0, radius: 0.032 },
  saturn: { distance: 19164, radius: 0.78 },
  titan: { distance: 16.3, radius: 0.034 },
  uranus: { distance: 38400, radius: 0.34 },
  neptune: { distance: 60100, radius: 0.33 }
};

export const INITIAL_BODIES_CONFIG: BodyInitTemplate[] = [
  // THE SUN
  {
    id: 'sun',
    name: 'Sun',
    type: 'star',
    mass: 20000,
    radius: 18,
    distance: 0,
    angle: 0,
    orbitColor: 0xffdd44,
    coreColor: 0xffaa00,
    colorPalette: [0xff4500, 0xff8c00, 0xffa500, 0xffd700, 0xfffacd],
    surfacePattern: 'sun',
    rotationSpeed: 0.003,
    voxelResolution: 10
  },
  // MERCURY
  {
    id: 'mercury',
    name: 'Mercury',
    type: 'planet',
    mass: 0.1,
    radius: 2.6,
    distance: 52,
    angle: 0.8,
    orbitColor: 0xb0bec5,
    coreColor: 0x78909c,
    colorPalette: [0x455a64, 0x607d8b, 0x78909c, 0xb0bec5, 0xcfd8dc],
    surfacePattern: 'craters',
    rotationSpeed: 0.01,
    voxelResolution: 4
  },
  // VENUS
  {
    id: 'venus',
    name: 'Venus',
    type: 'planet',
    mass: 0.8,
    radius: 4.4,
    distance: 88,
    angle: 2.1,
    orbitColor: 0xe5a65d,
    coreColor: 0xd4883b,
    colorPalette: [0x8c531b, 0xb87333, 0xd4883b, 0xe5a65d, 0xf5cf89],
    surfacePattern: 'bands',
    rotationSpeed: -0.005,
    voxelResolution: 5
  },
  // EARTH
  {
    id: 'earth',
    name: 'Earth',
    type: 'planet',
    mass: 1.0,
    radius: 4.8,
    distance: 135,
    angle: 3.5,
    orbitColor: 0x38bdf8,
    coreColor: 0x1a5276,
    colorPalette: [
      0x154360, // Deep ocean
      0x1f618d, // Blue ocean
      0x27ae60, // Green continent
      0x229954, // Lush forest
      0x873600, // Mountains
      0xf0f3f4  // Ice caps / clouds
    ],
    surfacePattern: 'continents',
    rotationSpeed: 0.02,
    voxelResolution: 5
  },
  // MOON (Earth's Moon)
  {
    id: 'moon',
    name: 'Moon',
    type: 'moon',
    parentBodyId: 'earth',
    mass: 0.02,
    radius: 1.3,
    distance: 9.5,
    angle: 0.5,
    orbitColor: 0xe2e8f0,
    coreColor: 0x94a3b8,
    colorPalette: [0x64748b, 0x94a3b8, 0xcbd5e1, 0xf1f5f9],
    surfacePattern: 'craters',
    rotationSpeed: 0.015,
    voxelResolution: 3
  },
  // MARS
  {
    id: 'mars',
    name: 'Mars',
    type: 'planet',
    mass: 0.2,
    radius: 3.6,
    distance: 190,
    angle: 5.1,
    orbitColor: 0xf87171,
    coreColor: 0xdc2626,
    colorPalette: [
      0x991b1b, // Dark rust
      0xb91c1c, // Red terrain
      0xd97706, // Orange basin
      0xf59e0b, // Dunes
      0xfef2f2  // Polar ice
    ],
    surfacePattern: 'continents',
    rotationSpeed: 0.018,
    voxelResolution: 4
  },
  // PHOBOS (Mars Moon)
  {
    id: 'phobos',
    name: 'Phobos',
    type: 'moon',
    parentBodyId: 'mars',
    mass: 0.005,
    radius: 0.9,
    distance: 6.0,
    angle: 1.2,
    orbitColor: 0xd6d3d1,
    coreColor: 0x78716c,
    colorPalette: [0x57534e, 0x78716c, 0xa8a29e],
    surfacePattern: 'craters',
    rotationSpeed: 0.03,
    voxelResolution: 2
  },
  // JUPITER
  {
    id: 'jupiter',
    name: 'Jupiter',
    type: 'planet',
    mass: 20.0,
    radius: 10.5,
    distance: 275,
    angle: 1.1,
    orbitColor: 0xfbbf24,
    coreColor: 0xd97706,
    colorPalette: [
      0x78350f, // Dark storm band
      0x92400e, // Amber belt
      0xb45309, // Gold band
      0xd97706, // Light cream
      0xb91c1c, // Great Red Spot red
      0xfde68a  // Polar cream
    ],
    surfacePattern: 'bands',
    rotationSpeed: 0.035,
    voxelResolution: 8
  },
  // IO (Jupiter Moon)
  {
    id: 'io',
    name: 'Io',
    type: 'moon',
    parentBodyId: 'jupiter',
    mass: 0.03,
    radius: 1.3,
    distance: 16.0,
    angle: 0.8,
    orbitColor: 0xfef08a,
    coreColor: 0xeab308,
    colorPalette: [0xca8a04, 0xeab308, 0xdc2626, 0x854d0e],
    surfacePattern: 'lava',
    rotationSpeed: 0.02,
    voxelResolution: 3
  },
  // EUROPA (Jupiter Moon)
  {
    id: 'europa',
    name: 'Europa',
    type: 'moon',
    parentBodyId: 'jupiter',
    mass: 0.02,
    radius: 1.2,
    distance: 21.0,
    angle: 2.3,
    orbitColor: 0xbae6fd,
    coreColor: 0x38bdf8,
    colorPalette: [0xf0f9ff, 0xe0f2fe, 0xbae6fd, 0x7dd3fc, 0xb45309],
    surfacePattern: 'ice',
    rotationSpeed: 0.015,
    voxelResolution: 3
  },
  // GANYMEDE (Jupiter Moon)
  {
    id: 'ganymede',
    name: 'Ganymede',
    type: 'moon',
    parentBodyId: 'jupiter',
    mass: 0.04,
    radius: 1.6,
    distance: 27.0,
    angle: 4.0,
    orbitColor: 0xcbd5e1,
    coreColor: 0x64748b,
    colorPalette: [0x475569, 0x64748b, 0x94a3b8, 0xe2e8f0],
    surfacePattern: 'craters',
    rotationSpeed: 0.012,
    voxelResolution: 3
  },
  // CALLISTO (Jupiter Moon)
  {
    id: 'callisto',
    name: 'Callisto',
    type: 'moon',
    parentBodyId: 'jupiter',
    mass: 0.03,
    radius: 1.5,
    distance: 34.0,
    angle: 5.6,
    orbitColor: 0x94a3b8,
    coreColor: 0x475569,
    colorPalette: [0x334155, 0x475569, 0x64748b, 0xcbd5e1],
    surfacePattern: 'craters',
    rotationSpeed: 0.01,
    voxelResolution: 3
  },
  // SATURN
  {
    id: 'saturn',
    name: 'Saturn',
    type: 'planet',
    mass: 6.0,
    radius: 8.8,
    distance: 380,
    angle: 2.9,
    orbitColor: 0xfde047,
    coreColor: 0xca8a04,
    colorPalette: [
      0x854d0e, // Tan band
      0xa16207, // Warm gold
      0xca8a04, // Light butterscotch
      0xeab308, // Cream
      0xfef08a  // Bright ring dust
    ],
    surfacePattern: 'bands',
    rotationSpeed: 0.03,
    voxelResolution: 7,
    hasRings: true,
    ringInnerRadius: 11.5,
    ringOuterRadius: 19.5,
    ringColor: 0xca8a04
  },
  // TITAN (Saturn Moon)
  {
    id: 'titan',
    name: 'Titan',
    type: 'moon',
    parentBodyId: 'saturn',
    mass: 0.03,
    radius: 1.6,
    distance: 23.0,
    angle: 1.4,
    orbitColor: 0xfdba74,
    coreColor: 0xea580c,
    colorPalette: [0x9a3412, 0xc2410c, 0xea580c, 0xf97316],
    surfacePattern: 'bands',
    rotationSpeed: 0.015,
    voxelResolution: 3
  },
  // URANUS
  {
    id: 'uranus',
    name: 'Uranus',
    type: 'planet',
    mass: 1.0,
    radius: 5.6,
    distance: 510,
    angle: 4.4,
    orbitColor: 0x5eead4,
    coreColor: 0x0d9488,
    colorPalette: [0x134e4a, 0x115e59, 0x0f766e, 0x0d9488, 0x14b8a6, 0x99f6e4],
    surfacePattern: 'bands',
    rotationSpeed: -0.02,
    voxelResolution: 6,
    hasRings: true,
    ringInnerRadius: 8.0,
    ringOuterRadius: 11.0,
    ringColor: 0x99f6e4
  },
  // NEPTUNE
  {
    id: 'neptune',
    name: 'Neptune',
    type: 'planet',
    mass: 1.2,
    radius: 5.4,
    distance: 660,
    angle: 5.9,
    orbitColor: 0x60a5fa,
    coreColor: 0x2563eb,
    colorPalette: [0x172554, 0x1e3a8a, 0x1d4ed8, 0x2563eb, 0x3b82f6, 0x93c5fd],
    surfacePattern: 'bands',
    rotationSpeed: 0.022,
    voxelResolution: 6
  }
];

export function createInitialBodies(): CelestialBody[] {
  const bodies: CelestialBody[] = [];
  const bodyMap = new Map<string, CelestialBody>();

  for (const template of INITIAL_BODIES_CONFIG) {
    let position = new THREE.Vector3();
    let velocity = new THREE.Vector3();

    if (template.type === 'star') {
      position.set(0, 0, 0);
      velocity.set(0, 0, 0);
    } else if (template.parentBodyId) {
      // It's a moon orbiting a parent body!
      const parent = bodyMap.get(template.parentBodyId);
      if (parent) {
        const relX = template.distance * Math.cos(template.angle);
        const relZ = template.distance * Math.sin(template.angle);
        position.copy(parent.position).add(new THREE.Vector3(relX, 0, relZ));

        // Ideal circular velocity around parent: v = sqrt(G * M_parent / r)
        const speed = Math.sqrt((G * parent.mass) / template.distance);
        // Tangent vector
        const relVx = -speed * Math.sin(template.angle);
        const relVz = speed * Math.cos(template.angle);
        velocity.copy(parent.velocity).add(new THREE.Vector3(relVx, 0, relVz));
      }
    } else {
      // Planet orbiting the Sun at origin
      const sun = bodyMap.get('sun');
      const sunMass = sun ? sun.mass : 20000;
      const x = template.distance * Math.cos(template.angle);
      const z = template.distance * Math.sin(template.angle);
      position.set(x, 0, z);

      // Ideal circular speed around Sun: v = sqrt(G * M_sun / r)
      const speed = Math.sqrt((G * sunMass) / template.distance);
      const vx = -speed * Math.sin(template.angle);
      const vz = speed * Math.cos(template.angle);
      velocity.set(vx, 0, vz);
    }

    const body: CelestialBody = {
      id: template.id,
      name: template.name,
      type: template.type,
      mass: template.mass,
      baseMass: template.mass,
      radius: template.radius,
      baseRadius: template.radius,
      position,
      velocity,
      rotationSpeed: template.rotationSpeed,
      rotationAngle: 0,
      colorPalette: template.colorPalette,
      coreColor: template.coreColor,
      surfacePattern: template.surfacePattern,
      hasRings: template.hasRings,
      ringInnerRadius: template.ringInnerRadius,
      ringOuterRadius: template.ringOuterRadius,
      ringColor: template.ringColor,
      parentBodyId: template.parentBodyId,
      isDestroyed: false,
      voxelResolution: template.voxelResolution,
      voxelSize: template.radius / template.voxelResolution,
      orbitColor: template.orbitColor
    };

    bodies.push(body);
    bodyMap.set(body.id, body);
  }

  return bodies;
}
