import * as THREE from 'three';

export type BodyType = 'star' | 'planet' | 'moon' | 'custom';

export interface CelestialBody {
  id: string;
  name: string;
  type: BodyType;
  mass: number;
  baseMass: number;
  radius: number;
  baseRadius: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationSpeed: number;
  rotationAngle: number;
  
  // Voxel styling properties
  colorPalette: number[]; // hex colors
  coreColor: number;
  surfacePattern: 'bands' | 'continents' | 'craters' | 'lava' | 'ice' | 'gas_rings' | 'sun' | 'radioactive' | 'radioactive_purple' | 'metallic' | 'crystal';
  hasRings?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  ringColor?: number;
  
  // Hierarchy & status
  parentBodyId?: string;
  isDestroyed: boolean;
  voxelResolution: number; // grid radius in voxels
  voxelSize: number; // world size of 1 voxel
  orbitColor: number;
}

export interface VoxelParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  rotation: THREE.Euler;
  rotVelocity: THREE.Vector3;
}

export interface OrbitPrediction {
  bodyId: string;
  points: THREE.Vector3[];
  isEscaping: boolean;
  collidingWith?: string;
}

export interface CollisionEvent {
  bodyA: CelestialBody;
  bodyB: CelestialBody;
  impactPoint: THREE.Vector3;
  relativeVelocity: number;
  impactEnergy: number;
}
