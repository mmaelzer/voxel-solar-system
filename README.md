# 🪐 Voxel Solar System Simulator

An interactive, physically accurate 3D Earth solar system simulation built with **Three.js**, **TypeScript**, and **Vite**. Celestial bodies are rendered in an authentic spherical voxel-art aesthetic, powered by a 2nd-order **Symplectic Velocity-Verlet N-body gravitational integrator**, physical collision fragmentation, real-time Keplerian orbit prediction, and dual-scale astronomical rendering.

---

## ✨ Features

### 🌌 1. Spherical Voxel Aesthetic & Rendering Engine
- **Procedural Spherical Voxelization**: Planets, moons, and stars are voxelized into spherical shells and solid cores using `THREE.InstancedMesh` for maximum 60 FPS performance with zero draw-call overhead.
- **Micro-Groove Minecraft Styling**: Local voxel cube beveling ($0.94\times$) produces subtle grooves and authentic tactile ambient occlusion.
- **Planetary Rings & Atmospheric Halos**:
  - Planar voxel dust rings with Cassini divisions (Saturn, Uranus).
  - Atmospheric glowing rim halos (`THREE.BackSide` additive blending) enhancing planetary silhouettes against deep space.
- **Headlight & Multi-Source Illumination**: Camera-mounted directional headlight paired with full-spectrum ambient fill and zero-decay solar point lighting eliminates dark-side blackouts from any viewing angle.

### 🔭 2. Dual-Scale Simulation System
Seamlessly toggle between two distinct scaling models via the HUD:
- **Exaggerated (Playable)**: Visually balanced planetary sizes ($R_E = 4.8\text{ u}$, $1\text{ AU} = 135\text{ u}$) for easy simultaneous viewing and interaction.
- **Accurate (Astronomical 1:1)**: True astronomical proportions ($1\text{ AU} = 2,000\text{ u}$, $R_E = 0.085\text{ u}$, $R_{Sun} = 9.30\text{ u}$ — a $23,481:1$ ratio).
- **Logarithmic Depth Buffer**: Enabled in WebGLRenderer to eliminate z-fighting across $2,000,000\text{ u}$ cosmic depths.
- **Naked-Eye Stargazing Beacons**: Fixed-pixel point beacons (`sizeAttenuation: false`) ensure distant planets remain visible as twinkling stars across the cosmic void.
- **Smooth 1.2s Transition**: Dynamically adjusts positions and circular velocities at every frame with zero numerical disruption.

### 📐 3. Symplectic N-Body Newtonian Gravitation
- **Velocity-Verlet Integration**: Preserves phase-space volume and Hamiltonian orbital energy over thousands of planetary revolutions.
- **Dynamic Sub-Stepping**: Automatically scales integration passes with simulation speed ($\text{steps} = \max(10, \lceil 10 \cdot \text{timeScale} \rceil)$), guaranteeing stability up to $5\times$ speed.
- **Hierarchical Lunar Gravitation**: Moons orbit their host planet in an exact Keplerian two-body potential while inheriting parent acceleration towards the Sun, eliminating artificial tidal disruption.

### 💥 4. Physical Collision Engine & Debris Shatter
- Inelastic collision mechanics with momentum conservation.
- When impact energy exceeds structural thresholds, the smaller body detonates into up to 150 individual physical voxel debris chunks that disperse and orbit under gravitational pull.

### 🛰️ 5. Analytical Osculating Orbit Lines
- Trajectory lines are derived analytically via osculating conic orbital elements ($\mathbf{h} = \mathbf{r} \times \mathbf{v}$, $\mathbf{e}$, $\mathcal{E}$):
  - **Bound Ellipses** ($e < 1.0$): 128-point seamless closed loops.
  - **Unbound Hyperbolas** ($e \ge 1.0$): Asymptotic escape trajectories.
- Eliminates numerical step-size line fluttering or line flickering.

