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

/** Gloom Bats: a second hazard, from Depth 3 down — they drift left and home gently on the moth. */
export const BAT = {
  radius: 15,
  interval: 6.5,
  speed: 118,
  home: 0.55,
  firstDepth: 3,
};

/** Grazing a thorn-crystal without touching it pays a small near-miss bonus. */
export const GRAZE = { points: 5, reach: 26 };

/** Combo: pickups inside this window raise the multiplier, up to COMBO.max. */
export const COMBO = { window: 2.5, max: 5 };

/** Depth: one band per 150 points; reaching band 10 (the Sunwell) wins the game. */
export const DEPTH = { perScore: 150, max: 10, winScore: 1350, seconds: 0 };

/** How many drifting things can exist at once; pools are allocated once, at boot. */
export const POOL_SIZE = 96;
export const PARTICLE_POOL = 256;

/** One palette per depth band, from dim violet dusk down to the golden Sunwell. */
export const BANDS = [
  { sky: '#2a2154', glow: '#9a86ff', rock: '#453573', spore: '#c9baff', accent: '#8fe3ff' },
  { sky: '#271f58', glow: '#a58fff', rock: '#42307a', spore: '#d2c4ff', accent: '#8fe3ff' },
  { sky: '#241c62', glow: '#b094ff', rock: '#3e2a85', spore: '#dbcfff', accent: '#9be8ff' },
  { sky: '#33204f', glow: '#ffab6b', rock: '#57305c', spore: '#ffd2a1', accent: '#ffc98a' },
  { sky: '#1d2a5e', glow: '#7dd7ff', rock: '#2f3f85', spore: '#d9f6ff', accent: '#a5ecff' },
  { sky: '#14352c', glow: '#7fe0b0', rock: '#245c44', spore: '#baffd9', accent: '#baffd9' },
  { sky: '#182a5e', glow: '#8fb8ff', rock: '#2c4480', spore: '#cfe2ff', accent: '#c0f2ff' },
  { sky: '#232050', glow: '#cfd8ff', rock: '#3d3673', spore: '#eef2ff', accent: '#d2f6ff' },
  { sky: '#33230d', glow: '#ffcf5c', rock: '#5c4214', spore: '#ffe9a8', accent: '#ffe9a8' },
  { sky: '#3d2a08', glow: '#ffd76a', rock: '#6e4f16', spore: '#fff3c4', accent: '#fff3c4' },
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
