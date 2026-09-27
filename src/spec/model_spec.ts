import * as THREE from 'three';
import { CelestialBody } from '../physics/types';
import { G, SOFTENING, COLLISION_RESTITUTION } from '../physics/constants';

/**
 * Universal Simulation & Model Specification (MODEL_SPEC)
 * Used across physics, rendering, orbit trajectory, collision, and UI models.
 */
export const MODEL_SPEC = {
  // Gravitational and integration constants
  physics: {
    gravitationalConstant: G,
    softeningLength: SOFTENING,
    integratorType: 'Velocity-Verlet' as const,
    subStepsPerFrame: 10,
    collisionRestitution: COLLISION_RESTITUTION,
    maxStableTimeStep: 0.05,
    minBodyMass: 0.01,
    maxBodyMass: 100000.0,
    minBodyRadius: 0.5,
    maxBodyRadius: 100.0
  },

  // Celestial mechanics & orbital invariant constraints
  orbit: {
    maxCircularTolerance: 0.15, // max eccentricity for near-circular default orbits
    minOrbitSegments: 32,
    nominalOrbitSegments: 128,
    maxOrbitSegments: 256,
    hyperbolicEccentricityThreshold: 1.0,
    gladmanStabilityFactor: 2 * Math.sqrt(3), // 3.464 mutual Hill radius multiplier
    minParentClearanceRatio: 1.3 // distance must exceed (R_parent + R_moon) * ratio
  },

  // Voxel aesthetic and geometric specifications
  voxel: {
    minResolution: 2,
    maxResolution: 16,
    cubeBevelScale: 0.94, // creates characteristic voxel grooves
    ringThicknessScale: 0.15,
    maxDebrisParticles: 2500,
    debrisLifetimeMin: 4.0,
    debrisLifetimeMax: 16.0
  }
} as const;

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OrbitAnalysis {
  isBound: boolean;
  semiMajorAxis: number;
  semiMinorAxis: number;
  eccentricity: number;
  specificEnergy: number;
  angularMomentum: number;
  orbitalPeriod: number;
  hillRadius?: number;
}

/**
 * Validates a CelestialBody against the universal model specification.
 */
export function validateCelestialBody(body: CelestialBody): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!body.id || typeof body.id !== 'string') {
    errors.push('Body must have a non-empty string ID');
  }

  if (!Number.isFinite(body.mass) || body.mass <= 0) {
    errors.push(`Body mass must be a finite positive number, received ${body.mass}`);
  }

  if (!Number.isFinite(body.radius) || body.radius < MODEL_SPEC.physics.minBodyRadius) {
    errors.push(`Body radius must be >= ${MODEL_SPEC.physics.minBodyRadius}, received ${body.radius}`);
  }

  if (!Number.isFinite(body.position.x) || !Number.isFinite(body.position.y) || !Number.isFinite(body.position.z)) {
    errors.push(`Body position contains non-finite coordinates: [${body.position.x}, ${body.position.y}, ${body.position.z}]`);
  }

  if (!Number.isFinite(body.velocity.x) || !Number.isFinite(body.velocity.y) || !Number.isFinite(body.velocity.z)) {
    errors.push(`Body velocity contains non-finite coordinates: [${body.velocity.x}, ${body.velocity.y}, ${body.velocity.z}]`);
  }

  if (body.voxelResolution < MODEL_SPEC.voxel.minResolution || body.voxelResolution > MODEL_SPEC.voxel.maxResolution) {
    warnings.push(`Voxel resolution ${body.voxelResolution} outside recommended [${MODEL_SPEC.voxel.minResolution}, ${MODEL_SPEC.voxel.maxResolution}]`);
  }

  if (!body.colorPalette || body.colorPalette.length === 0) {
    errors.push('Body must have at least one color in its color palette');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Evaluates the orbital state of a body relative to its attractor using Keplerian mechanics.
 */
export function analyzeOrbitalState(body: CelestialBody, attractor: CelestialBody): OrbitAnalysis {
  const rVec = new THREE.Vector3().subVectors(body.position, attractor.position);
  const vVec = new THREE.Vector3().subVectors(body.velocity, attractor.velocity);

  const r = rVec.length();
  const v = vVec.length();
  const mu = MODEL_SPEC.physics.gravitationalConstant * (attractor.mass + body.mass);

  const hVec = new THREE.Vector3().crossVectors(rVec, vVec);
  const h = hVec.length();

  const energy = (v * v) / 2 - mu / Math.max(0.001, r);

  const vCrossH = new THREE.Vector3().crossVectors(vVec, hVec);
  const eVec = vCrossH.divideScalar(mu).sub(rVec.clone().divideScalar(Math.max(0.001, r)));
  const eccentricity = eVec.length();

  const isBound = eccentricity < 1.0 && energy < 0;
  let semiMajorAxis = 0;
  let semiMinorAxis = 0;
  let orbitalPeriod = 0;

  if (isBound) {
    semiMajorAxis = -mu / (2 * energy);
    semiMinorAxis = semiMajorAxis * Math.sqrt(Math.max(0, 1 - eccentricity * eccentricity));
    orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu);
  } else {
    semiMajorAxis = Math.abs(mu / (2 * energy));
    semiMinorAxis = semiMajorAxis * Math.sqrt(Math.max(0, eccentricity * eccentricity - 1));
  }

  // Hill radius if attractor orbits a higher star
  let hillRadius: number | undefined;
  if (body.type === 'moon') {
    // r_H = a_parent * (M_parent / (3 * M_sun))^(1/3)
    const parentDist = attractor.position.length();
    hillRadius = parentDist * Math.cbrt(attractor.mass / (3 * 20000));
  }

  return {
    isBound,
    semiMajorAxis,
    semiMinorAxis,
    eccentricity,
    specificEnergy: energy,
    angularMomentum: h,
    orbitalPeriod,
    hillRadius
  };
}

