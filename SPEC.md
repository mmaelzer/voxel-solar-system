# Voxel Solar System Simulator — Technical Specification (SPEC.md)

This specification defines the system architecture, mathematical formulations, data models, rendering conventions, and verification contracts for the **Voxel Solar System Simulator**. It serves as the authoritative reference for developers and AI models working on or extending this codebase.

---

## 1. System Overview & Design Philosophy

The Voxel Solar System Simulator is a high-performance, real-time 3D simulation of Earth's solar system. It merges rigorous gravitational mechanics with a distinctive **voxel-art aesthetic** inspired by games like *Minecraft*, while maintaining spherical planetary forms and physical destruction dynamics.

### Core Tenets
1. **Continuous Motion**: Bodies continuously advance on their orbits regardless of whether the user is interacting with UI sliders, moving the camera, or inspecting properties.
2. **Visual Playability vs. Astronomical Coherence**: True astronomical distance-to-radius ratios (over 10,000:1) render planets invisible sub-pixels. The simulator uses a compressed astronomical scale that preserves Keplerian period proportionality ($T^2 \propto a^3$) and relative velocity profiles, while keeping planets, moons, and orbits visually legible and interactive.
3. **Spherical Voxel Art**: Planets and stars are not monolithic giant cubes; they are spherical voxel clusters constructed from discrete, beveled unit cubes (`THREE.InstancedMesh`) with stylized faceted shading and authentic planetary color palettes.
4. **Physical Voxel Shattering**: Collisions and manual detonations fragment voxel spheres into discrete physical debris blocks that disperse with explosive momentum and respond dynamically to celestial gravity.
5. **Non-Flickering Trajectory Lines**: Orbit lines are calculated using analytical osculating Keplerian conic equations, rendering closed 360-degree ellipses for bound orbits and hyperbolic arcs for escape trajectories with zero numerical integration flicker.
6. **Input Parity**: All controls, camera navigation, and inspection tools function identically and intuitively with a desktop mouse cursor or on mobile/tablet touchscreens.

---

## 2. Directory Layout & Architecture

```
/Users/mmaelzer/code/stars/
├── SPEC.md                           # This document: primary architectural reference
├── index.html                        # Application entrypoint & viewport meta configuration
├── package.json                      # Scripts and dependencies (Three.js, Vitest, Vite, TS)
├── tsconfig.json                     # TypeScript compiler configuration
├── vite.config.ts                    # Vite build & dev server configuration
└── src/
    ├── main.ts                       # Application lifecycle & animation loop
    ├── style.css                     # Responsive glassmorphism & voxel HUD styling
    ├── physics/
    │   ├── types.ts                  # Core TypeScript types & data models
    │   ├── constants.ts              # Physical constants & initial celestial body templates
    │   ├── NBodyEngine.ts            # Symplectic Velocity-Verlet gravitational integrator
    │   ├── CollisionEngine.ts        # Spherical collision detection & momentum resolution
    │   ├── OrbitPredictor.ts         # Analytical Keplerian trajectory line calculator
    │   └── __tests__/
    │       └── solar_system.test.ts  # Vitest stability, mass/speed, and collision test suite
    ├── renderer/
    │   ├── VoxelGenerator.ts         # Algorithmic spherical voxelizer & palette mapper
    │   ├── VoxelDebrisManager.ts     # Particle pooling & gravity simulation for debris
    │   ├── OrbitRenderer.ts          # Zero-allocation GPU buffer line renderer
    │   └── SceneManager.ts           # Three.js scene, lighting, camera tracking, cubic starfield
    ├── ui/
    │   ├── TouchControls.ts          # Dual mouse & touch gesture camera controller
    │   ├── InspectorPanel.ts         # Body modifier HUD (mass, speed, circularize, shatter)
    │   └── HUD.ts                    # Top controls, bottom planet carousel, rogue launcher
    └── spec/
        ├── model_spec.ts             # Programmatic constants, validators, & test fixtures
        ├── index.ts                  # Spec module re-exports
        └── __tests__/
            └── multi_model.spec.ts   # Conformance tests across all codebase models
```

---

## 3. Data Models & Type Contracts (`src/physics/types.ts`)

