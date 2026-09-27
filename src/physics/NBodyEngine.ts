import * as THREE from 'three';
import { CelestialBody } from './types';
import { G, SOFTENING, EXAGGERATED_SCALE_DATA, ACCURATE_SCALE_DATA } from './constants';

export class NBodyEngine {
  public bodies: CelestialBody[] = [];
  public timeScale: number = 1.0;
  public isPaused: boolean = false;
  private readonly subSteps: number = 10;

  // Scale Mode: 'exaggerated' (stylized playable) vs 'accurate' (astronomical true proportions)
  public scaleMode: 'exaggerated' | 'accurate' = 'exaggerated';
  public isTransitioningScale: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 1.2;
  private transitionStartRadii = new Map<string, number>();
  private transitionStartDistances = new Map<string, number>();
  private transitionTargetRadii = new Map<string, number>();
  private transitionTargetDistances = new Map<string, number>();
  private onScaleChangedCallback?: (mode: 'exaggerated' | 'accurate') => void;

  constructor(initialBodies: CelestialBody[]) {
    this.bodies = initialBodies;
  }

  public setBodies(bodies: CelestialBody[]) {
    this.bodies = bodies;
  }

  public setOnScaleChanged(cb: (mode: 'exaggerated' | 'accurate') => void) {
    this.onScaleChangedCallback = cb;
  }

  public toggleScaleMode(): 'exaggerated' | 'accurate' {
    const nextMode = this.scaleMode === 'exaggerated' ? 'accurate' : 'exaggerated';
    this.setScaleMode(nextMode);
    return nextMode;
  }

  public setScaleMode(mode: 'exaggerated' | 'accurate', immediate = false) {
    if (this.scaleMode === mode && !this.isTransitioningScale) return;
    this.scaleMode = mode;

    const sun = this.bodies.find(b => b.type === 'star');
    const targetData = mode === 'accurate' ? ACCURATE_SCALE_DATA : EXAGGERATED_SCALE_DATA;

    this.transitionStartRadii.clear();
    this.transitionStartDistances.clear();
    this.transitionTargetRadii.clear();
    this.transitionTargetDistances.clear();

    for (const body of this.bodies) {
      this.transitionStartRadii.set(body.id, body.radius);

      let curDist = 0;
      if (body.type === 'planet' && sun) {
        curDist = body.position.distanceTo(sun.position);
      } else if (body.type === 'moon' && body.parentBodyId) {
        const parent = this.bodies.find(p => p.id === body.parentBodyId);
        curDist = parent ? body.position.distanceTo(parent.position) : 10;
      }
      this.transitionStartDistances.set(body.id, curDist);

      const target = targetData[body.id];
      if (target) {
        this.transitionTargetRadii.set(body.id, target.radius);
        this.transitionTargetDistances.set(body.id, target.distance);
      } else {
        const ratioDist = mode === 'accurate' ? (2000 / 135) : (135 / 2000);
        const ratioRad = mode === 'accurate' ? (0.085 / 4.8) : (4.8 / 0.085);
        this.transitionTargetRadii.set(body.id, body.radius * ratioRad);
        this.transitionTargetDistances.set(body.id, curDist * ratioDist);
      }
    }

    if (immediate) {
      this.applyScaleProgress(1.0);
      this.isTransitioningScale = false;
      if (this.onScaleChangedCallback) {
        this.onScaleChangedCallback(this.scaleMode);
      }
    } else {
      this.isTransitioningScale = true;
      this.transitionProgress = 0;
    }
  }

