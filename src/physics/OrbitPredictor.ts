import * as THREE from 'three';
import { CelestialBody, OrbitPrediction } from './types';
import { G } from './constants';

export class OrbitPredictor {
  private readonly numSegments: number = 128;

  /**
   * Generates analytical Keplerian trajectory curves for all orbiting bodies.
   * Eliminates numerical integration noise, preventing any line flickering or step-size divergence.
   */
  public predictOrbits(bodies: CelestialBody[]): Map<string, OrbitPrediction> {
    const results = new Map<string, OrbitPrediction>();
    const activeBodies = bodies.filter(b => !b.isDestroyed);

    for (const body of activeBodies) {
      if (body.type === 'star') continue;

      const attractor = this.findAttractor(body, activeBodies);
      if (!attractor) continue;

      const prediction = this.computeConicOrbit(body, attractor);
      results.set(body.id, prediction);
    }

    return results;
  }

  private findAttractor(body: CelestialBody, bodies: CelestialBody[]): CelestialBody | null {
    if (body.parentBodyId) {
      const parent = bodies.find(b => b.id === body.parentBodyId && !b.isDestroyed);
      if (parent) return parent;
    }

    // Default to the central star (Sun)
    const sun = bodies.find(b => b.type === 'star' && !b.isDestroyed);
    if (sun && sun.id !== body.id) return sun;

    let dominant: CelestialBody | null = null;
    let maxMass = 0;
    for (const b of bodies) {
      if (b.id !== body.id && !b.isDestroyed && b.mass > maxMass) {
        maxMass = b.mass;
        dominant = b;
      }
    }
    return dominant;
  }

  /**
   * Computes the 3D osculating conic section (ellipse or hyperbola) for a body relative to its attractor.
   */
  public computeConicOrbit(body: CelestialBody, attractor: CelestialBody): OrbitPrediction {
    const rVec = new THREE.Vector3().subVectors(body.position, attractor.position);
    const vVec = new THREE.Vector3().subVectors(body.velocity, attractor.velocity);

    const r = rVec.length();
    const v = vVec.length();

    // Degenerate case: too close or stationary
    if (r < 0.1 || v < 0.001) {
      return {
        bodyId: body.id,
        points: [body.position.clone(), attractor.position.clone()],
        isEscaping: false
      };
    }

    const mu = G * (attractor.mass + body.mass);

    // Specific angular momentum h = r x v
    const hVec = new THREE.Vector3().crossVectors(rVec, vVec);
    const h = hVec.length();

    // If moving directly radially towards/away from center
    if (h < 1e-4) {
      return {
        bodyId: body.id,
        points: [body.position.clone(), attractor.position.clone()],
        isEscaping: false
      };
    }

    // Orbit normal unit vector
    const wHat = hVec.clone().divideScalar(h);

    // Specific orbital energy E = v^2/2 - mu/r
    const energy = (v * v) / 2 - mu / r;

    // Eccentricity vector: e = (v x h)/mu - r/|r|
    const vCrossH = new THREE.Vector3().crossVectors(vVec, hVec);
    const eVec = vCrossH.divideScalar(mu).sub(rVec.clone().divideScalar(r));
    const e = eVec.length();

    // Periapsis unit vector (p-hat)
    let pHat: THREE.Vector3;
    if (e > 1e-5) {
      pHat = eVec.clone().divideScalar(e);
    } else {
      // Nearly circular orbit: use current position unit vector
      pHat = rVec.clone().divideScalar(r);
    }

    // Semi-minor unit vector (q-hat) = w-hat x p-hat
    const qHat = new THREE.Vector3().crossVectors(wHat, pHat).normalize();

    const points: THREE.Vector3[] = [];
    const isEscaping = e >= 1.0 || energy >= 0;

    if (!isEscaping) {
      // BOUND ELLIPTICAL ORBIT (e < 1)
      const a = -mu / (2 * energy);
      const b = a * Math.sqrt(Math.max(0, 1 - e * e));

      // Geometric center of the ellipse in world space
      // C = r_attractor - a * e_vector
      const center = attractor.position.clone().addScaledVector(pHat, -a * e);

      // Generate smooth complete closed ellipse (0 to 2*PI)
      for (let i = 0; i <= this.numSegments; i++) {
        const theta = (i / this.numSegments) * Math.PI * 2;
        const pt = center.clone()
          .addScaledVector(pHat, a * Math.cos(theta))
          .addScaledVector(qHat, b * Math.sin(theta));
        points.push(pt);
      }
    } else {
      // UNBOUND HYPERBOLIC ORBIT (e >= 1)
      const safeE = Math.max(1.001, e);
      // Asymptote angle
      const thetaInf = Math.acos(-1 / safeE);
      const thetaMax = Math.min(0.9 * thetaInf, 2.5);

      const pParam = (h * h) / mu; // semi-latus rectum

      for (let i = 0; i <= this.numSegments; i++) {
        const f = -thetaMax + (2 * thetaMax * i) / this.numSegments;
        const denom = 1 + safeE * Math.cos(f);
        if (denom <= 0.01) continue;

        const rad = pParam / denom;
        const pt = attractor.position.clone()
          .addScaledVector(pHat, rad * Math.cos(f))
          .addScaledVector(qHat, rad * Math.sin(f));
        points.push(pt);
      }
    }

    return {
      bodyId: body.id,
      points,
      isEscaping
    };
  }
}