### 3.1 `CelestialBody`
The primary domain model representing any star, planet, moon, or spawned custom body.

```typescript
export type BodyType = 'star' | 'planet' | 'moon' | 'custom';

export interface CelestialBody {
  id: string;                         // Unique identifier (e.g. 'earth', 'moon', 'rogue_123')
  name: string;                       // Human-readable display label
  type: BodyType;                     // Category determining gravitational role & hierarchy
  mass: number;                       // Current active mass (modifiable via slider)
  baseMass: number;                   // Canonical baseline mass for proportional scaling
  radius: number;                     // Current bounding radius in world units
  baseRadius: number;                 // Canonical baseline radius
  position: THREE.Vector3;            // World space position [X, Y, Z]
  velocity: THREE.Vector3;            // World space velocity [Vx, Vy, Vz]
  rotationSpeed: number;              // Axial rotation speed in radians per second
  rotationAngle: number;              // Current accumulated axial rotation angle

  // Voxel styling properties
  colorPalette: number[];             // Hex color codes for surface voxel distribution
  coreColor: number;                  // Hex color for inner / non-surface voxels
  surfacePattern:                     // Algorithmic pattern generator preset
    'bands' | 'continents' | 'craters' | 'lava' | 'ice' | 'gas_rings' | 'sun';
  hasRings?: boolean;                 // Whether planet renders planar voxel rings
  ringInnerRadius?: number;           // Ring inner boundary in world units
  ringOuterRadius?: number;           // Ring outer boundary in world units
  ringColor?: number;                 // Ring particle primary color

  // Hierarchy & status
  parentBodyId?: string;              // For moons: host planet ID (e.g. 'earth' for 'moon')
  isDestroyed: boolean;               // True if shattered by collision or manual detonation
  voxelResolution: number;            // Number of voxels along radius R_vox
  voxelSize: number;                  // World size of a single unit voxel cube
  orbitColor: number;                 // Hex color for the trajectory prediction line
}
```

### 3.2 `VoxelParticle`
Represents an individual physical debris block spawned when a body collides or shatters.

```typescript
export interface VoxelParticle {
  position: THREE.Vector3;            // World space position
  velocity: THREE.Vector3;            // Velocity including explosion dispersion & parent momentum
  color: THREE.Color;                 // Material color inherited from shattered body voxel
  size: number;                       // Edge dimension of the cube
  life: number;                       // Accumulated lifetime in seconds
  maxLife: number;                    // Total lifetime before decay (4 to 16 seconds)
  rotation: THREE.Euler;              // Current 3D orientation
  rotVelocity: THREE.Vector3;         // Tumbling angular velocity [ωx, ωy, ωz]
}
```

### 3.3 `OrbitPrediction`
Output of the trajectory predictor passed to the line renderer.

```typescript
export interface OrbitPrediction {
  bodyId: string;                     // Associated body identifier
  points: THREE.Vector3[];            // Array of 129 world-space trajectory vertices
  isEscaping: boolean;                // True if orbit is unbound / hyperbolic (e >= 1.0)
  collidingWith?: string;             // Optional target ID if collision is imminent
}
```

### 3.4 `CollisionEvent`
Emitted by `CollisionEngine` when two bounding spheres overlap with negative relative velocity.

```typescript
export interface CollisionEvent {
  bodyA: CelestialBody;
  bodyB: CelestialBody;
  impactPoint: THREE.Vector3;         // World position of contact surface
  relativeVelocity: number;           // Magnitude of approach velocity along collision normal
  impactEnergy: number;               // Kinetic energy: 0.5 * (m1 * m2 / (m1 + m2)) * v_rel^2
}
```

---

## 4. Physics Engine Specifications (`src/physics/`)

### 4.1 Constants & Baseline Units
- **Gravitational Constant**: $G = 100$
- **Softening Parameter**: $\epsilon = 0.5$ (prevents $1/r^2$ singularity on point contact while introducing $< 0.4\%$ error at lunar distances)
- **Restitution Coefficient**: $e_{col} = 0.2$ (inelastic collision behavior)
- **Time Stepping & Dynamic Sub-Stepping**: Sub-stepped multi-pass integration with dynamic scaling:
  $$\text{steps} = \max\big(10, \lceil 10 \cdot \text{timeScale} \rceil\big)$$
  This guarantees that at accelerated speeds (e.g. $5\times$), the numerical sub-step duration remains strictly bounded ($\Delta t_{sub} \le 0.0017$ s), preventing numerical orbital decay or spurious perturbations.

