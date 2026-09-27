import * as THREE from 'three';
import { CelestialBody } from '../physics/types';
import { VoxelGenerator } from './VoxelGenerator';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public sunLight: THREE.PointLight;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;
  public cameraLight: THREE.DirectionalLight;

  private bodyGroups = new Map<string, THREE.Group>();
  private ringMeshes = new Map<string, THREE.InstancedMesh>();
  private trackedBodyId: string | null = null;
  private cameraOffset = new THREE.Vector3(0, 45, 90);
  private currentCameraTarget = new THREE.Vector3(0, 0, 0);

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070f); // Deep space cosmic dark blue

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Expand clipping frustum to handle both localized close-ups (0.02u) and vast astronomical AU spans (2,000,000u)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 2000000);
    this.camera.position.set(0, 320, 480);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    container.appendChild(this.renderer.domElement);

    // 1. Full-spectrum Ambient & Hemisphere fill illumination:
    // Ensures all planetary colors (reds, greens, blues, golds) remain bright and rich from all view angles
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xe8f0fe, 0x1e2438, 0.45);
    this.scene.add(this.hemiLight);

    // 2. Camera Headlight:
    // A directional light attached to the camera, shining forward in the view direction.
    // Illuminates whichever side of a body faces the observer so no body is lost in dark shadows.
    this.cameraLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.cameraLight.position.set(0, 0, 0);
    const cameraTarget = new THREE.Object3D();
    cameraTarget.position.set(0, 0, -100);
    this.camera.add(cameraTarget);
    this.cameraLight.target = cameraTarget;
    this.camera.add(this.cameraLight);
    this.scene.add(this.camera);

    // 3. Central Sun point light:
    // With distance=0 and decay=0, the Sun provides crisp directional solar highlights
    // across the entire solar system without artificial distance drop-off for outer planets.
    this.sunLight = new THREE.PointLight(0xfffaed, 2.8, 0, 0);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);

    // Build stylized cubic starfield
    this.createVoxelStarfield();

    // Responsive resize handler
    window.addEventListener('resize', () => this.onResize(container));
  }

  private createVoxelStarfield() {
    const starCount = 1800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const starPalettes = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xbfe6ff),
      new THREE.Color(0xffe4b5),
      new THREE.Color(0xffd1dc),
      new THREE.Color(0x99ccff)
    ];

    for (let i = 0; i < starCount; i++) {
      // Distribute stars on a large sphere
      const radius = 1800 + Math.random() * 400;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = starPalettes[Math.floor(Math.random() * starPalettes.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 3.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    const starField = new THREE.Points(geometry, starMaterial);
    this.scene.add(starField);
  }

  /**
   * Initializes or updates visual meshes for celestial bodies.
   */
  public syncBodies(bodies: CelestialBody[]) {
    const activeIds = new Set<string>();

    for (const body of bodies) {
      if (body.isDestroyed) {
        this.removeBodyMesh(body.id);
        continue;
      }

      activeIds.add(body.id);
      let group = this.bodyGroups.get(body.id);

      if (!group) {
        group = new THREE.Group();
        group.name = body.id;

        // Voxel Sphere InstancedMesh
        const voxelMesh = VoxelGenerator.createInstancedMesh(body);
        group.add(voxelMesh);

        // Voxel Rings if applicable (e.g. Saturn, Uranus)
        if (body.hasRings && body.ringInnerRadius && body.ringOuterRadius && body.ringColor) {
          const ringMesh = this.createRingMesh(body);
          group.add(ringMesh);
          this.ringMeshes.set(body.id, ringMesh);
        }

        // Star atmospheric corona glow if Sun
        if (body.type === 'star') {
          const glowGeo = new THREE.SphereGeometry(body.radius * 1.15, 24, 24);
          const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            depthWrite: false
          });
          const glowMesh = new THREE.Mesh(glowGeo, glowMat);
          glowMesh.name = `${body.id}_corona`;
          group.add(glowMesh);
        } else {
          // Atmospheric halo aura for planets and moons
          // Significantly boosts silhouette definition and visibility across cosmic distances
          const haloMultiplier = body.type === 'planet' ? 1.18 : 1.28;
          const haloGeo = new THREE.SphereGeometry(body.baseRadius * haloMultiplier, 24, 24);
          const haloColor = body.orbitColor || 0x60a5fa;
          const haloMat = new THREE.MeshBasicMaterial({
            color: haloColor,
            transparent: true,
            opacity: body.type === 'planet' ? 0.30 : 0.36,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            depthWrite: false
          });
          const haloMesh = new THREE.Mesh(haloGeo, haloMat);
          haloMesh.name = `${body.id}_halo`;
          group.add(haloMesh);

          // Stargazing point beacon: visible as a bright naked-eye pixel star when zoomed far out
          const beaconGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
          const beaconMat = new THREE.PointsMaterial({
            size: 4,
            sizeAttenuation: false,
            color: body.orbitColor || 0x60a5fa,
            transparent: true,
            opacity: 0.85
          });
          const beacon = new THREE.Points(beaconGeo, beaconMat);
          beacon.name = `${body.id}_beacon`;
          group.add(beacon);
        }

        this.scene.add(group);
        this.bodyGroups.set(body.id, group);
      }

      // Update position
      group.position.copy(body.position);

      // Rotate planet on its axis
      group.rotation.y = body.rotationAngle;

      // Dynamic scale update if mass/radius changed
      const currentScale = body.radius / body.baseRadius;
      group.scale.setScalar(currentScale);
    }

    // Clean up any bodies removed from physics
    for (const id of this.bodyGroups.keys()) {
      if (!activeIds.has(id)) {
        this.removeBodyMesh(id);
      }
    }
  }

  private createRingMesh(body: CelestialBody): THREE.InstancedMesh {
    const unitSize = 0.7;
    const ringVoxels = VoxelGenerator.generateVoxelRings(
      body.ringInnerRadius!,
      body.ringOuterRadius!,
      body.ringColor!,
      unitSize
    );

    const boxGeo = VoxelGenerator.getBoxGeometry();
    const ringMat = VoxelGenerator.getPlanetMaterial();
    const instMesh = new THREE.InstancedMesh(boxGeo, ringMat, ringVoxels.length);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < ringVoxels.length; i++) {
      const v = ringVoxels[i];
      dummy.position.set(v.offset.x * unitSize, v.offset.y * unitSize, v.offset.z * unitSize);
      dummy.scale.set(unitSize, unitSize * 0.15, unitSize); // Flat ring voxels
      dummy.updateMatrix();

      instMesh.setMatrixAt(i, dummy.matrix);
      instMesh.setColorAt(i, v.color);
    }

    instMesh.instanceMatrix.needsUpdate = true;
    if (instMesh.instanceColor) {
      instMesh.instanceColor.needsUpdate = true;
    }

    // Slight tilt for Saturn/Uranus rings
    instMesh.rotation.x = 0.45;
    return instMesh;
  }

  private removeBodyMesh(id: string) {
    const group = this.bodyGroups.get(id);
    if (group) {
      this.scene.remove(group);
      this.bodyGroups.delete(id);
      this.ringMeshes.delete(id);
    }
  }

  /**
   * Smoothly tracks camera towards target body if selected.
   */
  public updateCameraTracking(bodies: CelestialBody[], controlsTarget: THREE.Vector3) {
    if (!this.trackedBodyId) return;

    const body = bodies.find(b => b.id === this.trackedBodyId);
    if (!body || body.isDestroyed) {
      this.trackedBodyId = null;
      return;
    }

    // Target position of the body
    this.currentCameraTarget.lerp(body.position, 0.08);
    controlsTarget.copy(this.currentCameraTarget);
  }

  public setTrackedBody(bodyId: string | null, body?: CelestialBody) {
    this.trackedBodyId = bodyId;
    if (body) {
      this.currentCameraTarget.copy(body.position);
      // Adjust camera distance nicely relative to planet radius across both scales
      const targetDist = Math.max(body.radius * 4.5, 0.25);
      const camDir = new THREE.Vector3().subVectors(this.camera.position, body.position).normalize();
      if (camDir.lengthSq() < 0.001) camDir.set(0, 0.5, 1).normalize();
      this.camera.position.copy(body.position).addScaledVector(camDir, targetDist);
    }
  }

  public onScaleModeChanged(mode: 'exaggerated' | 'accurate', bodies: CelestialBody[]) {
    if (this.trackedBodyId) {
      const tracked = bodies.find(b => b.id === this.trackedBodyId);
      if (tracked) {
        this.setTrackedBody(tracked.id, tracked);
      }
    } else {
      if (mode === 'accurate') {
        this.camera.position.set(0, 35000, 65000);
        this.camera.lookAt(0, 0, 0);
      } else {
        this.camera.position.set(0, 320, 480);
        this.camera.lookAt(0, 0, 0);
      }
    }
  }

  public getTrackedBodyId(): string | null {
    return this.trackedBodyId;
  }

  public getBodyGroup(bodyId: string): THREE.Group | undefined {
    return this.bodyGroups.get(bodyId);
  }

  public getInteractiveObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    for (const group of this.bodyGroups.values()) {
      objects.push(...group.children);
    }
    return objects;
  }

  public onResize(container: HTMLElement) {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }
}
