// The screenshot scenes behind ?shot=start|play|combo|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (chase the nearest spore, swerve away from a thorn
// closing in), so the frame is what a short game really looks like and the
// same seed always gives the same frame. The combo scene flies well first,
// then gathers a burst of spores at once so the x5 multiplier shows; the end
// scene's pilot is careless, so it is caught out and the game-over screen shows.

import { STEP } from './config.js';
import { EVENT_OVER, KIND_BAT, KIND_SPORE, KIND_THORN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 22;
const COMBO_SECONDS = 22;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer toward the nearest spore, unless a thorn is close ahead — then swerve. */
function autopilot(state, careless) {
  const moth = state.moth;
  let spore = null;
  let sporeDistance = Infinity;
  let threat = null;
  let threatDistance = Infinity;
  for (const item of state.items) {
    if (!item.active) continue;
    const dx = item.x - moth.x;
    const dy = item.y - moth.y;
    const distance = Math.hypot(dx, dy);
    if (item.kind === KIND_SPORE && distance < sporeDistance) {
      spore = item;
      sporeDistance = distance;
    }
    if (item.kind === KIND_THORN && dx > -40 && dx < 280 && Math.abs(dy) < 120 && distance < threatDistance) {
      threat = item;
      threatDistance = distance;
    }
  }
  if (threat !== null && !careless) {
    const away = threat.y > moth.y ? -1 : 1;
    return { x: 0.35, y: away, dash: false };
  }
  if (spore === null) return { x: 0, y: 0, dash: false };
  const dx = spore.x - moth.x;
  const dy = spore.y - moth.y;
  const distance = Math.hypot(dx, dy) || 1;
  return { x: dx / distance, y: dy / distance, dash: distance > 320 && moth.dashCooldown <= 0 };
}

/** One autopilot step: convert the steering choice into a world step. */
function pilotStep(world, careless) {
  const steer = autopilot(world.state, careless);
  return world.step(STEP, { x: steer.x, y: steer.y }, steer.dash, false);
}

/**
 * Set `world` to the named scene (start, play, combo or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'combo' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const seconds = name === 'combo' ? COMBO_SECONDS : name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const careless = name === 'end';
  let events = 0;
  for (let index = 0; index < seconds / STEP; index += 1) {
    events = pilotStep(world, careless);
    if (events & EVENT_OVER) break;
    if (world.state.won) break;
  }
  if (name === 'combo') {
    // Gather a tight ring of spores around the moth so the x5 combo shows.
    const moth = world.state.moth;
    for (let index = 0; index < 7; index += 1) {
      const item = world.state.items.find((entry) => !entry.active);
      if (!item) break;
      const angle = (index / 7) * Math.PI * 2;
      item.active = true;
      item.kind = KIND_SPORE;
      item.radius = 9;
      item.x = moth.x + Math.cos(angle) * 15;
      item.y = moth.y + Math.sin(angle) * 15;
      item.speed = 0;
      item.phase = 0;
      item.bob = 0;
    }
    for (let index = 0; index < 12; index += 1) {
      world.step(STEP, { x: 0.2, y: 0 }, false, false);
    }
    // A Gloom Bat closing in, so the new hazard shows in the frame.
    const bat = world.state.items.find((entry) => !entry.active);
    if (bat) {
      bat.active = true;
      bat.kind = KIND_BAT;
      bat.radius = 15;
      bat.x = moth.x + 330;
      bat.y = moth.y - 84;
      bat.speed = 118;
      bat.phase = 0;
      bat.bob = 12;
    }
  }
  if (name === 'end' && !world.state.over) {
    // The careless pilot survived: drive thorns onto the moth until it ends.
    const moth = world.state.moth;
    for (let guard = 0; guard < 400 && !world.state.over; guard += 1) {
      const item = world.state.items.find((entry) => !entry.active);
      if (!item) break;
      item.active = true;
      item.kind = KIND_THORN;
      item.radius = 16;
      item.x = moth.x + 4;
      item.y = moth.y;
      item.speed = 0;
      item.phase = 0;
      item.bob = 0;
      world.state.moth.invulnerable = 0;
      world.step(STEP, { x: 0, y: 0 }, false, false);
    }
  }
  const over = world.state.over;
  const won = world.state.won;
  return {
    screen: over ? SCREEN_OVER : won ? SCREEN_WIN : SCREEN_PLAY,
    best: Math.max(world.state.score, 0),
  };
}
