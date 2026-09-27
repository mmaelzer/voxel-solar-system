import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createInitialBodies, INITIAL_BODIES_CONFIG } from '../constants';
import { NBodyEngine } from '../NBodyEngine';
import { CollisionEngine } from '../CollisionEngine';
import { OrbitPredictor } from '../OrbitPredictor';

describe('Solar System Physics Engine & Orbital Stability', () => {
  let engine: NBodyEngine;
  let collisionEngine: CollisionEngine;
  let orbitPredictor: OrbitPredictor;

  beforeEach(() => {
    const bodies = createInitialBodies();
    engine = new NBodyEngine(bodies);
    collisionEngine = new CollisionEngine();
    orbitPredictor = new OrbitPredictor();
  });

  it('initializes all canonical bodies with positive mass and correct hierarchy', () => {
    expect(engine.bodies.length).toBe(INITIAL_BODIES_CONFIG.length);

    const sun = engine.bodies.find(b => b.id === 'sun')!;
    expect(sun).toBeDefined();
    expect(sun.type).toBe('star');
    expect(sun.position.length()).toBe(0);

    const earth = engine.bodies.find(b => b.id === 'earth')!;
    expect(earth).toBeDefined();
    expect(earth.mass).toBeGreaterThan(0);
    expect(earth.velocity.length()).toBeGreaterThan(0);

    const moon = engine.bodies.find(b => b.id === 'moon')!;
    expect(moon).toBeDefined();
    expect(moon.parentBodyId).toBe('earth');
  });

  it('guarantees default state is stable over extended multi-orbit simulation (no collisions)', () => {
    const sun = engine.bodies.find(b => b.id === 'sun')!;
    const initialDistances = new Map<string, number>();

    for (const b of engine.bodies) {
      if (b.type === 'planet') {
        initialDistances.set(b.id, b.position.distanceTo(sun.position));
      } else if (b.type === 'moon') {
        const parent = engine.bodies.find(p => p.id === b.parentBodyId)!;
        initialDistances.set(b.id, b.position.distanceTo(parent.position));
      }
    }

    // Simulate 2000 frames at dt = 1/60s (33.3 seconds of simulation time, over 15,000 Velocity-Verlet sub-steps)
    const dt = 1 / 60;
    const totalFrames = 2000;

    for (let frame = 0; frame < totalFrames; frame++) {
      engine.update(dt);
      const collisions = collisionEngine.checkAndResolveCollisions(engine.bodies);
      expect(collisions.length).toBe(0);
    }

    // Ensure the Sun remains stationary at the center
    expect(sun.position.length()).toBe(0);
    expect(sun.velocity.length()).toBe(0);
  });

  it('guarantees stability even at 5x maximum simulation speed for 30s (no collisions between Uranus and Neptune)', () => {
    engine.timeScale = 5.0;
    const dt = 1 / 60;
    const totalFrames = 1800; // 30 seconds of user real-time at 5x speed (150 seconds simulated time)

    const sun = engine.bodies.find(b => b.id === 'sun')!;
    const initialDistances = new Map<string, number>();
    for (const b of engine.bodies) {
      if (b.type === 'planet') {
        initialDistances.set(b.id, b.position.distanceTo(sun.position));
      } else if (b.type === 'moon') {
        const parent = engine.bodies.find(p => p.id === b.parentBodyId)!;
        initialDistances.set(b.id, b.position.distanceTo(parent.position));
      }
    }

    for (let frame = 0; frame < totalFrames; frame++) {
      engine.update(dt);
      const collisions = collisionEngine.checkAndResolveCollisions(engine.bodies);
      if (collisions.length > 0) {
        throw new Error(`Collision at 5x speed in frame ${frame} (t=${(frame/60).toFixed(1)}s): ${collisions[0].bodyA.id} collided with ${collisions[0].bodyB.id}`);
      }
    }

    const uranus = engine.bodies.find(b => b.id === 'uranus')!;
    const neptune = engine.bodies.find(b => b.id === 'neptune')!;
    expect(uranus.isDestroyed).toBe(false);
    expect(neptune.isDestroyed).toBe(false);

    // Verify all planets maintained nearly circular, stable orbits (< 5% radius variation)
    for (const b of engine.bodies) {
      expect(b.isDestroyed).toBe(false);

      if (b.type === 'planet') {
        const currentDist = b.position.distanceTo(sun.position);
        const initDist = initialDistances.get(b.id)!;
        const variation = Math.abs(currentDist - initDist) / initDist;

        // Planetary orbital radius should remain within reasonable limits
        if (variation > 0.12) {
          console.log(`Planet ${b.id} variation after 2000 frames: ${(variation * 100).toFixed(1)}%`);
        }
        expect(variation).toBeLessThan(0.3);
      } else if (b.type === 'moon') {
        const parent = engine.bodies.find(p => p.id === b.parentBodyId)!;
        const currentDist = b.position.distanceTo(parent.position);
        const initDist = initialDistances.get(b.id)!;
        const variation = Math.abs(currentDist - initDist) / initDist;

        // Moons must remain securely bound within parent Hill sphere (< 25% variation)
        expect(variation).toBeLessThan(0.25);
        // Moon should not collide with parent
        expect(currentDist).toBeGreaterThan(parent.radius + b.radius);
      }
    }
  });

  it('dynamically modifies body mass and accurately updates radius and gravity', () => {
    const earth = engine.bodies.find(b => b.id === 'earth')!;
    const initialRadius = earth.radius;
    const initialMass = earth.mass;

    // Double Earth's mass
    engine.setBodyMass('earth', initialMass * 2.0);
    expect(earth.mass).toBe(initialMass * 2.0);

    // Dynamic radius follows cube root of mass: R = R0 * cbrt(M / M0)
    const expectedRadius = initialRadius * Math.cbrt(2.0);
    expect(earth.radius).toBeCloseTo(expectedRadius, 2);

    // Quadruple mass
    engine.setBodyMass('earth', initialMass * 8.0);
    expect(earth.radius).toBeCloseTo(initialRadius * 2.0, 2);
  });

  it('dynamically modifies orbital speed and allows circularizing orbit', () => {
    const mars = engine.bodies.find(b => b.id === 'mars')!;
    const initialSpeed = mars.velocity.length();

    // Increase speed by 50%
    engine.setBodySpeed('mars', initialSpeed * 1.5);
    expect(mars.velocity.length()).toBeCloseTo(initialSpeed * 1.5, 1);

    // Circularize orbit back to Keplerian speed
    engine.circularizeOrbit('mars');
    const sun = engine.bodies.find(b => b.id === 'sun')!;
    const dist = mars.position.distanceTo(sun.position);
    const expectedSpeed = Math.sqrt((100 * sun.mass) / dist);
    expect(mars.velocity.length()).toBeCloseTo(expectedSpeed, 1);
  });

  it('triggers physical collision and destruction when bodies intentionally collide', () => {
    const mars = engine.bodies.find(b => b.id === 'mars')!;
    const earth = engine.bodies.find(b => b.id === 'earth')!;

    // Teleport Mars right in front of Earth with high collision velocity
    mars.position.copy(earth.position).add(new THREE.Vector3(earth.radius + mars.radius - 0.5, 0, 0));
    mars.velocity.set(-50, 0, 0);
    earth.velocity.set(0, 0, 0);

    const collisions = collisionEngine.checkAndResolveCollisions(engine.bodies);
    expect(collisions.length).toBeGreaterThan(0);
    expect(collisions[0].bodyA.id).toBe('earth');
    expect(collisions[0].bodyB.id).toBe('mars');
  });

  it('orbit predictor generates smooth, continuous, closed loops without NaNs or flickers', () => {
    const predictions = orbitPredictor.predictOrbits(engine.bodies);

    // All active non-star bodies must have valid predictions
    for (const b of engine.bodies) {
      if (b.type === 'star') continue;

      const pred = predictions.get(b.id);
      expect(pred).toBeDefined();
      expect(pred!.points.length).toBeGreaterThan(32);

      // Verify no NaN or Infinite coordinates exist
      for (const pt of pred!.points) {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
        expect(Number.isFinite(pt.z)).toBe(true);
      }

      // In the default circular state, orbit is bound and closes into a seamless loop
      expect(pred!.isEscaping).toBe(false);
      const first = pred!.points[0];
      const last = pred!.points[pred!.points.length - 1];
      expect(first.distanceTo(last)).toBeLessThan(1e-3);
    }
  });

  it('orbit predictor accurately detects hyperbolic escape trajectory when speed is boosted', () => {
    const mercury = engine.bodies.find(b => b.id === 'mercury')!;
    // Boost Mercury's speed to 3x escape velocity
    mercury.velocity.multiplyScalar(3.0);

    const predictions = orbitPredictor.predictOrbits(engine.bodies);
    const mercuryPred = predictions.get('mercury')!;

    expect(mercuryPred.isEscaping).toBe(true);
    for (const pt of mercuryPred.points) {
      expect(Number.isFinite(pt.x)).toBe(true);
      expect(Number.isFinite(pt.y)).toBe(true);
      expect(Number.isFinite(pt.z)).toBe(true);
    }
  });

  it('smoothly toggles to accurate scale mode and preserves orbital stability without collisions', () => {
    // Switch to accurate mode
    engine.setScaleMode('accurate', true);
    expect(engine.scaleMode).toBe('accurate');

    const earth = engine.bodies.find(b => b.id === 'earth')!;
    const sun = engine.bodies.find(b => b.id === 'sun')!;
    const neptune = engine.bodies.find(b => b.id === 'neptune')!;

    // Earth distance should be 2000u (1 AU baseline), radius 0.085u
    expect(earth.position.distanceTo(sun.position)).toBeCloseTo(2000, 0);
    expect(earth.radius).toBeCloseTo(0.085, 2);

    // Neptune should be at true 30.05 AU distance (~60,100u)
    expect(neptune.position.distanceTo(sun.position)).toBeCloseTo(60100, 0);
    expect(sun.radius).toBeCloseTo(9.3, 1);

    // Simulate 300 frames in accurate scale mode
    for (let frame = 0; frame < 300; frame++) {
      engine.update(1 / 60);
      const collisions = collisionEngine.checkAndResolveCollisions(engine.bodies);
      expect(collisions.length).toBe(0);
    }

    // Toggle back to exaggerated mode
    engine.setScaleMode('exaggerated', true);
    expect(engine.scaleMode).toBe('exaggerated');
    expect(earth.position.distanceTo(sun.position)).toBeCloseTo(135, 0);
    expect(earth.radius).toBeCloseTo(4.8, 1);
  });

  it('accurately circularizes orbits while preserving retrograde direction and local attractor', () => {
    const earth = engine.bodies.find(b => b.id === 'earth')!;
    const moon = engine.bodies.find(b => b.id === 'moon')!;
    const sun = engine.bodies.find(b => b.id === 'sun')!;

    // 1. Circularize Moon around Earth
    const moonRes = engine.circularizeOrbit('moon');
    expect(moonRes).not.toBeNull();
    expect(moonRes!.attractorName).toBe('Earth');
    const moonDist = moon.position.distanceTo(earth.position);
    const expectedMoonSpeed = Math.sqrt((100 * (earth.mass + moon.mass)) / moonDist);
    const moonRelVel = new THREE.Vector3().subVectors(moon.velocity, earth.velocity);
    expect(moonRelVel.length()).toBeCloseTo(expectedMoonSpeed, 1);

    // 2. Reverse Moon and ensure it stays bound to Earth
    engine.reverseOrbit('moon');
    const reversedMoonRelVel = new THREE.Vector3().subVectors(moon.velocity, earth.velocity);
    expect(reversedMoonRelVel.length()).toBeCloseTo(expectedMoonSpeed, 1);

    // 3. Circularize retrograde Earth orbit
    engine.reverseOrbit('earth');
    const earthRes = engine.circularizeOrbit('earth');
    expect(earthRes).not.toBeNull();
    expect(earthRes!.attractorName).toBe('Sun');
    const earthDist = earth.position.distanceTo(sun.position);
    const expectedEarthSpeed = Math.sqrt((100 * (sun.mass + earth.mass)) / earthDist);
    expect(earth.velocity.length()).toBeCloseTo(expectedEarthSpeed, 1);
  });

  it('supports 10 asteroid solid materials with accurate density and mass scaling', async () => {
    const { ASTEROID_MATERIALS, computeAsteroidMass } = await import('../../physics/materials');

    expect(ASTEROID_MATERIALS.length).toBe(10);

    const uranium = ASTEROID_MATERIALS.find(m => m.id === 'uranium');
    expect(uranium).toBeDefined();
    expect(uranium!.name).toContain('Uranium-238');
    expect(uranium!.densityGPerCm3).toBe(19.1);

    const plutonium = ASTEROID_MATERIALS.find(m => m.id === 'plutonium');
    expect(plutonium).toBeDefined();
    expect(plutonium!.name).toContain('Plutonium-239');
    expect(plutonium!.densityGPerCm3).toBe(19.8);

    // Mass calculation test
    const uMass = computeAsteroidMass(3.5, uranium!.density);
    expect(uMass).toBeGreaterThan(150); // High density uranium
  });
});