### 4.2 Integration Scheme: Symplectic Velocity-Verlet (Leapfrog)
The physics engine employs a 2nd-order symplectic Velocity-Verlet integrator. Unlike standard Euler or Euler-Cromer, Velocity-Verlet preserves phase-space volume and the system Hamiltonian (total orbital energy), eliminating secular orbital drift over thousands of revolutions.

$$\mathbf{r}(t + \Delta t) = \mathbf{r}(t) + \mathbf{v}(t)\Delta t + \frac{1}{2}\mathbf{a}(t)\Delta t^2$$
$$\mathbf{a}(t + \Delta t) = \text{computeAccelerations}(\mathbf{r}(t + \Delta t))$$
$$\mathbf{v}(t + \Delta t) = \mathbf{v}(t) + \frac{1}{2}\big(\mathbf{a}(t) + \mathbf{a}(t + \Delta t)\big)\Delta t$$

### 4.3 Reference Frame & The Central Star
- **Heliocentric Invariance**: The Sun ($M = 20,000$) is anchored at $(0, 0, 0)$ with velocity $\mathbf{v} = \mathbf{0}$.
- This eliminates non-Newtonian frame oscillations, artificial orbital precession, and barycentric drift.

### 4.4 Hierarchical N-Body Lunar Gravitation
In a visually compressed solar system where distance-to-radius ratios are compressed from $100:1$ to $3:1$, solar tidal forces ($\propto M_{sun} r_{moon} / R_{planet}^3$) are magnified by over $10,000\times$. If left unadjusted, the Sun would strip moons from planets within half an orbit.

To resolve this, the engine uses **hierarchical gravitation**:
1. **Planets & Stars**: Interact with all other planets and stars via standard Newtonian pairwise forces:
   $$\mathbf{a}_{planet} = \sum_{j \neq planet} \frac{G M_j (\mathbf{r}_j - \mathbf{r}_{planet})}{\big(|\mathbf{r}_j - \mathbf{r}_{planet}|^2 + \epsilon^2\big)^{3/2}}$$
2. **Moons**: Orbit their host planet in an exact Keplerian two-body potential while inheriting the host planet's external acceleration towards the Sun:
   $$\mathbf{a}_{moon} = \mathbf{a}_{parent} + \frac{G M_{parent}(\mathbf{r}_{parent} - \mathbf{r}_{moon})}{\big(|\mathbf{r}_{parent} - \mathbf{r}_{moon}|^2 + \epsilon^2\big)^{3/2}}$$
3. **Relative Acceleration in Planet Frame**:
   $$\mathbf{a}_{rel} = \mathbf{a}_{moon} - \mathbf{a}_{parent} = \frac{G M_{parent}(\mathbf{r}_{parent} - \mathbf{r}_{moon})}{\big(r^2 + \epsilon^2\big)^{3/2}}$$
   This cancels tidal resonance collapse and allows moons to orbit in permanently stable, circular orbits with natural Keplerian periods.