  private applyScaleProgress(alpha: number) {
    const sun = this.bodies.find(b => b.type === 'star');
    const sunMass = sun ? sun.mass : 20000;

    for (const body of this.bodies) {
      if (body.isDestroyed) continue;

      const r0 = this.transitionStartRadii.get(body.id) ?? body.radius;
      const r1 = this.transitionTargetRadii.get(body.id) ?? body.radius;
      body.radius = r0 + (r1 - r0) * alpha;

      const d0 = this.transitionStartDistances.get(body.id) ?? 0;
      const d1 = this.transitionTargetDistances.get(body.id) ?? 0;
      const curDist = d0 + (d1 - d0) * alpha;

      if (body.type === 'star') {
        body.position.set(0, 0, 0);
        body.velocity.set(0, 0, 0);
      } else if (body.type === 'planet') {
        const angle = Math.atan2(body.position.z, body.position.x);
        body.position.set(curDist * Math.cos(angle), 0, curDist * Math.sin(angle));

        if (curDist > 0) {
          const speed = Math.sqrt((G * sunMass) / curDist);
          body.velocity.set(-speed * Math.sin(angle), 0, speed * Math.cos(angle));
        }
      } else if (body.type === 'moon' && body.parentBodyId) {
        const parent = this.bodies.find(p => p.id === body.parentBodyId);
        if (parent) {
          const relPos = new THREE.Vector3().subVectors(body.position, parent.position);
          const angle = Math.atan2(relPos.z, relPos.x);
          body.position.set(
            parent.position.x + curDist * Math.cos(angle),
            0,
            parent.position.z + curDist * Math.sin(angle)
          );

          if (curDist > 0) {
            const speed = Math.sqrt((G * parent.mass) / curDist);
            const relVx = -speed * Math.sin(angle);
            const relVz = speed * Math.cos(angle);
            body.velocity.copy(parent.velocity).add(new THREE.Vector3(relVx, 0, relVz));
          }
        }
      }
    }
  }

  /**
   * Advances the simulation by dt seconds using multi-step Velocity-Verlet (symplectic) integration.
   */
  public update(dt: number) {
    if (this.isPaused || dt <= 0) return;

    // Handle scale transition interpolation
    if (this.isTransitioningScale) {
      this.transitionProgress += dt / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.applyScaleProgress(1.0);
        this.isTransitioningScale = false;
        if (this.onScaleChangedCallback) {
          this.onScaleChangedCallback(this.scaleMode);
        }
      } else {
        const t = this.transitionProgress;
        const eased = t * t * (3 - 2 * t);
        this.applyScaleProgress(eased);
      }
    }

    // Clamp dt to avoid huge jumps on tab switching
    const effectiveDt = Math.min(dt, 0.05) * this.timeScale;
    // Scale sub-steps with timeScale so subDt remains constant (<= 0.002s) even at 5x speed
    const steps = Math.max(this.subSteps, Math.ceil(this.subSteps * this.timeScale));
    const subDt = effectiveDt / steps;

    for (let step = 0; step < steps; step++) {
      this.stepVelocityVerlet(subDt);
    }

