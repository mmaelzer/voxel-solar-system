/**
 * Pixel-art vector icons and planet badges.
 * Hand-crafted 16x16 pixel grid SVGs to replace generic Unicode emojis with an authentic voxel/retro aesthetic.
 */

function svg(paths: string, size = 16, viewBox = '0 0 16 16'): string {
  return `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="pixel-icon" shape-rendering="crispEdges">${paths}</svg>`;
}

export const PixelIcons = {
  sun: svg(`
    <rect x="6" y="2" width="4" height="2" fill="#f59e0b"/>
    <rect x="6" y="12" width="4" height="2" fill="#f59e0b"/>
    <rect x="2" y="6" width="2" height="4" fill="#f59e0b"/>
    <rect x="12" y="6" width="2" height="4" fill="#f59e0b"/>
    <rect x="3" y="3" width="2" height="2" fill="#fbbf24"/>
    <rect x="11" y="3" width="2" height="2" fill="#fbbf24"/>
    <rect x="3" y="11" width="2" height="2" fill="#fbbf24"/>
    <rect x="11" y="11" width="2" height="2" fill="#fbbf24"/>
    <rect x="5" y="5" width="6" height="6" fill="#fef08a"/>
    <rect x="6" y="6" width="4" height="4" fill="#ffffff"/>
  `),

  play: svg(`
    <rect x="4" y="3" width="2" height="10" fill="#38bdf8"/>
    <rect x="6" y="4" width="2" height="8" fill="#38bdf8"/>
    <rect x="8" y="5" width="2" height="6" fill="#38bdf8"/>
    <rect x="10" y="6" width="2" height="4" fill="#38bdf8"/>
    <rect x="12" y="7" width="2" height="2" fill="#38bdf8"/>
  `),

  pause: svg(`
    <rect x="4" y="3" width="3" height="10" fill="#38bdf8"/>
    <rect x="9" y="3" width="3" height="10" fill="#38bdf8"/>
  `),

  orbits: svg(`
    <rect x="4" y="2" width="8" height="2" fill="#38bdf8"/>
    <rect x="4" y="12" width="8" height="2" fill="#38bdf8"/>
    <rect x="2" y="4" width="2" height="8" fill="#38bdf8"/>
    <rect x="12" y="4" width="2" height="8" fill="#38bdf8"/>
    <rect x="7" y="7" width="2" height="2" fill="#f59e0b"/>
  `),

  scale: svg(`
    <rect x="2" y="4" width="12" height="2" fill="#38bdf8"/>
    <rect x="2" y="6" width="2" height="4" fill="#38bdf8"/>
    <rect x="6" y="6" width="1" height="2" fill="#94a3b8"/>
    <rect x="9" y="6" width="1" height="2" fill="#94a3b8"/>
    <rect x="12" y="6" width="2" height="4" fill="#38bdf8"/>
    <rect x="4" y="11" width="8" height="2" fill="#f59e0b"/>
  `),

  fling: svg(`
    <rect x="8" y="2" width="2" height="2" fill="#38bdf8"/>
    <rect x="7" y="4" width="4" height="2" fill="#38bdf8"/>
    <rect x="6" y="6" width="6" height="4" fill="#38bdf8"/>
    <rect x="4" y="9" width="2" height="3" fill="#ef4444"/>
    <rect x="10" y="9" width="2" height="3" fill="#ef4444"/>
    <rect x="7" y="10" width="2" height="4" fill="#f59e0b"/>
  `),

  reset: svg(`
    <rect x="4" y="2" width="6" height="2" fill="#94a3b8"/>
    <rect x="2" y="4" width="2" height="6" fill="#94a3b8"/>
    <rect x="4" y="12" width="8" height="2" fill="#94a3b8"/>
    <rect x="12" y="6" width="2" height="6" fill="#94a3b8"/>
    <rect x="10" y="4" width="2" height="2" fill="#94a3b8"/>
    <rect x="1" y="2" width="4" height="2" fill="#38bdf8"/>
    <rect x="1" y="4" width="2" height="2" fill="#38bdf8"/>
  `),

  circularize: svg(`
    <rect x="5" y="2" width="6" height="2" fill="#22c55e"/>
    <rect x="5" y="12" width="6" height="2" fill="#22c55e"/>
    <rect x="2" y="5" width="2" height="6" fill="#22c55e"/>
    <rect x="12" y="5" width="2" height="6" fill="#22c55e"/>
    <rect x="3" y="3" width="2" height="2" fill="#22c55e"/>
    <rect x="11" y="3" width="2" height="2" fill="#22c55e"/>
    <rect x="3" y="11" width="2" height="2" fill="#22c55e"/>
    <rect x="11" y="11" width="2" height="2" fill="#22c55e"/>
  `),

  reverse: svg(`
    <rect x="3" y="4" width="8" height="2" fill="#38bdf8"/>
    <rect x="1" y="3" width="2" height="4" fill="#38bdf8"/>
    <rect x="5" y="10" width="8" height="2" fill="#f59e0b"/>
    <rect x="13" y="9" width="2" height="4" fill="#f59e0b"/>
  `),

  track: svg(`
    <rect x="2" y="2" width="4" height="2" fill="#38bdf8"/>
    <rect x="2" y="4" width="2" height="2" fill="#38bdf8"/>
    <rect x="10" y="2" width="4" height="2" fill="#38bdf8"/>
    <rect x="12" y="4" width="2" height="2" fill="#38bdf8"/>
    <rect x="2" y="12" width="4" height="2" fill="#38bdf8"/>
    <rect x="2" y="10" width="2" height="2" fill="#38bdf8"/>
    <rect x="10" y="12" width="4" height="2" fill="#38bdf8"/>
    <rect x="12" y="10" width="2" height="2" fill="#38bdf8"/>
    <rect x="7" y="7" width="2" height="2" fill="#ef4444"/>
  `),

  shatter: svg(`
    <rect x="3" y="3" width="3" height="3" fill="#ef4444"/>
    <rect x="10" y="2" width="3" height="3" fill="#f59e0b"/>
    <rect x="2" y="10" width="3" height="3" fill="#f59e0b"/>
    <rect x="11" y="11" width="3" height="3" fill="#ef4444"/>
    <rect x="7" y="7" width="2" height="2" fill="#ffffff"/>
  `),

  close: svg(`
    <rect x="3" y="3" width="2" height="2" fill="#94a3b8"/>
    <rect x="5" y="5" width="2" height="2" fill="#94a3b8"/>
    <rect x="7" y="7" width="2" height="2" fill="#94a3b8"/>
    <rect x="9" y="5" width="2" height="2" fill="#94a3b8"/>
    <rect x="11" y="3" width="2" height="2" fill="#94a3b8"/>
    <rect x="5" y="9" width="2" height="2" fill="#94a3b8"/>
    <rect x="3" y="11" width="2" height="2" fill="#94a3b8"/>
    <rect x="9" y="9" width="2" height="2" fill="#94a3b8"/>
    <rect x="11" y="11" width="2" height="2" fill="#94a3b8"/>
  `),

  shatteredBadge: svg(`
    <rect x="3" y="3" width="2" height="2" fill="#ef4444"/>
    <rect x="5" y="5" width="2" height="2" fill="#ef4444"/>
    <rect x="7" y="7" width="2" height="2" fill="#ef4444"/>
    <rect x="9" y="9" width="2" height="2" fill="#ef4444"/>
    <rect x="11" y="11" width="2" height="2" fill="#ef4444"/>
    <rect x="11" y="3" width="2" height="2" fill="#ef4444"/>
    <rect x="9" y="5" width="2" height="2" fill="#ef4444"/>
    <rect x="5" y="9" width="2" height="2" fill="#ef4444"/>
    <rect x="3" y="11" width="2" height="2" fill="#ef4444"/>
  `)
};

