// The game's rules and state, with no drawing and no browser in it: the moth
// Luma, drifting light-spores, thorn-crystals, rare heart-spores, the combo,
// depth bands, particles and floating score popups. step() advances one fixed
// step and returns what happened as bit flags, so the caller can react (and
// play sounds) without the world knowing about screens or audio. Pools are
// allocated once, at boot; nothing here allocates in the hot loop.

import { BANDS, COMBO, DEPTH, FIELD, HEART, LIVES, MOTH, PARTICLE_POOL, POOL_SIZE, SPORE, THORN } from './config.js';
import { range } from './random.js';

export const KIND_SPORE = 0;
export const KIND_THORN = 1;
export const KIND_HEART = 2;

export const EVENT_SPORE = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_DASH = 16;
export const EVENT_HEART = 32;

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createWorld(random) {
  const moth = {
    x: FIELD.width * 0.3,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    angle: 0,
    dashTimer: 0,
    dashCooldown: 0,
    invulnerable: 0,
    flutter: 0,
    trail: [],
  };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_SPORE, x: 0, y: 0, radius: 0, speed: 0, phase: 0, bob: 0 });
  }
  const particles = [];
  for (let index = 0; index < PARTICLE_POOL; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff' });
  }
  const popups = [];
  const state = {
    moth,
    items,
    particles,
    popups,
    score: 0,
    combo: 0,
    comboTimer: 0,
    lives: LIVES,
    depth: 1,
    elapsed: 0,
    scroll: 90,
    shake: 0,
    won: false,
    over: false,
    sporeTimer: 0.6,
    thornTimer: 1.2,
    heartTimer: HEART.interval,
    band: BANDS[0],
  };

  function reset() {
    moth.x = FIELD.width * 0.3;
    moth.y = FIELD.height / 2;
    moth.vx = 0;
    moth.vy = 0;
    moth.angle = 0;
    moth.dashTimer = 0;
    moth.dashCooldown = 0;
    moth.invulnerable = 0;
    moth.flutter = 0;
    moth.trail.length = 0;
    for (const item of items) item.active = false;
    for (const particle of particles) particle.active = false;
    popups.length = 0;
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.lives = LIVES;
    state.depth = 1;
    state.elapsed = 0;
    state.scroll = 90;
    state.shake = 0;
    state.won = false;
    state.over = false;
    state.sporeTimer = 0.6;
    state.thornTimer = 1.2;
    state.heartTimer = HEART.interval;
    state.band = BANDS[0];
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) {
      if (!items[index].active) return items[index];
    }
    return null;
  }

  function freeParticle() {
    for (let index = 0; index < particles.length; index += 1) {
      if (!particles[index].active) return particles[index];
    }
    return particles[0];
  }

  function burst(x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const particle = freeParticle();
      const angle = random() * Math.PI * 2;
      const velocity = speed * (0.4 + random() * 0.8);
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity;
      particle.maxLife = 0.4 + random() * 0.5;
      particle.life = particle.maxLife;
      particle.size = 1.5 + random() * 2.5;
      particle.color = color;
    }
  }

  function popup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
    if (popups.length > 24) popups.shift();
  }

  function depthFor(score) {
    return Math.min(DEPTH.max, 1 + Math.floor(score / DEPTH.perScore));
  }

  function spawnSpore() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_SPORE;
    item.radius = SPORE.radius;
    item.x = FIELD.width + item.radius + random() * 80;
    item.y = 50 + random() * (FIELD.height - 100);
    item.speed = state.scroll * (0.9 + random() * 0.3);
    item.phase = random() * Math.PI * 2;
    item.bob = 14 + random() * 22;
  }

  function spawnThorn() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_THORN;
    item.radius = THORN.radius * (0.8 + random() * 0.5);
    item.x = FIELD.width + item.radius + random() * 60;
    item.y = 46 + random() * (FIELD.height - 92);
    item.speed = state.scroll * (0.95 + random() * 0.25);
    item.phase = random() * Math.PI * 2;
    item.bob = 10 + random() * 30;
  }

  function spawnHeart() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_HEART;
    item.radius = HEART.radius;
    item.x = FIELD.width + item.radius + 40;
    item.y = 60 + random() * (FIELD.height - 120);
    item.speed = state.scroll * 0.9;
    item.phase = random() * Math.PI * 2;
    item.bob = 18;
  }

  /**
   * One fixed step. `steer` is {x, y} in [-1, 1] (or a mouse target when
   * steer.mouse is set, in screen pixels the caller already scaled). With
   * `harmless` set (the title screen's backdrop) things drift but nothing
   * touches the moth and nothing scores.
   */
  function step(dt, steer, dashRequested, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.depth = depthFor(state.score);
    state.band = BANDS[state.depth - 1];
    state.scroll = 90 + state.depth * 22;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);

    // Steering: gentle inertia, a dash burst, and a soft wall bounce.
    let ax = steer.x;
    let ay = steer.y;
    if (steer.mouse) {
      // steer.x / steer.y arrive already in logical field coordinates.
      const dx = steer.x - moth.x;
      const dy = steer.y - moth.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        ax = dx / dist;
        ay = dy / dist;
      } else {
        ax = 0;
        ay = 0;
      }
    }
    const magnitude = Math.hypot(ax, ay);
    if (magnitude > 1) {
      ax /= magnitude;
      ay /= magnitude;
    }
    if (moth.dashTimer > 0) {
      moth.dashTimer -= dt;
    } else if (dashRequested && moth.dashCooldown <= 0 && magnitude > 0) {
      moth.dashTimer = MOTH.dashTime;
      moth.dashCooldown = MOTH.dashCooldown;
      moth.vx = ax * MOTH.dashSpeed;
      moth.vy = ay * MOTH.dashSpeed;
      events |= EVENT_DASH;
      burst(moth.x, moth.y, '#ffe9a8', 10, 160);
    }
    if (moth.dashCooldown > 0) moth.dashCooldown -= dt;
    if (moth.dashTimer <= 0) {
      moth.vx += ax * MOTH.accel * dt;
      moth.vy += ay * MOTH.accel * dt;
      const drag = Math.max(0, 1 - MOTH.drag * dt);
      moth.vx *= drag;
      moth.vy *= drag;
      const speed = Math.hypot(moth.vx, moth.vy);
      if (speed > MOTH.maxSpeed) {
        moth.vx = (moth.vx / speed) * MOTH.maxSpeed;
        moth.vy = (moth.vy / speed) * MOTH.maxSpeed;
      }
    }
    moth.x += moth.vx * dt;
    moth.y += moth.vy * dt;
    if (moth.x < MOTH.radius) {
      moth.x = MOTH.radius;
      moth.vx = Math.abs(moth.vx) * 0.4;
    }
    if (moth.x > FIELD.width - MOTH.radius) {
      moth.x = FIELD.width - MOTH.radius;
      moth.vx = -Math.abs(moth.vx) * 0.4;
    }
    if (moth.y < MOTH.radius + 34) {
      moth.y = MOTH.radius + 34;
      moth.vy = Math.abs(moth.vy) * 0.4;
    }
    if (moth.y > FIELD.height - MOTH.radius) {
      moth.y = FIELD.height - MOTH.radius;
      moth.vy = -Math.abs(moth.vy) * 0.4;
    }
    moth.angle = Math.atan2(moth.vy, moth.vx);
    moth.flutter += dt * (10 + Math.hypot(moth.vx, moth.vy) / 40);
    if (moth.invulnerable > 0) moth.invulnerable = Math.max(0, moth.invulnerable - dt);
    moth.trail.unshift({ x: moth.x, y: moth.y, life: 0.35 });
    if (moth.trail.length > 14) moth.trail.pop();
    for (const point of moth.trail) point.life -= dt;

    // Spawning grows denser and faster with depth.
    state.sporeTimer -= dt;
    if (state.sporeTimer <= 0) {
      spawnSpore();
      state.sporeTimer = Math.max(0.34, SPORE.interval * (1 - (state.depth - 1) * 0.07)) + random() * SPORE.intervalJitter;
    }
    state.thornTimer -= dt;
    if (state.thornTimer <= 0) {
      spawnThorn();
      if (state.depth >= 5 && random() < 0.35) spawnThorn();
      state.thornTimer = Math.max(0.7, THORN.interval * (1 - (state.depth - 1) * 0.06)) + random() * THORN.intervalJitter;
    }
    state.heartTimer -= dt;
    if (state.heartTimer <= 0) {
      if (state.lives < LIVES) spawnHeart();
      state.heartTimer = HEART.interval;
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.x -= item.speed * dt;
      item.y += Math.sin(state.elapsed * 1.6 + item.phase) * item.bob * dt;
      if (item.x < -item.radius - 20) {
        item.active = false;
        continue;
      }
      if (harmless) continue;
      const hit = distance(item.x, item.y, moth.x, moth.y);
      if (item.kind === KIND_SPORE) {
        if (hit < item.radius + MOTH.radius) {
          item.active = false;
          state.combo = Math.min(COMBO.max, state.combo + 1);
          state.comboTimer = COMBO.window;
          const gained = SPORE.points * state.combo;
          state.score += gained;
          popup(item.x, item.y, `+${gained}`, state.band.spore);
          burst(item.x, item.y, state.band.spore, 8, 120);
          events |= EVENT_SPORE;
          if (depthFor(state.score) >= DEPTH.max && !state.won) {
            state.won = true;
            events |= EVENT_WIN;
          }
        }
      } else if (item.kind === KIND_HEART) {
        if (hit < item.radius + MOTH.radius) {
          item.active = false;
          state.lives = Math.min(LIVES, state.lives + 1);
          popup(item.x, item.y, '+1 LIFE', '#ff6b9d');
          burst(item.x, item.y, '#ff6b9d', 12, 140);
          events |= EVENT_HEART;
        }
      } else if (moth.invulnerable === 0 && hit < item.radius + MOTH.radius * 0.8) {
        item.active = false;
        state.lives -= 1;
        state.combo = 0;
        state.comboTimer = 0;
        moth.invulnerable = MOTH.invulnerable;
        state.shake = 1;
        burst(moth.x, moth.y, '#ff5a6e', 16, 220);
        events |= EVENT_HIT;
        if (state.lives <= 0) {
          state.over = true;
          events |= EVENT_OVER;
          break;
        }
      }
    }

    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
    for (let index = popups.length - 1; index >= 0; index -= 1) {
      const popupItem = popups[index];
      popupItem.life -= dt;
      popupItem.y -= 34 * dt;
      if (popupItem.life <= 0) popups.splice(index, 1);
    }
    return events;
  }

  reset();
  return { state, reset, step, burst, popup };
}