    // Update planetary rotations
    for (const body of this.bodies) {
      if (!body.isDestroyed) {
        body.rotationAngle += body.rotationSpeed * effectiveDt * 10;
      }
    }
  }

  /**
   * Symplectic Velocity-Verlet Integration
   * 1. r(t + dt) = r(t) + v(t)*dt + 0.5*a(t)*dt^2
   * 2. Compute a(t + dt) from new positions
   * 3. v(t + dt) = v(t) + 0.5*(a(t) + a(t + dt))*dt
   */
  private stepVelocityVerlet(dt: number) {
    const activeBodies = this.bodies.filter(b => !b.isDestroyed);
    const n = activeBodies.length;
    if (n === 0) return;

    // Step 1: Compute initial accelerations a(t)
    const a0 = this.computeAccelerations(activeBodies);

    // Step 2: Update positions using r(t + dt) = r(t) + v(t)*dt + 0.5*a(t)*dt^2
    const dtSqHalf = 0.5 * dt * dt;
    for (let i = 0; i < n; i++) {
      const body = activeBodies[i];
      if (body.type === 'star') {
        // Sun remains fixed at the solar system center
        body.position.set(0, 0, 0);
        body.velocity.set(0, 0, 0);
      } else {
        body.position.addScaledVector(body.velocity, dt);
        body.position.addScaledVector(a0[i], dtSqHalf);
      }
    }

    // Step 3: Compute new accelerations a(t + dt)
    const a1 = this.computeAccelerations(activeBodies);

    // Step 4: Update velocities using v(t + dt) = v(t) + 0.5*(a(t) + a(t + dt))*dt
    const dtHalf = 0.5 * dt;
    for (let i = 0; i < n; i++) {
      const body = activeBodies[i];
      if (body.type !== 'star') {
        body.velocity.addScaledVector(a0[i], dtHalf);
        body.velocity.addScaledVector(a1[i], dtHalf);
      }
    }
  }

  /**
   * Computes gravitational accelerations between all active bodies.
   * Uses hierarchical N-body physics so moons orbit parent planets stably without visual scale tidal collapse,
   * while planets interact realistically via Newtonian gravity.
   */
  public computeAccelerations(activeBodies: CelestialBody[]): THREE.Vector3[] {
    const n = activeBodies.length;
    const accels: THREE.Vector3[] = [];
    const bodyIndexMap = new Map<string, number>();

    for (let i = 0; i < n; i++) {
      accels.push(new THREE.Vector3(0, 0, 0));
      bodyIndexMap.set(activeBodies[i].id, i);
    }

    const diff = new THREE.Vector3();
    const softeningSq = SOFTENING * SOFTENING;

    // 1. Planetary & Stellar Gravity (Stars, Planets, and Rogue Bodies)
    for (let i = 0; i < n; i++) {
      const b1 = activeBodies[i];
      if (b1.type === 'moon') continue; // Moons handled in hierarchical pass

      for (let j = i + 1; j < n; j++) {
        const b2 = activeBodies[j];
        if (b2.type === 'moon') continue;

        diff.subVectors(b2.position, b1.position);
        const distSq = diff.lengthSq();
        const dist = Math.sqrt(distSq + softeningSq);
        const denom = dist * dist * dist;

        const factor1 = (G * b2.mass) / denom;
        const factor2 = (G * b1.mass) / denom;

        accels[i].addScaledVector(diff, factor1);
        accels[j].addScaledVector(diff, -factor2);
      }
    }

    // 2. Hierarchical Lunar Gravity
    // Moons orbit their host planet stably: a_moon = a_parent_ext + a_local(parent -> moon)
    for (let i = 0; i < n; i++) {
      const moon = activeBodies[i];
      if (moon.type !== 'moon' || !moon.parentBodyId) continue;

      const parentIdx = bodyIndexMap.get(moon.parentBodyId);
      if (parentIdx === undefined) {
        // If parent is destroyed, moon becomes a rogue asteroid attracted by Sun/major planets
        const sun = activeBodies.find(b => b.type === 'star');
        if (sun) {
          diff.subVectors(sun.position, moon.position);
          const dist = Math.sqrt(diff.lengthSq() + softeningSq);
          accels[i].addScaledVector(diff, (G * sun.mass) / (dist * dist * dist));
        }
        continue;
      }

      const parent = activeBodies[parentIdx];

      // A. Inherit parent acceleration from Sun and solar system
      accels[i].copy(accels[parentIdx]);

      // B. Add local gravitational pull from parent planet
      diff.subVectors(parent.position, moon.position);
      const distSq = diff.lengthSq();
      const dist = Math.sqrt(distSq + softeningSq);
      const localFactor = (G * parent.mass) / (dist * dist * dist);
      accels[i].addScaledVector(diff, localFactor);
    }

    return accels;
  }

  /**
   * Modifies the mass of a body, dynamically adjusting its radius proportionally (cube root of mass).
   */
  public setBodyMass(bodyId: string, newMass: number) {
    const body = this.bodies.find(b => b.id === bodyId);
    if (!body) return;

    body.mass = Math.max(0.01, newMass);
    // Dynamic radius update based on density: R = R0 * (M / M0)^(1/3)
    const massRatio = body.mass / body.baseMass;
    const newRadius = body.baseRadius * Math.cbrt(massRatio);
    body.radius = Math.max(0.8, Math.min(newRadius, body.baseRadius * 4.0));
    body.voxelSize = body.radius / body.voxelResolution;
  }

  /**
   * Scales the orbital speed of a body relative to its primary attractor.
   */
  public setBodySpeed(bodyId: string, speedMultiplier: number) {
    const body = this.bodies.find(b => b.id === bodyId);
    if (!body || body.type === 'star') return;

    const attractor = this.getDominantAttractor(body);
    const attractorVel = attractor ? attractor.velocity : new THREE.Vector3();
    const relVel = new THREE.Vector3().subVectors(body.velocity, attractorVel);
    const currentSpeed = relVel.length();

    if (currentSpeed < 0.001) {
      // If stationary, orient tangentially to attractor
      const attractorPos = attractor ? attractor.position : new THREE.Vector3();
      const rad = new THREE.Vector3().subVectors(body.position, attractorPos);
      const tangent = new THREE.Vector3(-rad.z, 0, rad.x).normalize();
      body.velocity.copy(attractorVel).addScaledVector(tangent, speedMultiplier * 20);
    } else {
      const dir = relVel.normalize();
      body.velocity.copy(attractorVel).addScaledVector(dir, speedMultiplier);
    }
  }

  /**
   * Directly sets the 3D velocity vector of a body.
   */
  public setBodyVelocity(bodyId: string, newVelocity: THREE.Vector3) {
    const body = this.bodies.find(b => b.id === bodyId);
    if (body) {
      body.velocity.copy(newVelocity);
    }
  }

  /**
   * Sets velocity to an ideal circular Keplerian orbit around its parent or Sun.
   * Preserves current orbital inclination and prograde/retrograde direction.
   */
  public circularizeOrbit(bodyId: string): { success: boolean; speed: number; attractorName: string } | null {
    const body = this.bodies.find(b => b.id === bodyId);
    if (!body || body.type === 'star') return null;

    const attractor = this.getDominantAttractor(body);
    if (!attractor) return null;

    const relPos = new THREE.Vector3().subVectors(body.position, attractor.position);
    const dist = relPos.length();
    if (dist < 1) return null;

    // Relative velocity vector
    const relVel = new THREE.Vector3().subVectors(body.velocity, attractor.velocity);

    // Exact two-body gravitational parameter: mu = G * (M + m)
    const mu = G * (attractor.mass + body.mass);
    const speed = Math.sqrt(mu / dist);

    // Determine orbital plane from angular momentum: h = r x v_rel
    const hVec = new THREE.Vector3().crossVectors(relPos, relVel);
    let tangent: THREE.Vector3;

    if (hVec.lengthSq() > 1e-6) {
      // Preserve current orbital plane and prograde/retrograde travel direction:
      // (hHat x relPos) points exactly along the velocity's tangential direction
      const hHat = hVec.normalize();
      tangent = new THREE.Vector3().crossVectors(hHat, relPos).normalize();
    } else {
      // Radial or zero initial velocity: default to standard orbital plane (XZ)
      if (Math.abs(relPos.x) > 1e-4 || Math.abs(relPos.z) > 1e-4) {
        tangent = new THREE.Vector3(-relPos.z, 0, relPos.x).normalize();
      } else {
        tangent = new THREE.Vector3(1, 0, 0);
      }
    }

    body.velocity.copy(attractor.velocity).addScaledVector(tangent, speed);
    return { success: true, speed, attractorName: attractor.name };
  }

  /**
   * Reverses velocity vector relative to its dominant attractor, preserving moon systems.
   */
  public reverseOrbit(bodyId: string): boolean {
    const body = this.bodies.find(b => b.id === bodyId);
    if (!body || body.type === 'star') return false;

    const attractor = this.getDominantAttractor(body);
    const attractorVel = attractor ? attractor.velocity : new THREE.Vector3();
    const relVel = new THREE.Vector3().subVectors(body.velocity, attractorVel);
    relVel.multiplyScalar(-1);
    body.velocity.copy(attractorVel).add(relVel);
    return true;
  }

  /**
   * Finds the dominant gravitational attractor for a body.
   * Accurately distinguishes local planetary spheres of influence from the central star.
   */
  public getDominantAttractor(body: CelestialBody): CelestialBody | null {
    if (body.parentBodyId) {
      const parent = this.bodies.find(b => b.id === body.parentBodyId && !b.isDestroyed);
      if (parent) return parent;
    }

    const sun = this.bodies.find(b => b.type === 'star' && !b.isDestroyed);
    const sunMass = sun ? sun.mass : 20000;

    // Check if the body is captured inside any planet's Hill sphere
    for (const other of this.bodies) {
      if (other.id === body.id || other.isDestroyed || other.type !== 'planet') continue;

      const distToPlanet = body.position.distanceTo(other.position);
      const planetDistToSun = sun ? other.position.distanceTo(sun.position) : 100;
      // Hill sphere radius: r_h = a * (m / (3 * M_sun))^(1/3)
      const hillRadius = planetDistToSun * Math.cbrt(other.mass / (3 * sunMass));

      if (distToPlanet < hillRadius * 1.25) {
        return other;
      }
    }

    // Default to the central star (Sun) or the most massive non-destroyed body
    if (sun && sun.id !== body.id) return sun;

    let dominant: CelestialBody | null = null;
    let maxMass = 0;
    for (const b of this.bodies) {
      if (b.id !== body.id && !b.isDestroyed && b.mass > maxMass) {
        maxMass = b.mass;
        dominant = b;
      }
    }
    return dominant;
  }
}