### 4.5 Gladman (1993) Hill Stability for Multi-Moon Systems
For multi-satellite systems (e.g. Jupiter's Io, Europa, Ganymede, Callisto), satellite orbital separations satisfy the Gladman criterion:
$$\Delta = a_2 - a_1 > 2\sqrt{3} R_{H,mut}$$
where $R_{H,mut} = \left(\frac{m_1 + m_2}{3 M_{parent}}\right)^{1/3} \frac{a_1 + a_2}{2}$.

### 4.6 Mass-Radius Proportional Scaling Law
When a user modifies a body's mass via the UI slider, its physical and visual radius scales according to constant mean density:
$$R = R_0 \cdot \sqrt[3]{\frac{M}{M_0}}$$
The voxel size scales proportionally ($s_{vox} = R / R_{vox}$), and surrounding gravitational pull updates immediately.

### 4.7 Speed Customization & Circularization
- **Speed Multiplier**: Modifies the magnitude of the velocity vector relative to the primary attractor:
  $$\mathbf{v}_{new} = \mathbf{v}_{attractor} + s \cdot \hat{\mathbf{v}}_{rel}$$
- **Circularize Orbit**: Sets the relative velocity perpendicular to the radius vector with magnitude:
  $$v_c = \sqrt{\frac{G(M_{attractor} + m)}{r}}$$

---

## 5. Trajectory & Orbit Prediction Specifications (`src/physics/OrbitPredictor.ts`)

To avoid numerical step-size divergence and line fluttering, trajectory lines are generated **analytically** using osculating conic orbital elements.

### 5.1 Conic Orbital Element Derivation
Given relative position $\mathbf{r}$ and velocity $\mathbf{v}$ with $\mu = G(M_{attractor} + m)$:
1. **Specific Angular Momentum**: $\mathbf{h} = \mathbf{r} \times \mathbf{v}$, $h = |\mathbf{h}|$.
2. **Specific Energy**: $\mathcal{E} = \frac{v^2}{2} - \frac{\mu}{r}$.
3. **Eccentricity Vector**: $\mathbf{e} = \frac{\mathbf{v} \times \mathbf{h}}{\mu} - \frac{\mathbf{r}}{r}$, $e = |\mathbf{e}|$.
4. **Orbital Plane Basis Vectors**:
   - Periapsis unit vector: $\hat{\mathbf{P}} = \mathbf{e} / e$ (or $\mathbf{r}/r$ if $e < 10^{-5}$).
   - Orbit normal: $\hat{\mathbf{W}} = \mathbf{h} / h$.
   - Semi-minor unit vector: $\hat{\mathbf{Q}} = \hat{\mathbf{W}} \times \hat{\mathbf{P}}$.

### 5.2 Bound Elliptical Trajectories ($e < 1.0, \mathcal{E} < 0$)
- Semi-major axis: $a = -\frac{\mu}{2\mathcal{E}}$.
- Semi-minor axis: $b = a\sqrt{1 - e^2}$.
- Ellipse Center: $\mathbf{C} = \mathbf{r}_{attractor} - a\mathbf{e}$.
- 128 discrete points sampled uniformly in eccentric anomaly $\theta \in [0, 2\pi]$:
  $$\mathbf{p}(\theta) = \mathbf{C} + (a\cos\theta)\hat{\mathbf{P}} + (b\sin\theta)\hat{\mathbf{Q}}$$
- The first point ($\theta = 0$) and final point ($\theta = 2\pi$) coincide, creating a seamless closed loop.

### 5.3 Unbound Hyperbolic Trajectories ($e \ge 1.0, \mathcal{E} \ge 0$)
When speed is boosted beyond escape velocity ($v > \sqrt{2} v_c$):
- Semi-major axis: $a = \frac{\mu}{2\mathcal{E}}$.
- Asymptote true anomaly: $\theta_\infty = \arccos(-1/e)$.
- Trajectory points sampled over true anomaly $f \in [-\theta_{max}, +\theta_{max}]$ with $\theta_{max} = \min(0.9\theta_\infty, 2.5)$:
  $$r(f) = \frac{h^2 / \mu}{1 + e\cos f}$$
  $$\mathbf{p}(f) = \mathbf{r}_{attractor} + (r(f)\cos f)\hat{\mathbf{P}} + (r(f)\sin f)\hat{\mathbf{Q}}$$

### 5.4 Planetocentric Lunar Orbit Display
For moons, trajectory points are calculated in the parent planet's local frame and translated by $\mathbf{r}_{parent}$. In world space, the moon's orbit line moves smoothly alongside the planet without forming jagged cycloids.

---

## 6. Voxel Rendering Specifications (`src/renderer/`)

### 6.1 Spherical Voxelization
A body with radius $R$ and resolution $R_{vox}$ generates voxels at integer grid coordinates $(x, y, z)$ satisfying:
$$x^2 + y^2 + z^2 \le (R_{vox} + 0.4)^2$$
- Surface voxels satisfy: $x^2 + y^2 + z^2 > (R_{vox} - 1.0)^2$.
- Inner core voxels are retained to provide physical solid chunks during collision fragmentation.

### 6.2 Visual Styling & Illumination Architecture
- **Multi-Source Illumination**:
  - **Camera Headlight**: `THREE.DirectionalLight(0xffffff, 1.2)` attached to the camera pointing along the viewer's forward line of sight. Ensures whichever side of a body faces the observer is always brightly illuminated, preventing dark side blackouts.
  - **Full-Spectrum Ambient & Hemisphere Fill**: `THREE.AmbientLight(0xffffff, 0.75)` and `THREE.HemisphereLight(0xe8f0fe, 0x1e2438, 0.45)`. Preserves vibrant color saturation (reds, greens, blues, golds) across all voxel facets from all angles.
  - **Zero-Decay Sun Light**: `THREE.PointLight(0xfffaed, 2.8, 0, 0)` with distance=0 and decay=0. Delivers crisp directional solar contrast without artificial distance falloff across outer planets (Jupiter, Saturn, Uranus, Neptune).
- **Atmospheric Rim Halos**:
  - Planets and moons feature atmospheric auras (`THREE.SphereGeometry`, scale $1.18\times$ for planets, $1.28\times$ for moons) rendered with `THREE.BackSide`, `AdditiveBlending`, and `depthWrite: false`.
  - Halos glow with the body's spectral identity color, dramatically accentuating planetary silhouettes against deep space.
- **Cube Bevel Factor**: Unit cubes are sized to $0.94 \times 0.94 \times 0.94$ in local geometry, creating subtle visible grooves between voxels that evoke the Minecraft aesthetic.
- **Material**: `THREE.MeshStandardMaterial` with `flatShading: true`, roughness $0.70$, metalness $0.02$ for planets; `THREE.MeshBasicMaterial` with un-tone-mapped luminescent colors for the Sun.
- **Draw Call Efficiency**: Each body is rendered as a single `THREE.InstancedMesh`. Thousands of voxels are rendered with 0 CPU-per-voxel rendering overhead.
- **Planetary Voxel Rings**: Rings (Saturn, Uranus) are constructed from instanced planar voxels ($y = 0$, thickness scale $0.15$) with hash-filtered radial dust density and Cassini division gaps.

### 6.3 Collision Debris System
- Maximum particle pool: $2,500$ debris voxels.
- When two bodies collide:
  - Relative velocity along collision normal $v_n = (\mathbf{v}_2 - \mathbf{v}_1) \cdot \hat{\mathbf{n}}$.
  - If $v_n > 15$ or mass ratio $> 8:1$: the smaller body is destroyed, spawning up to 150 physical voxel particles.
  - Debris voxels inherit parent velocity plus radial explosion impulse: $\mathbf{v}_{debris} = \mathbf{v}_{body} + v_{burst} \hat{\mathbf{d}}_{blast}$.
  - Debris voxels experience gravitational attraction towards the Sun and major planets, disintegrating upon falling into the Sun.

---

## 7. User Interface & Controls (`src/ui/`)

### 7.1 Input Handling & Gestures
The camera and raycasting controllers provide full parity across mouse and touch inputs:

| Action | Desktop (Mouse) | Mobile / Tablet (Touchscreen) |
| :--- | :--- | :--- |
| **Orbit Camera** | Left-click + drag | 1-finger drag |
| **Pan Camera** | Right-click + drag | 2-finger drag |
| **Zoom Camera** | Mouse wheel scroll | 2-finger pinch |
| **Select Body** | Left-click (distance $< 8$px, time $< 350$ms) | Quick tap (distance $< 8$px, time $< 350$ms) |
| **Proximity Tap** | Raycaster hits mesh or center $< \max(10, 2.2 R)$ | Proximity fallback allows easy selection of tiny moons |

### 7.2 Inspector Panel (Pixelated Telemetry Design)
- **Zero-Emoji Pixel Aesthetics**: All UI components use custom 16x16 pixel-grid SVGs and authentic voxel badge iconography ([`src/ui/PixelIcons.ts`](file:///Users/mmaelzer/code/stars/src/ui/PixelIcons.ts)) without generic emojis.
- **Header Badge**: Displays real-time pixelated mini-voxel orb matching the selected body's surface palette.
- **Precision Sliders**:
  - Downsized from bulky 28px square blocks to sleek 14px × 16px precision instrument fader knobs on a 6px track.
  - Features cyan neon center indicator and tactile hover/active states.
  - **Mass Slider**: Range $0.05\times$ to $10.0\times$ base mass. Updates physics mass and scales voxel mesh radius immediately.
  - **Orbital Speed Slider**: Range $0.0\times$ to $3.0\times$. Dynamically scales velocity magnitude; trajectory line warps in real time.
- **Self-Explanatory Two-Tier Action Buttons**:
  - `CIRCULARIZE` / *“Make orbit round”*: Instantly calculates and applies ideal circular Keplerian velocity $v = \sqrt{G M / r}$.
  - `REVERSE` / *“Orbit opposite way”*: Inverts the velocity vector $180^\circ$ into a retrograde orbit.
  - `TRACK CAM` / *“Follow with camera”*: Locks camera line-of-sight and tracking distance to follow the body continuously through space.
  - `DETONATE` / *“Blow up into voxels”*: Manually shatters the body into physical voxel debris with red danger styling.
  - Each button includes hover `title` tooltips for immediate contextual guidance.

### 7.3 Top HUD & Scale Toggle
- **Scale Mode Toggle**:
  - `SCALE: STYLIZED` $\leftrightarrow$ `SCALE: TRUE 1:1`
  - Smoothly interpolates planetary distances ($1\text{ AU} = 2,000$ u) and physical radii ($R_E = 0.085$ u, $R_{Sun} = 9.30$ u) over a $1.2$s cubic-eased transition while preserving circular orbital velocities.
- **Time Controls**: Pause/Play toggle (custom pixel play/pause icons) and discrete speed multipliers ($0.2\times$, $0.5\times$, $1\times$, $2\times$, $5\times$).
- **Orbits Toggle**: Shows or hides analytical trajectory lines.
- **Launch Mode**: Interactive rogue planet launcher with pixel rocket glyph; click/tap and drag in space to project a new voxel body into orbit.
- **Planet Carousel**: Touch-swipeable track of celestial bodies rendered with individual hand-crafted 16x16 pixel art badges.

---

## 8. Verification & Quality Gates

Every code modification must pass the following test suites and quality gates before deployment:

### 8.1 Automated Test Suites
1. **Physical Stability Suite** ([`src/physics/__tests__/solar_system.test.ts`](file:///Users/mmaelzer/code/stars/src/physics/__tests__/solar_system.test.ts)):
   - Simulates 2,000 frames at $1\times$ speed (over 20,000 sub-steps, equivalent to multiple planetary orbits).
   - Asserts **zero accidental collisions** in default state.
   - Asserts stability at $5\times$ speed over 1,800 frames ($150$ simulated seconds) with zero collisions between Uranus, Neptune, or any other celestial bodies.
   - Asserts all 8 planets remain within their orbital lanes ($\Delta r / r_0 < 12\%$).
   - Asserts all 7 moons remain bound within parent Hill spheres.
   - Asserts dynamic mass and speed modifications correctly alter geometry and eccentricity.
   - Asserts directed impacts trigger collision destruction.
   - Asserts dual-scale mode transitions smoothly between stylized and accurate AU dimensions without collisions.
2. **Universal Model Specification Conformance** ([`src/spec/__tests__/multi_model.spec.ts`](file:///Users/mmaelzer/code/stars/src/spec/__tests__/multi_model.spec.ts)):
   - Schema validation of all canonical bodies against `MODEL_SPEC`.
   - Symplectic energy conservation on standard test fixtures.
   - Conic resolution and hyperbolic transition checks.
   - Voxel generator bounds and color indexing safety.

### 8.2 Execution Commands
```bash
npm test         # Run all Vitest suites (must pass 19/19 tests)
npx tsc --noEmit # TypeScript static type verification (must report 0 errors)
npm run build    # Production Vite bundle build
npm run preview  # Launch local preview server on port 3000
```