/**
 * Returns a custom 16x16 pixel art SVG badge for any planet, moon, or celestial body.
 */
export function getBodyPixelBadge(bodyId: string, isDestroyed = false): string {
  if (isDestroyed) {
    return PixelIcons.shatteredBadge;
  }

  switch (bodyId) {
    case 'sun':
      return svg(`
        <rect x="5" y="2" width="6" height="12" fill="#f59e0b"/>
        <rect x="2" y="5" width="12" height="6" fill="#f59e0b"/>
        <rect x="4" y="4" width="8" height="8" fill="#fbbf24"/>
        <rect x="6" y="6" width="4" height="4" fill="#ffffff"/>
      `);

    case 'mercury':
      return svg(`
        <rect x="4" y="4" width="8" height="8" fill="#78909c"/>
        <rect x="5" y="5" width="6" height="6" fill="#b0bec5"/>
        <rect x="6" y="7" width="2" height="2" fill="#455a64"/>
        <rect x="9" y="6" width="1" height="1" fill="#455a64"/>
      `);

    case 'venus':
      return svg(`
        <rect x="4" y="3" width="8" height="10" fill="#d4883b"/>
        <rect x="3" y="4" width="10" height="8" fill="#d4883b"/>
        <rect x="5" y="5" width="6" height="6" fill="#e5a65d"/>
        <rect x="6" y="6" width="4" height="2" fill="#f5cf89"/>
      `);

    case 'earth':
      return svg(`
        <!-- Deep ocean base -->
        <rect x="4" y="3" width="8" height="10" fill="#1f618d"/>
        <rect x="3" y="4" width="10" height="8" fill="#1f618d"/>
        <!-- North polar ice cap -->
        <rect x="6" y="3" width="4" height="2" fill="#f0f3f4"/>
        <!-- Continents green/brown -->
        <rect x="5" y="6" width="3" height="3" fill="#229954"/>
        <rect x="8" y="7" width="3" height="2" fill="#27ae60"/>
        <rect x="6" y="9" width="2" height="2" fill="#873600"/>
        <!-- South polar ice cap -->
        <rect x="6" y="12" width="4" height="1" fill="#f0f3f4"/>
      `);

    case 'moon':
      return svg(`
        <rect x="5" y="5" width="6" height="6" fill="#94a3b8"/>
        <rect x="6" y="4" width="4" height="8" fill="#94a3b8"/>
        <rect x="4" y="6" width="8" height="4" fill="#94a3b8"/>
        <rect x="6" y="6" width="2" height="2" fill="#cbd5e1"/>
        <rect x="8" y="8" width="1" height="1" fill="#64748b"/>
      `);

    case 'mars':
      return svg(`
        <rect x="4" y="4" width="8" height="8" fill="#b91c1c"/>
        <rect x="5" y="3" width="6" height="10" fill="#b91c1c"/>
        <rect x="3" y="5" width="10" height="6" fill="#b91c1c"/>
        <!-- Polar ice -->
        <rect x="7" y="3" width="2" height="1" fill="#fef2f2"/>
        <!-- Terrain basins -->
        <rect x="6" y="6" width="3" height="3" fill="#d97706"/>
        <rect x="5" y="8" width="2" height="2" fill="#991b1b"/>
      `);

    case 'phobos':
      return svg(`
        <rect x="6" y="6" width="4" height="4" fill="#78716c"/>
        <rect x="7" y="5" width="2" height="6" fill="#78716c"/>
        <rect x="7" y="7" width="1" height="1" fill="#a8a29e"/>
      `);

    case 'jupiter':
      return svg(`
        <!-- Outer sphere -->
        <rect x="3" y="3" width="10" height="10" fill="#b45309"/>
        <rect x="4" y="2" width="8" height="12" fill="#b45309"/>
        <rect x="2" y="4" width="12" height="8" fill="#b45309"/>
        <!-- Atmospheric storm belts -->
        <rect x="3" y="4" width="10" height="2" fill="#fde68a"/>
        <rect x="2" y="7" width="12" height="2" fill="#92400e"/>
        <rect x="3" y="10" width="10" height="2" fill="#d97706"/>
        <!-- Great Red Spot -->
        <rect x="8" y="8" width="3" height="2" fill="#b91c1c"/>
      `);

    case 'io':
      return svg(`
        <rect x="5" y="5" width="6" height="6" fill="#eab308"/>
        <rect x="6" y="4" width="4" height="8" fill="#eab308"/>
        <rect x="6" y="6" width="2" height="2" fill="#dc2626"/>
      `);

    case 'europa':
      return svg(`
        <rect x="5" y="5" width="6" height="6" fill="#bae6fd"/>
        <rect x="6" y="4" width="4" height="8" fill="#bae6fd"/>
        <rect x="7" y="6" width="1" height="4" fill="#b45309"/>
      `);

    case 'ganymede':
      return svg(`
        <rect x="5" y="5" width="6" height="6" fill="#64748b"/>
        <rect x="6" y="4" width="4" height="8" fill="#64748b"/>
        <rect x="6" y="6" width="3" height="2" fill="#94a3b8"/>
      `);

    case 'callisto':
      return svg(`
        <rect x="5" y="5" width="6" height="6" fill="#475569"/>
        <rect x="6" y="4" width="4" height="8" fill="#475569"/>
        <rect x="7" y="7" width="2" height="2" fill="#cbd5e1"/>
      `);

    case 'saturn':
      return svg(`
        <!-- Planet body -->
        <rect x="5" y="4" width="6" height="8" fill="#ca8a04"/>
        <rect x="4" y="5" width="8" height="6" fill="#ca8a04"/>
        <rect x="5" y="6" width="6" height="2" fill="#eab308"/>
        <!-- Planar rings -->
        <rect x="1" y="7" width="14" height="2" fill="#fef08a"/>
        <rect x="2" y="8" width="12" height="1" fill="#a16207"/>
      `);

    case 'titan':
      return svg(`
        <rect x="5" y="5" width="6" height="6" fill="#ea580c"/>
        <rect x="6" y="4" width="4" height="8" fill="#ea580c"/>
        <rect x="6" y="6" width="3" height="2" fill="#f97316"/>
      `);

    case 'uranus':
      return svg(`
        <rect x="4" y="4" width="8" height="8" fill="#38bdf8"/>
        <rect x="5" y="3" width="6" height="10" fill="#38bdf8"/>
        <rect x="3" y="5" width="10" height="6" fill="#38bdf8"/>
        <rect x="5" y="5" width="6" height="6" fill="#7dd3fc"/>
        <!-- Ring tilt line -->
        <rect x="7" y="2" width="2" height="12" fill="#e0f2fe" opacity="0.4"/>
      `);

    case 'neptune':
      return svg(`
        <rect x="4" y="4" width="8" height="8" fill="#2563eb"/>
        <rect x="5" y="3" width="6" height="10" fill="#2563eb"/>
        <rect x="3" y="5" width="10" height="6" fill="#2563eb"/>
        <rect x="5" y="6" width="5" height="4" fill="#3b82f6"/>
        <rect x="6" y="8" width="3" height="2" fill="#1d4ed8"/>
      `);

    default:
      // Custom / rogue bodies
      return svg(`
        <rect x="5" y="5" width="6" height="6" fill="#a855f7"/>
        <rect x="6" y="4" width="4" height="8" fill="#a855f7"/>
        <rect x="4" y="6" width="8" height="4" fill="#a855f7"/>
        <rect x="6" y="6" width="2" height="2" fill="#d8b4fe"/>
      `);
  }
}
