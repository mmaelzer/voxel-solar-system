import * as THREE from 'three';
import { ASTEROID_MATERIALS, AsteroidMaterial, computeAsteroidMass } from '../physics/materials';
import { CelestialBody } from '../physics/types';
import { NBodyEngine } from '../physics/NBodyEngine';
import { SceneManager } from '../renderer/SceneManager';
import { PixelIcons } from './PixelIcons';

export interface LaunchConfig {
  material: AsteroidMaterial;
  radius: number;
  densityGPerCm3: number;
  densityMultiplier: number;
  mass: number;
}

export class LaunchMenu {
  private container: HTMLElement;
  private engine: NBodyEngine;
  private sceneManager: SceneManager;
  private onDeployCallback?: (body: CelestialBody) => void;
  private onArmFlingCallback?: () => void;
  private onToastCallback?: (msg: string) => void;

  // Selected State
  private currentMaterialIndex: number = 0; // Default Uranium
  private currentRadius: number = 3.5;
  private currentDensity: number = ASTEROID_MATERIALS[0].densityGPerCm3;

  // DOM Elements
  private closeBtn!: HTMLButtonElement;
  private materialSlider!: HTMLInputElement;
  private sizeSlider!: HTMLInputElement;
  private densitySlider!: HTMLInputElement;
  private prevMatBtn!: HTMLButtonElement;
  private nextMatBtn!: HTMLButtonElement;

  private matNameEl!: HTMLElement;
  private matClassEl!: HTMLElement;
  private matBadgeEl!: HTMLElement;
  private matDescEl!: HTMLElement;
  private matLoreEl!: HTMLElement;
  private sizeValEl!: HTMLElement;
  private densityValEl!: HTMLElement;
  private massValEl!: HTMLElement;

  private swatchesContainer!: HTMLElement;
  private armBtn!: HTMLButtonElement;
  private deployBtn!: HTMLButtonElement;

  constructor(
    parent: HTMLElement,
    engine: NBodyEngine,
    sceneManager: SceneManager
  ) {
    this.engine = engine;
    this.sceneManager = sceneManager;

    this.container = document.createElement('div');
    this.container.className = 'launch-menu hidden';
    parent.appendChild(this.container);

    this.buildUI();
    this.bindEvents();
    this.updateMaterialUI();
  }

