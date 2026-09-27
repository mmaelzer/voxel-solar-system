import { CelestialBody } from '../physics/types';
import { NBodyEngine } from '../physics/NBodyEngine';
import { SceneManager } from '../renderer/SceneManager';
import { VoxelDebrisManager } from '../renderer/VoxelDebrisManager';
import { G } from '../physics/constants';
import { PixelIcons, getBodyPixelBadge } from './PixelIcons';

export class InspectorPanel {
  private container: HTMLElement;
  private currentBody: CelestialBody | null = null;
  private engine: NBodyEngine;
  private sceneManager: SceneManager;
  private debrisManager: VoxelDebrisManager;
  private onDeselectCallback?: () => void;
  private onToastCallback?: (msg: string) => void;

  // UI Elements
  private nameEl!: HTMLElement;
  private typeEl!: HTMLElement;
  private badgeEl!: HTMLElement;
  private massSlider!: HTMLInputElement;
  private massValEl!: HTMLElement;
  private speedSlider!: HTMLInputElement;
  private speedValEl!: HTMLElement;
  private currentSpeedEl!: HTMLElement;
  private currentRadiusEl!: HTMLElement;
  private circularizeBtn!: HTMLButtonElement;
  private reverseBtn!: HTMLButtonElement;
  private shatterBtn!: HTMLButtonElement;
  private focusBtn!: HTMLButtonElement;
  private closeBtn!: HTMLButtonElement;

  constructor(
    parent: HTMLElement,
    engine: NBodyEngine,
    sceneManager: SceneManager,
    debrisManager: VoxelDebrisManager
  ) {
    this.engine = engine;
    this.sceneManager = sceneManager;
    this.debrisManager = debrisManager;

    this.container = document.createElement('div');
    this.container.className = 'inspector-panel hidden';
    parent.appendChild(this.container);

    this.buildUI();
  }

  private buildUI() {
    this.container.innerHTML = `
      <div class="panel-header">
        <div class="title-wrap">
          <span id="inspector-badge" class="body-badge-wrap"></span>
          <div>
            <h2 id="inspector-name">Earth</h2>
            <span id="inspector-type" class="badge">PLANET</span>
          </div>
        </div>
        <button id="inspector-close" class="btn-icon" aria-label="Close Inspector">${PixelIcons.close}</button>
      </div>

      <div class="panel-stats">
        <div class="stat-pill">
          <span class="stat-label">RADIUS</span>
          <span id="stat-radius" class="stat-value">5.20 u</span>
        </div>
        <div class="stat-pill">
          <span class="stat-label">SPEED</span>
          <span id="stat-speed" class="stat-value">25.3 u/s</span>
        </div>
      </div>

      <div class="control-group">
        <div class="slider-header">
          <label for="mass-slider">MASS &amp; SIZE</label>
          <span id="mass-value" class="slider-value">65.0 (1.0x)</span>
        </div>
        <input type="range" id="mass-slider" min="0.05" max="10.0" step="0.05" value="1.0" class="touch-slider" />
        <div class="slider-subtext">Larger mass increases gravity &amp; voxel radius</div>
      </div>

      <div class="control-group">
        <div class="slider-header">
          <label for="speed-slider">ORBITAL SPEED</label>
          <span id="speed-value" class="slider-value">1.0x</span>
        </div>
        <input type="range" id="speed-slider" min="0.0" max="3.0" step="0.05" value="1.0" class="touch-slider" />
        <div class="slider-subtext">Modifies velocity magnitude; dynamic orbit line updates live</div>
      </div>

      <div class="action-grid">
        <button id="btn-circularize" class="action-btn" title="Reset orbit to an ideal circular velocity so it stops wobbling">
          <span class="btn-icon-wrap">${PixelIcons.circularize}</span>
          <div class="action-text-wrap">
            <span class="action-title">CIRCULARIZE</span>
            <span class="action-desc">Make orbit round</span>
          </div>
        </button>
        <button id="btn-reverse" class="action-btn" title="Invert velocity to make the body orbit in the opposite direction">
          <span class="btn-icon-wrap">${PixelIcons.reverse}</span>
          <div class="action-text-wrap">
            <span class="action-title">REVERSE</span>
            <span class="action-desc">Orbit opposite way</span>
          </div>
        </button>
        <button id="btn-focus" class="action-btn" title="Lock and center the camera on this body as it orbits">
          <span class="btn-icon-wrap">${PixelIcons.track}</span>
          <div class="action-text-wrap">
            <span class="action-title">TRACK CAM</span>
            <span class="action-desc">Follow with camera</span>
          </div>
        </button>
        <button id="btn-shatter" class="action-btn danger" title="Blow apart this body into dynamic physical voxel fragments">
          <span class="btn-icon-wrap">${PixelIcons.shatter}</span>
          <div class="action-text-wrap">
            <span class="action-title">DETONATE</span>
            <span class="action-desc">Blow up into voxels</span>
          </div>
        </button>
      </div>
    `;

    // Query elements
    this.nameEl = this.container.querySelector('#inspector-name')!;
    this.typeEl = this.container.querySelector('#inspector-type')!;
    this.badgeEl = this.container.querySelector('#inspector-badge')!;
    this.massSlider = this.container.querySelector('#mass-slider')!;
    this.massValEl = this.container.querySelector('#mass-value')!;
    this.speedSlider = this.container.querySelector('#speed-slider')!;
    this.speedValEl = this.container.querySelector('#speed-value')!;
    this.currentRadiusEl = this.container.querySelector('#stat-radius')!;
    this.currentSpeedEl = this.container.querySelector('#stat-speed')!;
    this.circularizeBtn = this.container.querySelector('#btn-circularize')!;
    this.reverseBtn = this.container.querySelector('#btn-reverse')!;
    this.shatterBtn = this.container.querySelector('#btn-shatter')!;
    this.focusBtn = this.container.querySelector('#btn-focus')!;
    this.closeBtn = this.container.querySelector('#inspector-close')!;

    // Event handlers
    this.massSlider.addEventListener('input', () => this.handleMassChange());
    this.speedSlider.addEventListener('input', () => this.handleSpeedChange());

    this.circularizeBtn.addEventListener('click', () => {
      if (this.currentBody) {
        const res = this.engine.circularizeOrbit(this.currentBody.id);
        this.speedSlider.value = '1.0';
        this.speedValEl.textContent = '1.0×';
        this.updateLiveStats();
        this.circularizeBtn.classList.add('btn-flash');
        setTimeout(() => this.circularizeBtn.classList.remove('btn-flash'), 500);

        if (res && this.onToastCallback) {
          this.onToastCallback(`[CIRCULARIZE] ${this.currentBody.name} circularized at ${res.speed.toFixed(1)} u/s around ${res.attractorName}`);
        }
      }
    });

    this.reverseBtn.addEventListener('click', () => {
      if (this.currentBody && this.currentBody.type !== 'star') {
        this.engine.reverseOrbit(this.currentBody.id);
        this.updateLiveStats();
        this.reverseBtn.classList.add('btn-flash');
        setTimeout(() => this.reverseBtn.classList.remove('btn-flash'), 500);

        if (this.onToastCallback) {
          this.onToastCallback(`[REVERSE] ${this.currentBody.name} orbit inverted to retrograde`);
        }
      }
    });

    this.focusBtn.addEventListener('click', () => {
      if (this.currentBody) {
        this.sceneManager.setTrackedBody(this.currentBody.id, this.currentBody);
      }
    });

    this.shatterBtn.addEventListener('click', () => {
      if (this.currentBody) {
        const bodyToShatter = this.currentBody;
        bodyToShatter.isDestroyed = true;
        this.debrisManager.shatterBody(bodyToShatter);
        this.hide();
      }
    });

    this.closeBtn.addEventListener('click', () => {
      this.hide();
      if (this.onDeselectCallback) this.onDeselectCallback();
    });
  }