/**
 * Creates standardized test fixtures conforming to MODEL_SPEC.
 */
export const SpecFixtures = {
  /**
   * Minimal 2-body star + planet system
   */
  createTwoBodySystem(): { star: CelestialBody; planet: CelestialBody } {
    const star: CelestialBody = {
      id: 'spec_star',
      name: 'Spec Star',
      type: 'star',
      mass: 10000,
      baseMass: 10000,
      radius: 15,
      baseRadius: 15,
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      rotationSpeed: 0.001,
      rotationAngle: 0,
      colorPalette: [0xffaa00, 0xff8800],
      coreColor: 0xffaa00,
      surfacePattern: 'sun',
      isDestroyed: false,
      voxelResolution: 8,
      voxelSize: 15 / 8,
      orbitColor: 0xffdd44
    };

    const dist = 100;
    const speed = Math.sqrt((MODEL_SPEC.physics.gravitationalConstant * star.mass) / dist);
    const planet: CelestialBody = {
      id: 'spec_planet',
      name: 'Spec Planet',
      type: 'planet',
      mass: 10,
      baseMass: 10,
      radius: 4,
      baseRadius: 4,
      position: new THREE.Vector3(dist, 0, 0),
      velocity: new THREE.Vector3(0, 0, speed),
      rotationSpeed: 0.01,
      rotationAngle: 0,
      colorPalette: [0x154360, 0x27ae60],
      coreColor: 0x154360,
      surfacePattern: 'continents',
      isDestroyed: false,
      voxelResolution: 4,
      voxelSize: 4 / 4,
      orbitColor: 0x38bdf8
    };

    return { star, planet };
  },

  /**
   * 3-body star + planet + moon system
   */
  createThreeBodySystem(): { star: CelestialBody; planet: CelestialBody; moon: CelestialBody } {
    const { star, planet } = this.createTwoBodySystem();
    const moonDist = 8.0;
    const moonSpeed = Math.sqrt((MODEL_SPEC.physics.gravitationalConstant * planet.mass) / moonDist);

    const moon: CelestialBody = {
      id: 'spec_moon',
      name: 'Spec Moon',
      type: 'moon',
      parentBodyId: planet.id,
      mass: 0.2,
      baseMass: 0.2,
      radius: 1.2,
      baseRadius: 1.2,
      position: new THREE.Vector3(planet.position.x + moonDist, 0, 0),
      velocity: new THREE.Vector3(0, 0, planet.velocity.z + moonSpeed),
      rotationSpeed: 0.02,
      rotationAngle: 0,
      colorPalette: [0x94a3b8, 0xcbd5e1],
      coreColor: 0x64748b,
      surfacePattern: 'craters',
      isDestroyed: false,
      voxelResolution: 3,
      voxelSize: 1.2 / 3,
      orbitColor: 0xe2e8f0
    };

    return { star, planet, moon };
  }
};
