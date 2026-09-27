import * as THREE from 'three';
import { CelestialBody } from '../physics/types';
import { NBodyEngine } from '../physics/NBodyEngine';
import { SceneManager } from '../renderer/SceneManager';
import { OrbitRenderer } from '../renderer/OrbitRenderer';
import { createInitialBodies } from '../physics/constants';
import { VoxelDebrisManager } from '../renderer/VoxelDebrisManager';
import { PixelIcons, getBodyPixelBadge } from './PixelIcons';
import { LaunchMenu } from './LaunchMenu';

export class HUD {
  private container: HTMLElement;
  private engine: NBodyEngine;
  private sceneManager: SceneManager;
  private orbitRenderer: OrbitRenderer;
  private debrisManager: VoxelDebrisManager;
  private launchMenu?: LaunchMenu;
  private onSelectBodyCallback?: (body: CelestialBody) => void;

  private playPauseBtn!: HTMLButtonElement;
  private scaleToggleBtn!: HTMLButtonElement;
  private scaleModeTextEl!: HTMLElement;
  private orbitToggleBtn!: HTMLButtonElement;
  private resetBtn!: HTMLButtonElement;
  private spawnBtn!: HTMLButtonElement;
  private carouselList!: HTMLElement;

  private isSpawningMode: boolean = false;

  constructor(
    parent: HTMLElement,
    engine: NBodyEngine,
    sceneManager: SceneManager,
    orbitRenderer: OrbitRenderer,
    debrisManager: VoxelDebrisManager,
    launchMenu?: LaunchMenu
  ) {
    this.engine = engine;
    this.sceneManager = sceneManager;
    this.orbitRenderer = orbitRenderer;
    this.debrisManager = debrisManager;
    this.launchMenu = launchMenu;

    this.container = document.createElement('div');
    this.container.className = 'hud-overlay';
    parent.appendChild(this.container);

    this.buildUI();
    this.setupSpawnInteraction(parent);
  }