  private buildUI() {
    this.container.innerHTML = `
      <div class="launch-header">
        <div class="launch-title-wrap">
          <span class="launch-icon">${PixelIcons.fling}</span>
          <div class="launch-title-text">
            <h2>ORBITAL LAUNCH DECK</h2>
            <span class="sub-text">HYPOTHETICAL ASTEROID FOUNDRY</span>
          </div>
        </div>
        <button id="launch-close" class="inspector-close-btn" title="Close Launch Deck">[X]</button>
      </div>

      <div class="launch-content">
        <!-- MATERIAL SELECTOR & SLIDER -->
        <div class="launch-section">
          <div class="section-label-row">
            <span class="section-tag">ASTEROID SOLID MATERIAL (10 TYPES)</span>
            <div class="stepper-controls">
              <button id="btn-mat-prev" class="stepper-btn" title="Previous solid material">&lt;</button>
              <span id="mat-index-indicator" class="stepper-index">1 / 10</span>
              <button id="btn-mat-next" class="stepper-btn" title="Next solid material">&gt;</button>
            </div>
          </div>

          <!-- MATERIAL SLIDER -->
          <div class="slider-group">
            <input type="range" id="material-slider" class="precision-slider" min="0" max="9" step="1" value="0">
          </div>

          <!-- MATERIAL BUTTONS SWATCH PALETTE -->
          <div class="material-swatches" id="material-swatches-grid"></div>

          <!-- MATERIAL CARD PREVIEW -->
          <div class="material-preview-card">
            <div class="mat-card-header">
              <div class="mat-badge" id="mat-badge">U-92</div>
              <div class="mat-naming">
                <h3 id="mat-name">Uranium-238 (Pitchblende)</h3>
                <span class="mat-class" id="mat-class">Super-Heavy Actinide Solid</span>
              </div>
            </div>
            <p class="mat-desc" id="mat-desc"></p>
            <p class="mat-lore" id="mat-lore"></p>
          </div>
        </div>

        <!-- SIZE SLIDER -->
        <div class="launch-section">
          <div class="section-label-row">
            <span class="section-tag">RADIUS / SIZE</span>
            <span id="size-val" class="stat-highlight">3.5 u</span>
          </div>
          <div class="slider-group">
            <input type="range" id="size-slider" class="precision-slider" min="1.0" max="12.0" step="0.1" value="3.5">
          </div>
        </div>

        <!-- DENSITY SLIDER -->
        <div class="launch-section">
          <div class="section-label-row">
            <span class="section-tag">SOLID DENSITY (PHYSICAL)</span>
            <span id="density-val" class="stat-highlight">19.1 g/cm³</span>
          </div>
          <div class="slider-group">
            <input type="range" id="density-slider" class="precision-slider" min="0.5" max="50.0" step="0.1" value="19.1">
          </div>
        </div>

        <!-- MASS TELEMETRY -->
        <div class="launch-telemetry">
          <div class="telemetry-item">
            <span class="telemetry-label">COMPUTED MASS</span>
            <span id="mass-val" class="telemetry-val">191.0 u</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">GRAVITATIONAL PULL</span>
            <span id="gravity-rating" class="telemetry-val">EXTREME</span>
          </div>
        </div>

        <!-- LAUNCH ACTION BUTTONS -->
        <div class="launch-actions">
          <button id="btn-deploy-belt" class="action-btn primary-action" title="Immediately launch into a stable circular orbit in the asteroid belt">
            <span class="btn-icon-wrap">${PixelIcons.circularize}</span>
            <div class="btn-text-block">
              <span class="action-title">DEPLOY TO BELT ORBIT</span>
              <span class="action-desc">Launch into circular Keplerian belt</span>
            </div>
          </button>

          <button id="btn-arm-fling" class="action-btn" title="Aim and fling anywhere across 3D space by dragging with pointer">
            <span class="btn-icon-wrap">${PixelIcons.fling}</span>
            <div class="btn-text-block">
              <span class="action-title">ARM &amp; AIM (FLING)</span>
              <span class="action-desc">Drag in space to launch with velocity</span>
            </div>
          </button>
        </div>
      </div>
    `;

    // Query elements
    this.closeBtn = this.container.querySelector('#launch-close')!;
    this.materialSlider = this.container.querySelector('#material-slider')!;
    this.sizeSlider = this.container.querySelector('#size-slider')!;
    this.densitySlider = this.container.querySelector('#density-slider')!;
    this.prevMatBtn = this.container.querySelector('#btn-mat-prev')!;
    this.nextMatBtn = this.container.querySelector('#btn-mat-next')!;

    this.matNameEl = this.container.querySelector('#mat-name')!;
    this.matClassEl = this.container.querySelector('#mat-class')!;
    this.matBadgeEl = this.container.querySelector('#mat-badge')!;
    this.matDescEl = this.container.querySelector('#mat-desc')!;
    this.matLoreEl = this.container.querySelector('#mat-lore')!;
    this.sizeValEl = this.container.querySelector('#size-val')!;
    this.densityValEl = this.container.querySelector('#density-val')!;
    this.massValEl = this.container.querySelector('#mass-val')!;

    this.swatchesContainer = this.container.querySelector('#material-swatches-grid')!;
    this.armBtn = this.container.querySelector('#btn-arm-fling')!;
    this.deployBtn = this.container.querySelector('#btn-deploy-belt')!;

    // Render Material Buttons (All 10 solids!)
    this.renderMaterialSwatches();
  }