  public setOnDeselect(cb: () => void) {
    this.onDeselectCallback = cb;
  }

  public setOnToast(cb: (msg: string) => void) {
    this.onToastCallback = cb;
  }

  public selectBody(body: CelestialBody) {
    this.currentBody = body;
    this.nameEl.textContent = body.name.toUpperCase();
    this.typeEl.textContent = body.type.toUpperCase();
    this.badgeEl.innerHTML = getBodyPixelBadge(body.id, body.isDestroyed);

    // Set mass slider
    const massRatio = body.mass / body.baseMass;
    this.massSlider.value = massRatio.toFixed(2);
    this.massValEl.textContent = `${body.mass.toFixed(1)} (${massRatio.toFixed(1)}x)`;

    // Reset speed multiplier slider to 1.0 (relative adjust)
    this.speedSlider.value = '1.0';
    this.speedValEl.textContent = '1.0x';

    // Disable speed modifier on Sun
    this.speedSlider.disabled = body.type === 'star';
    this.circularizeBtn.disabled = body.type === 'star';
    this.reverseBtn.disabled = body.type === 'star';

    this.container.classList.remove('hidden');
  }

  public updateLiveStats() {
    if (!this.currentBody || this.currentBody.isDestroyed) {
      if (!this.container.classList.contains('hidden') && this.currentBody?.isDestroyed) {
        this.hide();
      }
      return;
    }

    const speed = this.currentBody.velocity.length();
    this.currentSpeedEl.textContent = `${speed.toFixed(1)} u/s`;
    this.currentRadiusEl.textContent = `${this.currentBody.radius.toFixed(2)} u`;
  }

  private handleMassChange() {
    if (!this.currentBody) return;
    const ratio = parseFloat(this.massSlider.value);
    const newMass = this.currentBody.baseMass * ratio;
    this.engine.setBodyMass(this.currentBody.id, newMass);
    this.massValEl.textContent = `${newMass.toFixed(1)} (${ratio.toFixed(1)}×)`;
  }

  private handleSpeedChange() {
    if (!this.currentBody || this.currentBody.type === 'star') return;
    const multiplier = parseFloat(this.speedSlider.value);
    this.speedValEl.textContent = `${multiplier.toFixed(2)}×`;

    // Find reference circular speed or scale current velocity
    const attractor = this.engine.getDominantAttractor(this.currentBody);
    if (attractor) {
      const dist = this.currentBody.position.distanceTo(attractor.position);
      const idealCircularSpeed = Math.sqrt((G * attractor.mass) / Math.max(1, dist));
      const targetSpeed = idealCircularSpeed * multiplier;
      this.engine.setBodySpeed(this.currentBody.id, targetSpeed);
    }
  }

  public hide() {
    this.currentBody = null;
    this.container.classList.add('hidden');
  }

  public isVisible(): boolean {
    return !this.container.classList.contains('hidden');
  }
}
