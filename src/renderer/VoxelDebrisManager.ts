import * as THREE from 'three';
import { CelestialBody, CollisionEvent, VoxelParticle } from '../physics/types';
import { VoxelGenerator } from './VoxelGenerator';
import { G } from '../physics/constants';

export class VoxelDebrisManager {
  private maxParticles = 2500;
  private particles: VoxelParticle[] = [];
  private instancedMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const geometry = VoxelGenerator.getBoxGeometry();
    const material = VoxelGenerator.getPlanetMaterial();

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.count = 0;
    this.scene.add(this.instancedMesh);
  }

  /**
   * Spawns debris voxels from a collision event.
   */
  public handleCollision(event: CollisionEvent) {
    const { bodyA, bodyB, impactPoint, relativeVelocity } = event;

    // Spawn fragments from bodyA if shattered or heavily damaged
    if (bodyA.isDestroyed) {
      this.shatterBody(bodyA, impactPoint, 1.2 * relativeVelocity);
    } else {
      this.spawnImpactSparks(bodyA, impactPoint, 25, 0.6 * relativeVelocity);
    }

    // Spawn fragments from bodyB if shattered or heavily damaged
    if (bodyB.isDestroyed) {
      this.shatterBody(bodyB, impactPoint, 1.2 * relativeVelocity);
    } else {
      this.spawnImpactSparks(bodyB, impactPoint, 25, 0.6 * relativeVelocity);
    }
  }

  /**
   * Manually shatters an entire body into hundreds of flying voxel blocks.
   */
  public shatterBody(body: CelestialBody, impactOrigin?: THREE.Vector3, burstEnergy: number = 20) {
    const voxels = VoxelGenerator.generateVoxelSphere(body);
    const unitSize = body.radius / body.voxelResolution;
    const origin = impactOrigin ?? body.position;

    // Sample a reasonable number of voxels (up to 150) so performance remains 60 FPS
    const step = Math.max(1, Math.floor(voxels.length / 140));

    for (let i = 0; i < voxels.length; i += step) {
      if (this.particles.length >= this.maxParticles) break;

      const v = voxels[i];
      // World position of this voxel
      const worldPos = new THREE.Vector3(
        body.position.x + v.offset.x * unitSize,
        body.position.y + v.offset.y * unitSize,
        body.position.z + v.offset.z * unitSize
      );

      // Radial blast direction away from impact center
      const blastDir = new THREE.Vector3().subVectors(worldPos, origin).normalize();
      if (blastDir.lengthSq() < 0.001) {
        blastDir.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize();
      }

      const speed = (0.5 + Math.random() * 1.5) * burstEnergy;
      const vel = body.velocity.clone().addScaledVector(blastDir, speed);

      this.particles.push({
        position: worldPos,
        velocity: vel,
        color: v.color.clone(),
        size: unitSize * (0.8 + Math.random() * 0.4),
        life: 0,
        maxLife: 8 + Math.random() * 8, // 8-16 seconds duration
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        rotVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        )
      });
    }
  }

  /**
   * Spawns localized ejecta sparks at an impact crater.
   */
  private spawnImpactSparks(body: CelestialBody, point: THREE.Vector3, count: number, speed: number) {
    const unitSize = body.radius / body.voxelResolution;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const paletteIndex = Math.floor(Math.random() * body.colorPalette.length);
      const color = new THREE.Color(body.colorPalette[paletteIndex]);

      this.particles.push({
        position: point.clone().addScaledVector(dir, 0.5),
        velocity: body.velocity.clone().addScaledVector(dir, speed * (0.5 + Math.random())),
        color,
        size: unitSize * 0.7,
        life: 0,
        maxLife: 4 + Math.random() * 4,
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        rotVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        )
      });
    }
  }

  /**
   * Updates debris physics (gravity from celestial bodies, motion, rotation, and instanced mesh rendering).
   */
  public update(dt: number, bodies: CelestialBody[]) {
    if (this.particles.length === 0) {
      this.instancedMesh.count = 0;
      return;
    }

    const activeBodies = bodies.filter(b => !b.isDestroyed);
    const alive: VoxelParticle[] = [];
    const sun = activeBodies.find(b => b.type === 'star');
    const sunPos = sun ? sun.position : new THREE.Vector3(0, 0, 0);
    const sunRadius = sun ? sun.radius : 18;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) continue;

      // Gravitational pull from massive bodies
      const accel = new THREE.Vector3();
      for (const b of activeBodies) {
        if (b.mass < 10) continue; // Only noticeable gravity from major planets & sun
        const diff = new THREE.Vector3().subVectors(b.position, p.position);
        const distSq = diff.lengthSq();
        if (distSq > 1) {
          const factor = (G * b.mass) / Math.pow(Math.sqrt(distSq + 25), 3);
          accel.addScaledVector(diff, factor);
        }
      }

      p.velocity.addScaledVector(accel, dt);
      p.position.addScaledVector(p.velocity, dt);

      p.rotation.x += p.rotVelocity.x * dt;
      p.rotation.y += p.rotVelocity.y * dt;
      p.rotation.z += p.rotVelocity.z * dt;

      // If falls into the Sun, disintegrate immediately
      const distToSun = p.position.distanceTo(sunPos);
      if (distToSun < sunRadius + 1.0) {
        continue;
      }

      alive.push(p);
    }

    this.particles = alive;
    this.instancedMesh.count = this.particles.length;

    // Update GPU instance matrices & colors
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const scale = p.size * (1 - (p.life / p.maxLife) * 0.4); // shrink slightly as life ends

      this.dummy.position.copy(p.position);
      this.dummy.rotation.copy(p.rotation);
      this.dummy.scale.setScalar(Math.max(0.01, scale));
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, p.color);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public clear() {
    this.particles = [];
    this.instancedMesh.count = 0;
  }
}
