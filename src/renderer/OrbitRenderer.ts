import * as THREE from 'three';
import { CelestialBody, OrbitPrediction } from '../physics/types';

export class OrbitRenderer {
  private scene: THREE.Scene;
  private lineMap = new Map<string, THREE.Line>();
  private materialMap = new Map<string, THREE.LineBasicMaterial>();
  private maxPoints = 256;
  public visible: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Updates all orbit trajectory lines with zero memory allocation churn.
   */
  public updateOrbits(bodies: CelestialBody[], predictions: Map<string, OrbitPrediction>) {
    const activeIds = new Set<string>();

    for (const body of bodies) {
      if (body.isDestroyed || body.type === 'star') continue;

      activeIds.add(body.id);
      const prediction = predictions.get(body.id);
      if (!prediction || prediction.points.length < 2) continue;

      let line = this.lineMap.get(body.id);
      let material = this.materialMap.get(body.id);

      if (!line) {
        material = new THREE.LineBasicMaterial({
          color: body.orbitColor,
          transparent: true,
          opacity: body.type === 'moon' ? 0.45 : 0.65,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxPoints * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0);

        line = new THREE.Line(geometry, material);
        line.frustumCulled = false;
        this.scene.add(line);
        this.lineMap.set(body.id, line);
        this.materialMap.set(body.id, material);
      }

      // Update positions buffer in-place
      const points = prediction.points;
      const count = Math.min(points.length, this.maxPoints);
      const positionAttr = line.geometry.attributes.position as THREE.BufferAttribute;
      const array = positionAttr.array as Float32Array;

      for (let i = 0; i < count; i++) {
        array[i * 3] = points[i].x;
        array[i * 3 + 1] = points[i].y;
        array[i * 3 + 2] = points[i].z;
      }

      positionAttr.needsUpdate = true;
      line.geometry.setDrawRange(0, count);
      line.visible = this.visible;

      // Highlight escape trajectory
      if (prediction.isEscaping) {
        material!.opacity = 0.9;
      } else {
        material!.opacity = body.type === 'moon' ? 0.45 : 0.65;
      }
    }

    // Clean up lines for destroyed bodies
    for (const [id, line] of this.lineMap.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(line);
        line.geometry.dispose();
        this.lineMap.delete(id);
        this.materialMap.delete(id);
      }
    }
  }

  public setVisible(show: boolean) {
    this.visible = show;
    for (const line of this.lineMap.values()) {
      line.visible = show;
    }
  }

  public clear() {
    for (const line of this.lineMap.values()) {
      this.scene.remove(line);
      line.geometry.dispose();
    }
    this.lineMap.clear();
    this.materialMap.clear();
  }
}
