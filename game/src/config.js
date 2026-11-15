// Lumen Drift — every tuning number, colour and depth band in one place.
// The playfield is a fixed 1280x480 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 480 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const MOTH = {
  radius: 14,
  accel: 2600,
  maxSpeed: 430,
  drag: 2.4,
  dashSpeed: 980,
  dashTime: 0.18,
  dashCooldown: 1.6,
  invulnerable: 1.5,
};

export const LIVES = 3;

export const SPORE = {
  radius: 9,
  points: 10,
  interval: 0.85,
  intervalJitter: 0.5,
  drift: 26,
};

export const THORN = {
  radius: 16,
  interval: 1.8,
  intervalJitter: 0.6,
  drift: 34,
};

export const HEART = {
  radius: 12,
  interval: 26,
};

/** Combo: pickups inside this window raise the multiplier, up to COMBO.max. */
export const COMBO = { window: 2.5, max: 5 };

/** Depth: one band per 150 points; reaching band 10 (the Sunwell) wins the game. */
export const DEPTH = { perScore: 150, max: 10, winScore: 1350, seconds: 0 };

/** How many drifting things can exist at once; pools are allocated once, at boot. */
export const POOL_SIZE = 96;
export const PARTICLE_POOL = 256;

/** One palette per depth band, from dim violet dusk down to the golden Sunwell. */
export const BANDS = [
  { sky: '#14102a', glow: '#8f7bff', rock: '#241d45', spore: '#b7a6ff', accent: '#7dd7ff' },
  { sky: '#120f2e', glow: '#9a86ff', rock: '#221a4a', spore: '#c0afff', accent: '#7dd7ff' },
  { sky: '#100e33', glow: '#a58fff', rock: '#201650', spore: '#c9baff', accent: '#8fe3ff' },
  { sky: '#0f0e38', glow: '#b094ff', rock: '#1e1456', spore: '#d2c4ff', accent: '#9be8ff' },
  { sky: '#0e0d3d', glow: '#ba9cff', rock: '#1c125c', spore: '#dbcfff', accent: '#a5ecff' },
  { sky: '#0d0c42', glow: '#c4a5ff', rock: '#1a1062', spore: '#e3d9ff', accent: '#b0f0ff' },
  { sky: '#0d0b44', glow: '#cfaeff', rock: '#1b0f66', spore: '#ecbfff', accent: '#c0f2ff' },
  { sky: '#0e0a44', glow: '#dab8ff', rock: '#1d0e6a', spore: '#f2a9e8', accent: '#d2f6ff' },
  { sky: '#100940', glow: '#e6c2ff', rock: '#200e6e', spore: '#ffd28a', accent: '#ffe9a8' },
  { sky: '#171006', glow: '#ffd76a', rock: '#3a2a10', spore: '#ffe9a8', accent: '#fff3c4' },
];

export const PALETTE = {
  text: '#f2eefc',
  muted: '#a99fc9',
  panel: '#1c1740',
  heart: '#ff6b9d',
  thorn: '#c9d4ff',
  moth: '#ffe9a8',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-drift.best';
