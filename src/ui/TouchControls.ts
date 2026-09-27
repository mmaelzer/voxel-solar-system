import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneManager } from '../renderer/SceneManager';
import { CelestialBody } from '../physics/types';

export class TouchControls {
  public controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private sceneManager: SceneManager;
  private domElement: HTMLElement;
  private onSelectBodyCallback?: (body: CelestialBody | null) => void;

  private pointerDownPos = new THREE.Vector2();
  private pointerDownTime = 0;

  constructor(sceneManager: SceneManager, domElement: HTMLElement) {
    this.sceneManager = sceneManager;
    this.domElement = domElement;

    this.controls = new OrbitControls(sceneManager.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 0.8;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 2500;
    this.controls.maxPolarAngle = Math.PI * 0.95;

    // Enable touch gestures natively
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    this.setupPointerEvents();
  }

  private setupPointerEvents() {
    this.domElement.addEventListener('pointerdown', (e) => {
      this.pointerDownPos.set(e.clientX, e.clientY);
      this.pointerDownTime = performance.now();
    });

    this.domElement.addEventListener('pointerup', (e) => {
      const dist = this.pointerDownPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY));
      const elapsed = performance.now() - this.pointerDownTime;

      // Only trigger selection if it was a quick tap/click without dragging
      if (dist < 8 && elapsed < 350) {
        this.handlePointerClick(e.clientX, e.clientY);
      }
    });
  }

  public setOnSelectBody(cb: (body: CelestialBody | null) => void) {
    this.onSelectBodyCallback = cb;
  }

  private handlePointerClick(clientX: number, clientY: number) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    const interactiveObjects = this.sceneManager.getInteractiveObjects();
    const intersects = this.raycaster.intersectObjects(interactiveObjects, true);

    const bodies = ((window as any).__SOLAR_SIM__?.getBodies() as CelestialBody[] | undefined) || [];
    let selectedBody: CelestialBody | null = null;

    if (intersects.length > 0) {
      // Find parent group that corresponds to bodyId
      let current: THREE.Object3D | null = intersects[0].object;
      while (current && !current.name && current.parent) {
        current = current.parent;
      }

      if (current && current.name) {
        const bodyId = current.name;
        selectedBody = bodies.find(b => b.id === bodyId && !b.isDestroyed) || null;
      }
    }

    // Touch proximity fallback: find closest body to the ray if direct hit missed
    if (!selectedBody) {
      let closestDist = Infinity;
      const cameraPos = this.sceneManager.camera.position;

      for (const b of bodies) {
        if (b.isDestroyed) continue;
        // Make sure body is in front of camera
        const toBody = new THREE.Vector3().subVectors(b.position, cameraPos);
        if (toBody.dot(this.raycaster.ray.direction) <= 0) continue;

        const distToRay = this.raycaster.ray.distanceToPoint(b.position);
        const touchRadius = Math.max(10.0, b.radius * 2.2);

        if (distToRay < touchRadius && distToRay < closestDist) {
          closestDist = distToRay;
          selectedBody = b;
        }
      }
    }

    if (this.onSelectBodyCallback) {
      this.onSelectBodyCallback(selectedBody);
    }
  }

  public update() {
    this.controls.update();
  }
}
