import * as THREE from 'three';
import { CelestialBody, CollisionEvent } from './types';
import { COLLISION_RESTITUTION } from './constants';

export class CollisionEngine {
  /**
   * Checks all active body pairs for collisions and resolves impacts.
   * Returns a list of collision events for debris generation.
   */
  public checkAndResolveCollisions(bodies: CelestialBody[]): CollisionEvent[] {
    const activeBodies = bodies.filter(b => !b.isDestroyed);
    const n = activeBodies.length;
    const events: CollisionEvent[] = [];

    for (let i = 0; i < n; i++) {
      const b1 = activeBodies[i];
      if (b1.isDestroyed) continue;

      for (let j = i + 1; j < n; j++) {
        const b2 = activeBodies[j];
        if (b2.isDestroyed) continue;

        const delta = new THREE.Vector3().subVectors(b2.position, b1.position);
        const dist = delta.length();
        const minDistance = b1.radius + b2.radius;

        if (dist <= minDistance && dist > 0.0001) {
          // Normal vector pointing from b1 to b2
          const normal = delta.clone().normalize();
          const relVel = new THREE.Vector3().subVectors(b2.velocity, b1.velocity);
          const velAlongNormal = relVel.dot(normal);

          // Only collide if moving towards each other
          if (velAlongNormal < 0) {
            const impactPoint = new THREE.Vector3()
              .addScaledVector(b1.position, b2.radius / minDistance)
              .addScaledVector(b2.position, b1.radius / minDistance);

            const relativeSpeed = Math.abs(velAlongNormal);
            const totalMass = b1.mass + b2.mass;
            const kineticEnergy = 0.5 * ((b1.mass * b2.mass) / totalMass) * relativeSpeed * relativeSpeed;

            events.push({
              bodyA: b1,
              bodyB: b2,
              impactPoint,
              relativeVelocity: relativeSpeed,
              impactEnergy: kineticEnergy
            });

            this.resolveImpact(b1, b2, normal, velAlongNormal, totalMass);
          }
        }
      }
    }

    return events;
  }

  private resolveImpact(
    b1: CelestialBody,
    b2: CelestialBody,
    normal: THREE.Vector3,
    velAlongNormal: number,
    totalMass: number
  ) {
    const massRatio = b1.mass / b2.mass;

    // Catastrophic impact: if energy is high or mass ratio is large
    // If one is Sun or vastly larger, destroy smaller body
    if (b1.type === 'star' || massRatio > 8) {
      // b2 gets obliterated and partially absorbed by b1
      b1.mass += b2.mass * 0.3;
      b1.radius = Math.max(b1.radius, b1.baseRadius * Math.cbrt(b1.mass / b1.baseMass));
      b2.isDestroyed = true;
      return;
    }

    if (b2.type === 'star' || massRatio < 0.125) {
      // b1 gets obliterated and partially absorbed by b2
      b2.mass += b1.mass * 0.3;
      b2.radius = Math.max(b2.radius, b2.baseRadius * Math.cbrt(b2.mass / b2.baseMass));
      b1.isDestroyed = true;
      return;
    }

    // High velocity collision between similar bodies: both shatter or heavily inelastic rebound
    if (Math.abs(velAlongNormal) > 15) {
      // Violent shattering: smaller body or both bodies destroyed
      if (massRatio > 2.5) {
        b2.isDestroyed = true;
        b1.mass += b2.mass * 0.2;
      } else if (massRatio < 0.4) {
        b1.isDestroyed = true;
        b2.mass += b1.mass * 0.2;
      } else {
        // Both shatter!
        b1.isDestroyed = true;
        b2.isDestroyed = true;
      }
    } else {
      // Inelastic collision rebound (momentum exchange)
      const impulseMag = -(1 + COLLISION_RESTITUTION) * velAlongNormal / (1 / b1.mass + 1 / b2.mass);
      const impulse = normal.clone().multiplyScalar(impulseMag);

      b1.velocity.addScaledVector(impulse, -1 / b1.mass);
      b2.velocity.addScaledVector(impulse, 1 / b2.mass);

      // Separate bodies slightly to prevent sticking
      const overlap = (b1.radius + b2.radius) - normal.length();
      if (overlap > 0) {
        b1.position.addScaledVector(normal, -overlap * 0.5);
        b2.position.addScaledVector(normal, overlap * 0.5);
      }
    }
  }
}