### 🚀 6. Orbital Launch Deck (Hypothetical Asteroid Foundry)
Configure and deploy custom voxel asteroids with precision fader sliders:
- **Size Slider**: Precision adjustment from $1.0\text{ u}$ to $12.0\text{ u}$.
- **Density Slider**: Physical density from $0.5$ to $50.0\text{ g/cm}^3$ with real-time computed mass ($M = V \cdot \rho$).
- **10 Solid Materials (Realistic & Hypothetical)**:
  1. **Uranium-238 (Pitchblende)**: Density $19.1\text{ g/cm}^3$. Luminescent radioactive neon-green voxels with lead matrix.
  2. **Plutonium-239**: Density $19.8\text{ g/cm}^3$. Transuranic actinide with ionizing violet/magenta aura.
  3. **M-Type Nickel-Iron**: Density $7.8\text{ g/cm}^3$. Protoplanetary core fragment with specular chrome-metallic finish.
  4. **C-Type Carbonaceous Chondrite**: Density $2.2\text{ g/cm}^3$. Primordial volatile-rich asteroid rock; pitch-black albedo.
  5. **S-Type Stony Silicate**: Density $3.4\text{ g/cm}^3$. Olivine and basaltic mantle rock.
  6. **Aurum-79 Solid Gold**: Density $19.3\text{ g/cm}^3$. Hypothetical 24k gold monolithic solid.
  7. **Pure Platinum (Pt-78)**: Density $21.5\text{ g/cm}^3$. High-density noble metal solid with mirror-bright finish.
  8. **Crystalline Diamond**: Density $3.5\text{ g/cm}^3$. Polyhedral compressed carbon crystal with refractive facets.
  9. **Degenerate Neutronium**: Density $50.0\text{ g/cm}^3$. Micro-fragment of collapsed stellar remnant with immense gravitational field.
  10. **Antimatter / Plasma Crystal**: Density $12.0\text{ g/cm}^3$. Blazing high-energy crystal with catastrophic impact impulse.
- **Two Deployment Modes**:
  - **Deploy to Belt Orbit**: Directly injects the asteroid into a stable Keplerian orbit in the Main Asteroid Belt ($r \approx 230\text{ u}$).
  - **Arm & Aim (Fling)**: Drag across 3D space to launch with directional velocity.

### 🎛️ 7. Pixel-Art HUD & Telemetry Inspector
- **Zero Emojis**: All iconography uses custom 16x16 pixel-grid SVGs and authentic mini-voxel badges matching the retro-voxel theme.
- **Inspector Panel**:
  - Real-time mass slider ($0.05\times$ to $10.0\times$ base mass) with automatic proportional radius scaling ($R \propto \sqrt[3]{M}$).
  - Real-time speed slider ($0.0\times$ to $3.0\times$ circular speed).
  - **CIRCULARIZE** (*“Make orbit round”*): Resets velocity vector to exact circular speed $v = \sqrt{G(M+m)/r}$ while preserving orbital inclination and prograde/retrograde travel direction.
  - **REVERSE** (*“Orbit opposite way”*): Inverts the relative velocity vector around the dominant attractor (preserving moon orbits).
  - **TRACK CAM** (*“Follow with camera”*): Locks line-of-sight camera tracking.
  - **DETONATE** (*“Blow up into voxels”*): Triggers immediate fragmentation into physical debris.

---

## 🕹️ Controls

| Action | Desktop (Mouse) | Mobile / Tablet (Touchscreen) |
| :--- | :--- | :--- |
| **Orbit Camera** | Left-click + drag | 1-finger drag |
| **Pan Camera** | Right-click + drag | 2-finger drag |
| **Zoom Camera** | Mouse wheel scroll | 2-finger pinch |
| **Select Body** | Left-click on mesh or proximity | Tap on mesh or proximity |
| **Fling Asteroid** | Click and drag in space (in Fling mode) | Touch and drag in space (in Fling mode) |

---

## 🛠️ Tech Stack

- **Graphics**: [Three.js](https://threejs.org/) (WebGL with `logarithmicDepthBuffer`)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (21 unit and physics conformance tests)
- **Typography**: Press Start 2P & Inter

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### Installation
```bash
git clone https://github.com/mmaelzer/voxel-solar-system.git
cd voxel-solar-system
npm install
```

### Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Run Automated Tests
```bash
npm test
```
Executes 21 physics stability, orbital geometry, mass scaling, and multi-model specification conformance tests.

### Build for Production
```bash
npm run build
npm run preview
```

---

## 📄 License
MIT License.
