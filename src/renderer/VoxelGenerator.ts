import * as THREE from 'three';
import { CelestialBody } from '../physics/types';

export interface VoxelData {
  offset: THREE.Vector3;
  color: THREE.Color;
  isSurface: boolean;
}

export class VoxelGenerator {
  private static boxGeometry: THREE.BoxGeometry | null = null;
  private static sharedMaterial: THREE.MeshStandardMaterial | null = null;
  private static sunMaterial: THREE.MeshBasicMaterial | null = null;

  public static getBoxGeometry(): THREE.BoxGeometry {
    if (!this.boxGeometry) {
      // 0.94 scale gives subtle voxel grooves/ambient occlusion aesthetic like Minecraft
      this.boxGeometry = new THREE.BoxGeometry(0.94, 0.94, 0.94);
    }
    return this.boxGeometry;
  }

  public static getPlanetMaterial(): THREE.MeshStandardMaterial {
    if (!this.sharedMaterial) {
      this.sharedMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.7,
        metalness: 0.02,
        flatShading: true // Gives crisp voxel faceted look
      });
    }
    return this.sharedMaterial;
  }

  public static getSunMaterial(): THREE.MeshBasicMaterial {
    if (!this.sunMaterial) {
      this.sunMaterial = new THREE.MeshBasicMaterial({
        toneMapped: false
      });
    }
    return this.sunMaterial;
  }

  /**
   * Generates a voxel sphere dataset (local positions and colors) for a celestial body.
   */
  public static generateVoxelSphere(body: CelestialBody): VoxelData[] {
    const R = body.voxelResolution;
    const voxels: VoxelData[] = [];
    const rSqMax = (R + 0.4) * (R + 0.4);
    const rSqMin = (R - 1.6) * (R - 1.6); // outer shell + shallow core for optimal rendering

    const palette = body.colorPalette.map(c => new THREE.Color(c));
    const coreColor = new THREE.Color(body.coreColor);

    for (let x = -R; x <= R; x++) {
      for (let y = -R; y <= R; y++) {
        for (let z = -R; z <= R; z++) {
          const dSq = x * x + y * y + z * z;
          if (dSq <= rSqMax && dSq >= (body.type === 'star' ? rSqMin * 0.5 : 0)) {
            const isSurface = dSq > (R - 1.0) * (R - 1.0);
            const color = this.sampleVoxelColor(body, x, y, z, R, palette, coreColor, isSurface);

            voxels.push({
              offset: new THREE.Vector3(x, y, z),
              color,
              isSurface
            });
          }
        }
      }
    }

    return voxels;
  }

  /**
   * Generates planar ring voxels for ringed planets like Saturn & Uranus.
   */
  public static generateVoxelRings(
    innerRadius: number,
    outerRadius: number,
    baseColor: number,
    voxelUnitSize: number
  ): VoxelData[] {
    const voxels: VoxelData[] = [];
    const inVox = Math.floor(innerRadius / voxelUnitSize);
    const outVox = Math.ceil(outerRadius / voxelUnitSize);
    const color = new THREE.Color(baseColor);
    const brightColor = color.clone().offsetHSL(0, 0, 0.15);
    const darkColor = color.clone().offsetHSL(0, 0, -0.15);

    for (let x = -outVox; x <= outVox; x++) {
      for (let z = -outVox; z <= outVox; z++) {
        const d = Math.sqrt(x * x + z * z);
        if (d >= inVox && d <= outVox) {
          // Sparse pattern to look like natural particle dust rings
          const hash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
          if (Math.abs(hash - Math.floor(hash)) > 0.35) {
            const ringFrac = (d - inVox) / (outVox - inVox);
            // Cassini division gap
            if (ringFrac > 0.55 && ringFrac < 0.65) continue;

            const c = (Math.sin(d * 1.5) > 0 ? brightColor : darkColor).clone();
            voxels.push({
              offset: new THREE.Vector3(x, 0, z),
              color: c,
              isSurface: true
            });
          }
        }
      }
    }

    return voxels;
  }

  private static sampleVoxelColor(
    body: CelestialBody,
    x: number,
    y: number,
    z: number,
    R: number,
    palette: THREE.Color[],
    coreColor: THREE.Color,
    isSurface: boolean
  ): THREE.Color {
    if (!isSurface && body.type !== 'star') {
      return coreColor.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
    }

    const normY = y / R; // -1 to 1

    switch (body.surfacePattern) {
      case 'sun': {
        const rIndex = Math.floor(Math.random() * palette.length);
        return palette[rIndex].clone();
      }

      case 'continents': {
        // Polar ice caps
        if (Math.abs(normY) > 0.78) {
          return new THREE.Color(0xf0f3f4); // Ice white
        }
        // Continental noise
        const angle = Math.atan2(z, x);
        const noise = Math.sin(angle * 3.0 + normY * 2.0) + Math.cos(normY * 4.0) * 0.5;
        if (noise > 0.35) {
          // Continent green/brown
          const cIdx = (2 + Math.floor(Math.abs(Math.sin(x * 7 + z * 3)) * 3)) % palette.length;
          return (palette[cIdx] || coreColor).clone();
        }
        // Ocean blue
        const oIdx = (Math.abs(Math.sin(y * 5)) > 0.5 ? 0 : 1) % palette.length;
        return (palette[oIdx] || coreColor).clone();
      }

      case 'bands': {
        // Jupiter / Saturn atmospheric stripes
        const bandIndex = Math.floor(((normY + 1) * 0.5) * (palette.length * 1.5)) % palette.length;
        // Great Red Spot on Jupiter
        if (body.id === 'jupiter' && normY > -0.4 && normY < -0.1 && x > R * 0.3 && z > R * 0.3) {
          return new THREE.Color(0xb03a2e); // Crimson spot
        }
        return palette[bandIndex].clone();
      }

      case 'craters': {
        // Lunar / Mercury speckled surface
        const hash = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
        const pIndex = Math.floor(Math.abs(hash - Math.floor(hash)) * palette.length);
        return palette[pIndex].clone();
      }

      case 'lava': {
        // Io volcanic sulfur / lava
        const heat = Math.sin(x * 2 + y * 3 + z * 2);
        return heat > 0.4 ? new THREE.Color(0xc0392b) : palette[Math.floor(Math.random() * palette.length)];
      }

      case 'ice': {
        // Europa ice cracks
        const crack = Math.abs(Math.sin(x * 3 + z * 2 + y));
        return crack < 0.15 ? new THREE.Color(0xb9770e) : palette[Math.floor(Math.random() * (palette.length - 1))];
      }

      case 'radioactive': {
        // Uranium radioactive veins & glowing isotopic core
        const vein = Math.sin(x * 4.0 + y * 2.0 + z * 3.0);
        if (vein > 0.4) {
          return new THREE.Color(0x2ecc71); // Luminescent neon green
        } else if (vein < -0.3) {
          return new THREE.Color(0x17202a); // Deep pitchblende dark matrix
        }
        return palette[Math.floor(Math.random() * palette.length)].clone();
      }

      case 'radioactive_purple': {
        // Plutonium transuranic ionizing violet
        const pulse = Math.sin(x * 3.5 + y * 4.0 + z * 2.5);
        if (pulse > 0.35) {
          return new THREE.Color(0xaf7ac5); // Glowing ionizing magenta/violet
        } else if (pulse < -0.4) {
          return new THREE.Color(0x1b1226); // Heavy actinide dark crust
        }
        return palette[Math.floor(Math.random() * palette.length)].clone();
      }

      case 'metallic': {
        // Specular chrome / nickel-iron crystalline sheen
        const facet = Math.abs(Math.sin(x * 15.0 + y * 11.0 + z * 13.0));
        const idx = Math.floor(facet * palette.length) % palette.length;
        return palette[idx].clone();
      }

      case 'crystal': {
        // Diamond / Neutronium prismatic crystalline facets
        const prism = Math.sin(x * 6.0 + z * 6.0) * Math.cos(y * 6.0);
        if (prism > 0.5) {
          return new THREE.Color(0xffffff); // Bright glint
        }
        const cIdx = Math.floor(Math.abs(prism) * palette.length) % palette.length;
        return palette[cIdx].clone();
      }

      default:
        return palette[Math.floor(Math.random() * palette.length)];
    }
  }

  /**
   * Creates a THREE.InstancedMesh representing the entire voxel sphere.
   */
  public static createInstancedMesh(body: CelestialBody): THREE.InstancedMesh {
    const voxels = this.generateVoxelSphere(body);
    const geometry = this.getBoxGeometry();
    const material = body.type === 'star' ? this.getSunMaterial() : this.getPlanetMaterial();

    const instancedMesh = new THREE.InstancedMesh(geometry, material, voxels.length);
    const dummy = new THREE.Object3D();
    const unitSize = body.radius / body.voxelResolution;

    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      dummy.position.set(v.offset.x * unitSize, v.offset.y * unitSize, v.offset.z * unitSize);
      dummy.scale.setScalar(unitSize);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);
      instancedMesh.setColorAt(i, v.color);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

    instancedMesh.castShadow = body.type !== 'star';
    instancedMesh.receiveShadow = body.type !== 'star';

    // Store voxel metadata for collision shattering
    instancedMesh.userData = {
      bodyId: body.id,
      voxels,
      unitSize
    };

    return instancedMesh;
  }
}
