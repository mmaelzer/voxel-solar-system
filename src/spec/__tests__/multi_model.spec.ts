import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MODEL_SPEC, validateCelestialBody, analyzeOrbitalState, SpecFixtures } from '../model_spec';
import { CelestialBody } from '../../physics/types';
import { createInitialBodies } from '../../physics/constants';
import { NBodyEngine } from '../../physics/NBodyEngine';
import { OrbitPredictor } from '../../physics/OrbitPredictor';
import { VoxelGenerator } from '../../renderer/VoxelGenerator';
import { CollisionEngine } from '../../physics/CollisionEngine';

describe('Universal Model Specification (MODEL_SPEC) Conformance', () => {
  describe('Canonical Solar System Bodies Specification', () => {
    const bodies = createInitialBodies();

    it('verifies every canonical body passes MODEL_SPEC schema validation', () => {
      expect(bodies.length).toBeGreaterThanOrEqual(10);

      for (const body of bodies) {
        const report = validateCelestialBody(body);
        expect(report.isValid).toBe(true);
        expect(report.errors).toHaveLength(0);
      }
    });

    it('verifies planetary orbits conform to circular eccentricity bounds', () => {
      const sun = bodies.find(b => b.type === 'star')!;
      expect(sun).toBeDefined();

      for (const body of bodies) {
        if (body.type === 'planet') {
          const analysis = analyzeOrbitalState(body, sun);
          expect(analysis.isBound).toBe(true);
          // Initial default planetary orbits should be circular (eccentricity near 0)
          expect(analysis.eccentricity).toBeLessThanOrEqual(MODEL_SPEC.orbit.maxCircularTolerance);
          expect(analysis.semiMajorAxis).toBeGreaterThan(0);
          expect(analysis.orbitalPeriod).toBeGreaterThan(0);
        }
      }
    });

    it('verifies moons lie comfortably inside parent Hill spheres', () => {
      const sun = bodies.find(b => b.type === 'star')!;

      for (const body of bodies) {
        if (body.type === 'moon') {
          const parent = bodies.find(p => p.id === body.parentBodyId)!;
          expect(parent).toBeDefined();

          const analysis = analyzeOrbitalState(body, parent);
          expect(analysis.isBound).toBe(true);
          expect(analysis.eccentricity).toBeLessThan(0.2);

          const distanceToParent = body.position.distanceTo(parent.position);
          const minClearance = (parent.radius + body.radius) * MODEL_SPEC.orbit.minParentClearanceRatio;
          expect(distanceToParent).toBeGreaterThan(minClearance);
        }
      }
    });
  });

  describe('Physics Engine Model Conformance', () => {
    it('integrates using Velocity-Verlet with symplectic stability on Spec Fixtures', () => {
      const { star, planet } = SpecFixtures.createTwoBodySystem();
      const engine = new NBodyEngine([star, planet]);

      const initialDist = planet.position.distanceTo(star.position);
      const initialSpeed = planet.velocity.length();

      // Simulate 120 frames (2 seconds)
      for (let i = 0; i < 120; i++) {
        engine.update(1 / 60);
      }

      const finalDist = planet.position.distanceTo(star.position);
      const finalSpeed = planet.velocity.length();

      // Distance and speed should stay within tight symplectic bounds
      expect(Math.abs(finalDist - initialDist) / initialDist).toBeLessThan(0.02);
      expect(Math.abs(finalSpeed - initialSpeed) / initialSpeed).toBeLessThan(0.02);
    });

    it('enforces mass-radius cube-root scaling law', () => {
      const { planet } = SpecFixtures.createTwoBodySystem();
      const engine = new NBodyEngine([planet]);

      const r0 = planet.radius;
      const m0 = planet.mass;

      // 8x mass => 2x radius
      engine.setBodyMass(planet.id, m0 * 8);
      expect(planet.radius).toBeCloseTo(r0 * 2, 2);

      // Clamp limits check
      engine.setBodyMass(planet.id, 0.00001);
      expect(planet.mass).toBeGreaterThanOrEqual(MODEL_SPEC.physics.minBodyMass);
    });
  });

  describe('Orbit Predictor Model Conformance', () => {
    const predictor = new OrbitPredictor();
    const { star, planet } = SpecFixtures.createTwoBodySystem();

    it('produces exact conic trajectory points matching MODEL_SPEC resolution', () => {
      const predictions = predictor.predictOrbits([star, planet]);
      const pred = predictions.get(planet.id)!;

      expect(pred).toBeDefined();
      expect(pred.points.length).toBe(MODEL_SPEC.orbit.nominalOrbitSegments + 1);

      // Verify closed loop
      const start = pred.points[0];
      const end = pred.points[pred.points.length - 1];
      expect(start.distanceTo(end)).toBeLessThan(1e-4);

      // Verify every point lies on the expected radius within orbital tolerance
      for (const pt of pred.points) {
        const r = pt.distanceTo(star.position);
        expect(r).toBeCloseTo(100, 0);
      }
    });

    it('smoothly switches to hyperbolic trajectory when velocity exceeds escape speed', () => {
      // Escape speed: v_esc = sqrt(2 * G * M / r) = sqrt(2) * v_circ
      const vCirc = planet.velocity.length();
      planet.velocity.set(0, 0, vCirc * 1.6); // 1.6 > 1.414 => escape

      const predictions = predictor.predictOrbits([star, planet]);
      const pred = predictions.get(planet.id)!;

      expect(pred.isEscaping).toBe(true);
      expect(pred.points.length).toBeGreaterThan(MODEL_SPEC.orbit.minOrbitSegments);

      for (const pt of pred.points) {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
        expect(Number.isFinite(pt.z)).toBe(true);
      }
    });
  });

  describe('Voxel Generator Model Conformance', () => {
    it('generates spherical voxel dataset conforming to voxel resolution bounds', () => {
      const { planet } = SpecFixtures.createTwoBodySystem();
      const voxels = VoxelGenerator.generateVoxelSphere(planet);

      expect(voxels.length).toBeGreaterThan(0);
      const R = planet.voxelResolution;

      for (const v of voxels) {
        // Must lie inside spherical shell r <= R + 0.5
        const dist = v.offset.length();
        expect(dist).toBeLessThanOrEqual(R + 0.5);
        expect(v.color).toBeInstanceOf(THREE.Color);
      }
    });

    it('creates Three.js InstancedMesh with proper matrix and bevel scale', () => {
      const { planet } = SpecFixtures.createTwoBodySystem();
      const mesh = VoxelGenerator.createInstancedMesh(planet);

      expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
      expect(mesh.count).toBeGreaterThan(0);
      expect(mesh.userData.bodyId).toBe(planet.id);

      const boxGeo = VoxelGenerator.getBoxGeometry();
      expect(boxGeo.parameters.width).toBeCloseTo(MODEL_SPEC.voxel.cubeBevelScale, 2);
    });
  });

  describe('Collision Engine Model Conformance', () => {
    it('detects and resolves impacts obeying inelastic restitution specifications', () => {
      const collisionEngine = new CollisionEngine();
      const { star, planet } = SpecFixtures.createTwoBodySystem();

      const rogue: CelestialBody = {
        ...planet,
        id: 'spec_rogue',
        name: 'Spec Rogue',
        position: new THREE.Vector3(planet.position.x + planet.radius * 1.5, 0, 0),
        velocity: new THREE.Vector3(-30, 0, 0)
      };

      const events = collisionEngine.checkAndResolveCollisions([star, planet, rogue]);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].impactEnergy).toBeGreaterThan(0);
      expect(events[0].relativeVelocity).toBeGreaterThan(0);
    });
  });
});