  private renderMaterialSwatches() {
    this.swatchesContainer.innerHTML = '';
    ASTEROID_MATERIALS.forEach((mat, idx) => {
      const btn = document.createElement('button');
      btn.className = `mat-swatch-btn ${idx === this.currentMaterialIndex ? 'active' : ''}`;
      btn.title = `${mat.name} (${mat.densityGPerCm3} g/cm³)`;
      btn.dataset.index = idx.toString();

      const hexColor = `#${mat.coreColor.toString(16).padStart(6, '0')}`;
      btn.innerHTML = `
        <span class="swatch-color" style="background-color: ${hexColor}"></span>
        <span class="swatch-symbol">${mat.badgeSymbol}</span>
      `;

      btn.addEventListener('click', () => {
        this.selectMaterialIndex(idx);
      });

      this.swatchesContainer.appendChild(btn);
    });
  }

  private bindEvents() {
    // Close button
    this.closeBtn.addEventListener('click', () => this.hide());

    // Material Slider
    this.materialSlider.addEventListener('input', () => {
      const idx = parseInt(this.materialSlider.value, 10);
      this.selectMaterialIndex(idx, false);
    });

    // Steppers (< and >)
    this.prevMatBtn.addEventListener('click', () => {
      const newIdx = (this.currentMaterialIndex - 1 + ASTEROID_MATERIALS.length) % ASTEROID_MATERIALS.length;
      this.selectMaterialIndex(newIdx);
    });

    this.nextMatBtn.addEventListener('click', () => {
      const newIdx = (this.currentMaterialIndex + 1) % ASTEROID_MATERIALS.length;
      this.selectMaterialIndex(newIdx);
    });

    // Size Slider
    this.sizeSlider.addEventListener('input', () => {
      this.currentRadius = parseFloat(this.sizeSlider.value);
      this.sizeValEl.textContent = `${this.currentRadius.toFixed(1)} u`;
      this.updateTelemetry();
    });

    // Density Slider
    this.densitySlider.addEventListener('input', () => {
      this.currentDensity = parseFloat(this.densitySlider.value);
      this.densityValEl.textContent = `${this.currentDensity.toFixed(1)} g/cm³`;
      this.updateTelemetry();
    });

    // Deploy to Belt Orbit Button
    this.deployBtn.addEventListener('click', () => {
      this.deployToBeltOrbit();
    });

    // Arm & Aim Button
    this.armBtn.addEventListener('click', () => {
      this.hide();
      if (this.onArmFlingCallback) {
        this.onArmFlingCallback();
      }
    });
  }

  public selectMaterialIndex(idx: number, updateSlider: boolean = true) {
    this.currentMaterialIndex = Math.max(0, Math.min(idx, ASTEROID_MATERIALS.length - 1));
    const mat = ASTEROID_MATERIALS[this.currentMaterialIndex];

    if (updateSlider) {
      this.materialSlider.value = this.currentMaterialIndex.toString();
    }

    // Auto-align density slider to material baseline density
    this.currentDensity = mat.densityGPerCm3;
    this.densitySlider.value = this.currentDensity.toFixed(1);
    this.densityValEl.textContent = `${this.currentDensity.toFixed(1)} g/cm³`;

    // Highlight active swatch button
    const buttons = this.swatchesContainer.querySelectorAll('.mat-swatch-btn');
    buttons.forEach((b, i) => {
      b.classList.toggle('active', i === this.currentMaterialIndex);
    });

    this.updateMaterialUI();
  }

  private updateMaterialUI() {
    const mat = ASTEROID_MATERIALS[this.currentMaterialIndex];
    const indEl = this.container.querySelector('#mat-index-indicator');
    if (indEl) indEl.textContent = `${this.currentMaterialIndex + 1} / ${ASTEROID_MATERIALS.length}`;

    this.matNameEl.textContent = mat.name;
    this.matClassEl.textContent = mat.classification;
    this.matBadgeEl.textContent = mat.badgeSymbol;
    this.matBadgeEl.style.borderColor = `#${mat.coreColor.toString(16).padStart(6, '0')}`;
    this.matBadgeEl.style.color = `#${mat.coreColor.toString(16).padStart(6, '0')}`;
    this.matDescEl.textContent = mat.description;
    this.matLoreEl.textContent = mat.lore;

    this.updateTelemetry();
  }