  private buildUI() {
    this.container.innerHTML = `
      <!-- TOP BAR -->
      <header class="top-bar">
        <div class="brand">
          <div class="brand-voxel">${PixelIcons.sun}</div>
          <div class="brand-text">
            <h1>VOXEL SOLAR SYSTEM</h1>
            <span class="sub-text">TELEMETRY &amp; GRAVITY SIMULATOR</span>
          </div>
        </div>

        <div class="sim-controls">
          <button id="btn-pause-play" class="hud-btn hud-icon-btn" title="Pause / Resume Simulation">
            <span id="icon-play-pause">${PixelIcons.pause}</span>
          </button>
          
          <div class="speed-group">
            <button class="speed-btn" data-speed="0.2">0.2x</button>
            <button class="speed-btn" data-speed="0.5">0.5x</button>
            <button class="speed-btn active" data-speed="1.0">1x</button>
            <button class="speed-btn" data-speed="2.0">2x</button>
            <button class="speed-btn" data-speed="5.0">5x</button>
          </div>

          <div class="hud-separator"></div>

          <button id="btn-toggle-scale" class="hud-btn scale-btn" title="Toggle between Stylized and True Astronomical Scale">
            <span class="btn-icon-wrap">${PixelIcons.scale}</span>
            <span id="scale-mode-text">SCALE: STYLIZED</span>
          </button>

          <button id="btn-toggle-orbits" class="hud-btn active" title="Toggle Orbit Lines">
            <span class="btn-icon-wrap">${PixelIcons.orbits}</span>
            <span>ORBITS</span>
          </button>

          <button id="btn-spawn" class="hud-btn" title="Fling a new voxel planet">
            <span class="btn-icon-wrap">${PixelIcons.fling}</span>
            <span>LAUNCH</span>
          </button>

          <button id="btn-reset" class="hud-btn" title="Reset Solar System">
            <span class="btn-icon-wrap">${PixelIcons.reset}</span>
            <span>RESET</span>
          </button>
        </div>
      </header>

      <!-- BOTTOM PLANET CAROUSEL -->
      <div class="carousel-container">
        <div class="carousel-track" id="planet-carousel"></div>
      </div>
    `;

    // Elements
    this.playPauseBtn = this.container.querySelector('#btn-pause-play')!;
    this.scaleToggleBtn = this.container.querySelector('#btn-toggle-scale')!;
    this.scaleModeTextEl = this.container.querySelector('#scale-mode-text')!;
    this.orbitToggleBtn = this.container.querySelector('#btn-toggle-orbits')!;
    this.resetBtn = this.container.querySelector('#btn-reset')!;
    this.spawnBtn = this.container.querySelector('#btn-spawn')!;
    this.carouselList = this.container.querySelector('#planet-carousel')!;

    // Play/Pause
    this.playPauseBtn.addEventListener('click', () => {
      this.engine.isPaused = !this.engine.isPaused;
      const icon = this.container.querySelector('#icon-play-pause')!;
      icon.innerHTML = this.engine.isPaused ? PixelIcons.play : PixelIcons.pause;
    });

    // Speed multiplier buttons
    const speedButtons = this.container.querySelectorAll<HTMLButtonElement>('.speed-btn');
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.engine.timeScale = parseFloat(btn.dataset.speed || '1.0');
      });
    });

    // Scale toggle
    this.scaleToggleBtn.addEventListener('click', () => {
      const newMode = this.engine.toggleScaleMode();
      this.scaleModeTextEl.textContent = newMode === 'accurate' ? 'SCALE: TRUE 1:1' : 'SCALE: STYLIZED';
      this.scaleToggleBtn.classList.toggle('scale-accurate', newMode === 'accurate');
      this.sceneManager.onScaleModeChanged(newMode, this.engine.bodies);
      this.showToast(newMode === 'accurate'
        ? '[SCALE] True Astronomical Proportions Activated (1 AU = 2,000u)'
        : '[SCALE] Stylized Playable Proportions Activated'
      );
    });

    // Orbit toggle
    this.orbitToggleBtn.addEventListener('click', () => {
      this.orbitRenderer.visible = !this.orbitRenderer.visible;
      this.orbitRenderer.setVisible(this.orbitRenderer.visible);
      this.orbitToggleBtn.classList.toggle('active', this.orbitRenderer.visible);
    });

    // Reset Solar System
    this.resetBtn.addEventListener('click', () => {
      this.resetSimulation();
    });

    // Spawn / Launch Menu mode
    this.spawnBtn.addEventListener('click', () => {
      if (this.launchMenu) {
        this.launchMenu.toggle();
        this.spawnBtn.classList.toggle('active', this.launchMenu.isVisible());
      } else {
        this.isSpawningMode = !this.isSpawningMode;
        this.spawnBtn.classList.toggle('active', this.isSpawningMode);
        if (this.isSpawningMode) {
          this.showToast('[LAUNCH] Click/drag in space to launch a custom voxel planet');
        }
      }
    });

    this.renderCarousel();
  }

  public renderCarousel() {
    this.carouselList.innerHTML = '';

    const majorBodies = [
      { id: 'sun', name: 'SUN' },
      { id: 'mercury', name: 'MERCURY' },
      { id: 'venus', name: 'VENUS' },
      { id: 'earth', name: 'EARTH' },
      { id: 'moon', name: 'MOON' },
      { id: 'mars', name: 'MARS' },
      { id: 'jupiter', name: 'JUPITER' },
      { id: 'saturn', name: 'SATURN' },
      { id: 'uranus', name: 'URANUS' },
      { id: 'neptune', name: 'NEPTUNE' }
    ];

    for (const item of majorBodies) {
      const body = this.engine.bodies.find(b => b.id === item.id);
      const isDestroyed = body ? body.isDestroyed : false;

      const pill = document.createElement('button');
      pill.className = `carousel-pill ${isDestroyed ? 'destroyed' : ''}`;
      pill.dataset.id = item.id;
      pill.innerHTML = `
        <span class="pill-badge">${getBodyPixelBadge(item.id, isDestroyed)}</span>
        <span class="pill-name">${item.name}</span>
        ${isDestroyed ? '<span class="pill-dead-tag">[SHATTERED]</span>' : ''}
      `;

      pill.addEventListener('click', () => {
        const target = this.engine.bodies.find(b => b.id === item.id && !b.isDestroyed);
        if (target) {
          this.sceneManager.setTrackedBody(target.id, target);
          if (this.onSelectBodyCallback) {
            this.onSelectBodyCallback(target);
          }
        }
      });

      this.carouselList.appendChild(pill);
    }
  }

  public setOnSelectBody(cb: (body: CelestialBody) => void) {
    this.onSelectBodyCallback = cb;
  }

  private resetSimulation() {
    this.debrisManager.clear();
    this.orbitRenderer.clear();
    const newBodies = createInitialBodies();
    this.engine.setBodies(newBodies);
    if (this.engine.scaleMode === 'accurate') {
      this.engine.setScaleMode('accurate', true);
    }
    this.sceneManager.syncBodies(newBodies);
    this.sceneManager.setTrackedBody(null);
    this.renderCarousel();
    this.showToast('[SYSTEM] Solar system restored to canonical orbits');
  }

  private setupSpawnInteraction(dom: HTMLElement) {
    let isFlinging = false;
    let startX = 0;
    let startY = 0;

    dom.addEventListener('pointerdown', (e) => {
      if (!this.isSpawningMode) return;
      // Don't fling if clicking on UI
      if ((e.target as HTMLElement).closest('.top-bar, .inspector-panel, .carousel-container')) return;

      isFlinging = true;
      startX = e.clientX;
      startY = e.clientY;
    });

    dom.addEventListener('pointerup', (e) => {
      if (!isFlinging || !this.isSpawningMode) return;
      isFlinging = false;
      this.isSpawningMode = false;
      this.spawnBtn.classList.remove('active');

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Unproject point into 3D world space on the orbital plane (Y=0)
      const rect = dom.getBoundingClientRect();
      const nx = ((startX - rect.left) / rect.width) * 2 - 1;
      const ny = -((startY - rect.top) / rect.height) * 2 + 1;

      const ray = new THREE.Ray();
      ray.origin.copy(this.sceneManager.camera.position);
      const ndc = new THREE.Vector3(nx, ny, 0.5).unproject(this.sceneManager.camera);
      ray.direction.subVectors(ndc, ray.origin).normalize();

      // Intersect with horizontal plane Y = 0
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const targetPos = new THREE.Vector3();
      if (ray.intersectPlane(plane, targetPos)) {
        // Velocity vector from drag direction
        const velFactor = 0.25;
        const vel = new THREE.Vector3(dx * velFactor, 0, dy * velFactor);
        if (vel.lengthSq() < 1) {
          // Default orbital velocity perpendicular to center
          const rad = targetPos.clone().normalize();
          vel.set(-rad.z, 0, rad.x).multiplyScalar(22);
        }

        const cfg = this.launchMenu ? this.launchMenu.getCurrentConfig() : null;
        const customId = `asteroid_${Date.now()}`;
        const newPlanet: CelestialBody = {
          id: customId,
          name: cfg ? `${cfg.material.name.split(' ')[0]} #${Math.floor(Math.random() * 900 + 100)}` : `Voxeloid #${Math.floor(Math.random() * 900 + 100)}`,
          type: 'custom',
          mass: cfg ? cfg.mass : 30,
          baseMass: cfg ? cfg.mass : 30,
          radius: cfg ? cfg.radius : 3.5,
          baseRadius: cfg ? cfg.radius : 3.5,
          position: targetPos,
          velocity: vel,
          rotationSpeed: 0.02,
          rotationAngle: 0,
          colorPalette: cfg ? [...cfg.material.colorPalette] : [0x8e44ad, 0x9b59b6, 0x2980b9, 0x1abc9c],
          coreColor: cfg ? cfg.material.coreColor : 0x8e44ad,
          surfacePattern: cfg ? cfg.material.surfacePattern : 'continents',
          isDestroyed: false,
          voxelResolution: 4,
          voxelSize: (cfg ? cfg.radius : 3.5) / 4,
          orbitColor: cfg ? cfg.material.orbitColor : 0xaf7ac5
        };

        this.engine.bodies.push(newPlanet);
        this.sceneManager.syncBodies(this.engine.bodies);
        this.showToast(`[LAUNCH] Fling deployed ${newPlanet.name} (${cfg ? cfg.material.classification : 'Custom'}!`);
        if (this.onSelectBodyCallback) {
          this.onSelectBodyCallback(newPlanet);
        }
      }
    });
  }

  public armFlingMode() {
    this.isSpawningMode = true;
    this.spawnBtn.classList.add('active');
    this.showToast('[LAUNCH DECK] Click & drag in 3D space to fling your configured asteroid');
  }

  public showToast(msg: string) {
    let toast = document.querySelector('.sim-toast') as HTMLElement;
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'sim-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
}
