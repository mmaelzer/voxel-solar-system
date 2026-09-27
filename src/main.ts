import * as THREE from 'three';
import { createInitialBodies } from './physics/constants';
import { NBodyEngine } from './physics/NBodyEngine';
import { CollisionEngine } from './physics/CollisionEngine';
import { OrbitPredictor } from './physics/OrbitPredictor';
import { SceneManager } from './renderer/SceneManager';
import { VoxelDebrisManager } from './renderer/VoxelDebrisManager';
import { OrbitRenderer } from './renderer/OrbitRenderer';
import { TouchControls } from './ui/TouchControls';
import { InspectorPanel } from './ui/InspectorPanel';
import { HUD } from './ui/HUD';
import { LaunchMenu } from './ui/LaunchMenu';
import './style.css';

class SolarSystemApp {
  private appContainer: HTMLElement;
  private sceneManager: SceneManager;
  private engine: NBodyEngine;
  private collisionEngine: CollisionEngine;
  private orbitPredictor: OrbitPredictor;
  private debrisManager: VoxelDebrisManager;
  private orbitRenderer: OrbitRenderer;
  private touchControls: TouchControls;
  private inspector: InspectorPanel;
  private launchMenu: LaunchMenu;
  private hud: HUD;
  private clock = new THREE.Clock();

  constructor() {
    this.appContainer = document.getElementById('app') || document.body;

    // 1. Initial State & Simulation
    const initialBodies = createInitialBodies();
    this.engine = new NBodyEngine(initialBodies);
    this.collisionEngine = new CollisionEngine();
    this.orbitPredictor = new OrbitPredictor();

    // 2. Three.js Rendering Setup
    this.sceneManager = new SceneManager(this.appContainer);
    this.debrisManager = new VoxelDebrisManager(this.sceneManager.scene);
    this.orbitRenderer = new OrbitRenderer(this.sceneManager.scene);

    // Initial sync of 3D voxel spheres
    this.sceneManager.syncBodies(this.engine.bodies);

    // 3. User Interface & Controls
    this.touchControls = new TouchControls(this.sceneManager, this.sceneManager.renderer.domElement);
    this.inspector = new InspectorPanel(
      this.appContainer,
      this.engine,
      this.sceneManager,
      this.debrisManager
    );
    this.launchMenu = new LaunchMenu(
      this.appContainer,
      this.engine,
      this.sceneManager
    );
    this.hud = new HUD(
      this.appContainer,
      this.engine,
      this.sceneManager,
      this.orbitRenderer,
      this.debrisManager,
      this.launchMenu
    );

    // Toast and event connections
    this.inspector.setOnToast((msg) => this.hud.showToast(msg));
    this.launchMenu.setOnToast((msg) => this.hud.showToast(msg));
    this.launchMenu.setOnDeploy((body) => {
      this.inspector.selectBody(body);
      this.sceneManager.setTrackedBody(body.id, body);
    });
    this.launchMenu.setOnArmFling(() => {
      this.hud.armFlingMode();
    });

    // Global reference for raycaster & debug
    (window as any).__SOLAR_SIM__ = {
      getBodies: () => this.engine.bodies,
      engine: this.engine
    };

    // Connect selection events
    this.touchControls.setOnSelectBody((body) => {
      if (body) {
        this.inspector.selectBody(body);
        this.sceneManager.setTrackedBody(body.id, body);
      } else {
        this.inspector.hide();
        this.sceneManager.setTrackedBody(null);
      }
    });

    this.hud.setOnSelectBody((body) => {
      this.inspector.selectBody(body);
    });

    this.inspector.setOnDeselect(() => {
      this.sceneManager.setTrackedBody(null);
    });

    // Start simulation loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private animate() {
    requestAnimationFrame(this.animate);

    const dt = this.clock.getDelta();

    // A. Advance continuous physics simulation
    this.engine.update(dt);

    // B. Check & resolve collisions
    const collisions = this.collisionEngine.checkAndResolveCollisions(this.engine.bodies);
    if (collisions.length > 0) {
      for (const col of collisions) {
        this.debrisManager.handleCollision(col);
        this.hud.showToast(`[COLLISION] ${col.bodyA.name} collided with ${col.bodyB.name}`);
      }
      this.hud.renderCarousel();
    }

    // C. Update debris voxels
    this.debrisManager.update(dt, this.engine.bodies);

    // D. Compute real-time trajectory predictions & update thin orbit lines
    if (this.orbitRenderer.visible) {
      const predictions = this.orbitPredictor.predictOrbits(this.engine.bodies);
      this.orbitRenderer.updateOrbits(this.engine.bodies, predictions);
    }

    // E. Sync visual voxel meshes
    this.sceneManager.syncBodies(this.engine.bodies);

    // F. Smooth camera tracking & controls update
    this.sceneManager.updateCameraTracking(this.engine.bodies, this.touchControls.controls.target);
    this.touchControls.update();

    // G. Live HUD inspector stats
    this.inspector.updateLiveStats();

    // H. Render frame
    this.sceneManager.render();
  }
}

// Bootstrap once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new SolarSystemApp();
});