  private updateTelemetry() {
    const densityRatio = this.currentDensity / 3.0; // 3.0 g/cm³ is baseline rock
    const mass = computeAsteroidMass(this.currentRadius, densityRatio);
    this.massValEl.textContent = `${mass.toFixed(1)} u`;

    const gravEl = this.container.querySelector('#gravity-rating');
    if (gravEl) {
      if (mass > 300) {
        gravEl.textContent = 'EXTREME';
        gravEl.className = 'telemetry-val danger';
      } else if (mass > 80) {
        gravEl.textContent = 'HIGH';
        gravEl.className = 'telemetry-val warning';
      } else {
        gravEl.textContent = 'MODERATE';
        gravEl.className = 'telemetry-val';
      }
    }
  }

  public getCurrentConfig(): LaunchConfig {
    const mat = ASTEROID_MATERIALS[this.currentMaterialIndex];
    const densityRatio = this.currentDensity / 3.0;
    const mass = computeAsteroidMass(this.currentRadius, densityRatio);

    return {
      material: mat,
      radius: this.currentRadius,
      densityGPerCm3: this.currentDensity,
      densityMultiplier: densityRatio,
      mass
    };
  }

  public deployToBeltOrbit() {
    const cfg = this.getCurrentConfig();
    const customId = `asteroid_${Date.now()}`;

    // Place asteroid in the Main Asteroid Belt (between Mars 190 and Jupiter 275)
    // Random belt radius between 225 and 245
    const beltDist = 225 + Math.random() * 20;
    const angle = Math.random() * Math.PI * 2;
    const posX = beltDist * Math.cos(angle);
    const posZ = beltDist * Math.sin(angle);
    const pos = new THREE.Vector3(posX, 0, posZ);

    // Calculate ideal Keplerian circular speed around the Sun
    const sun = this.engine.bodies.find(b => b.type === 'star' && !b.isDestroyed);
    const sunMass = sun ? sun.mass : 20000;
    const speed = Math.sqrt((100 * (sunMass + cfg.mass)) / beltDist);

    // Prograde tangent vector
    const vel = new THREE.Vector3(-posZ, 0, posX).normalize().multiplyScalar(speed);

    const newAsteroid: CelestialBody = {
      id: customId,
      name: `${cfg.material.name.split(' ')[0]} #${Math.floor(Math.random() * 900 + 100)}`,
      type: 'custom',
      mass: cfg.mass,
      baseMass: cfg.mass,
      radius: cfg.radius,
      baseRadius: cfg.radius,
      position: pos,
      velocity: vel,
      rotationSpeed: 0.025,
      rotationAngle: 0,
      colorPalette: [...cfg.material.colorPalette],
      coreColor: cfg.material.coreColor,
      surfacePattern: cfg.material.surfacePattern,
      isDestroyed: false,
      voxelResolution: 4,
      voxelSize: cfg.radius / 4,
      orbitColor: cfg.material.orbitColor
    };

    this.engine.bodies.push(newAsteroid);
    this.sceneManager.syncBodies(this.engine.bodies);

    if (this.onToastCallback) {
      this.onToastCallback(`[DEPLOY] ${newAsteroid.name} (${cfg.material.classification}) launched into Belt orbit!`);
    }

    if (this.onDeployCallback) {
      this.onDeployCallback(newAsteroid);
    }

    this.hide();
  }

  public setOnDeploy(cb: (body: CelestialBody) => void) {
    this.onDeployCallback = cb;
  }

  public setOnArmFling(cb: () => void) {
    this.onArmFlingCallback = cb;
  }

  public setOnToast(cb: (msg: string) => void) {
    this.onToastCallback = cb;
  }

  public show() {
    this.container.classList.remove('hidden');
  }

  public hide() {
    this.container.classList.add('hidden');
  }

  public toggle() {
    this.container.classList.toggle('hidden');
  }

  public isVisible(): boolean {
    return !this.container.classList.contains('hidden');
  }
}
