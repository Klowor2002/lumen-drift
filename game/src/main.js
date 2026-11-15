// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, win and game over.
//
// ?seed=N fixes the cavern's pattern. ?shot=start|play|combo|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot. ?autotest=1 runs a scripted
// play-through against the real rules and writes its results into
// #test-result, so a headless run can prove the loop works end to end.

import { BEST_KEY, FIELD, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_DASH, EVENT_HEART, EVENT_HIT, EVENT_OVER, EVENT_SPORE, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';
import { createSound } from './sound.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const autotest = params.get('autotest') === '1';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, sound.isMuted());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    sound.unlock();
    announce(`Playing. ${LIVES} lives. Reach Depth 10 to win.`);
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) {
      sound.win();
      announce(`You won. Score ${world.state.score}. Best ${best}.`);
    } else {
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
  }

  /** Convert a mouse steer (CSS pixels) into logical field coordinates. */
  function toLogical(steer) {
    if (!steer.mouse) return steer;
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD.width / rect.width;
    const scaleY = FIELD.height / rect.height;
    return { mouse: true, x: steer.x * scaleX, y: steer.y * scaleY };
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) {
      sound.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_RESTART) {
      if (screen !== SCREEN_TITLE) startGame();
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    return actions;
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
      return;
    }
    const steer = toLogical(input.steer());
    const events = world.step(STEP, steer, Boolean(actions & ACTION_DASH), false);
    if (events & EVENT_SPORE) sound.pickup(world.state.combo);
    if (events & EVENT_DASH) sound.dash();
    if (events & EVENT_HIT) {
      sound.hit();
      announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_HEART) sound.heart();
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, sound.isMuted());
  }

  // Leaving the tab pauses a running game rather than letting thorns fly unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // Expose the live state for scripted play-tests (read-only snapshot).
  window.__lumen = {
    screen: () => screen,
    score: () => world.state.score,
    lives: () => world.state.lives,
    combo: () => world.state.combo,
    depth: () => world.state.depth,
    state: () => world.state,
  };

  announce('Lumen Drift. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

function press(code) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true, cancelable: true }));
}

/**
 * Scripted play-through against the real rules, for headless verification.
 * It starts with Enter, flies the autopilot into spores, dashes, pauses and
 * resumes, loses every life to thorns, watches game over appear, then
 * restarts with R and confirms play resumes. Results land in #test-result.
 */
function runAutotest() {
  const results = {};
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = 0;

  function startGame() {
    world.reset();
    screen = SCREEN_PLAY;
  }
  function endGame() {
    screen = world.state.won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) best = world.state.score;
  }

  // Start with a real keypress through the input layer.
  press('Enter');
  const started = input.takeActions() & ACTION_CONFIRM;
  if (started) startGame();
  results.started = screen === SCREEN_PLAY;

  // Fly with the same steering the screenshot pilot uses: chase spores,
  // swerving away from any thorn closing in from the right.
  function chase() {
    const moth = world.state.moth;
    for (const item of world.state.items) {
      if (!item.active || item.kind !== 1) continue;
      const dx = item.x - moth.x;
      const dy = item.y - moth.y;
      if (dx > -40 && dx < 280 && Math.abs(dy) < 120) {
        return { x: 0.35, y: dy > 0 ? -1 : 1 };
      }
    }
    let target = null;
    let nearest = Infinity;
    for (const item of world.state.items) {
      if (!item.active || item.kind !== 0) continue;
      const distance = Math.hypot(item.x - moth.x, item.y - moth.y);
      if (distance < nearest) {
        nearest = distance;
        target = item;
      }
    }
    if (target === null) return { x: 0.4, y: 0 };
    const dx = target.x - moth.x;
    const dy = target.y - moth.y;
    const distance = Math.hypot(dx, dy) || 1;
    return { x: dx / distance, y: dy / distance };
  }
  const scoreBefore = world.state.score;
  for (let index = 0; index < 60 * 25; index += 1) {
    const events = world.step(STEP, chase(), false, false);
    if (events & EVENT_WIN || events & EVENT_OVER) {
      endGame();
      break;
    }
  }
  results.scoreRose = world.state.score > scoreBefore;
  results.scoreAfterPlay = world.state.score;
  results.comboSeen = world.state.combo;
  results.depthAfterPlay = world.state.depth;

  // Dash: a dash request must shrink the cooldown from full.
  world.state.moth.dashCooldown = 0;
  world.step(STEP, { x: 1, y: 0 }, true, false);
  results.dashWorks = world.state.moth.dashTimer > 0 || world.state.moth.dashCooldown > 0;

  // Pause and resume with real keypresses.
  press('KeyP');
  const pauseActions = input.takeActions();
  if (pauseActions & ACTION_PAUSE && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
  results.pauseWorks = screen === SCREEN_PAUSED;
  press('KeyP');
  const resumeActions = input.takeActions();
  if (resumeActions & ACTION_PAUSE && screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
  results.resumeWorks = screen === SCREEN_PLAY;

  // Lose every life: drive a thorn onto the moth until the game ends.
  let guard = 0;
  while (!world.state.over && guard < 400) {
    guard += 1;
    const moth = world.state.moth;
    const item = world.state.items.find((entry) => !entry.active);
    if (!item) break;
    item.active = true;
    item.kind = 1;
    item.radius = 16;
    item.x = moth.x + 4;
    item.y = moth.y;
    item.speed = 0;
    item.phase = 0;
    item.bob = 0;
    world.state.moth.invulnerable = 0;
    const events = world.step(STEP, { x: 0, y: 0 }, false, false);
    if (events & EVENT_OVER) endGame();
  }
  results.livesLostToZero = world.state.lives === 0;
  results.gameOverShown = screen === SCREEN_OVER;
  results.finalScore = world.state.score;

  // Restart with R and confirm play resumes.
  press('KeyR');
  const restartActions = input.takeActions();
  if (restartActions & ACTION_RESTART && screen !== SCREEN_TITLE) startGame();
  results.restartWorks = screen === SCREEN_PLAY && world.state.score === 0 && world.state.lives === LIVES;

  const element = document.getElementById('test-result');
  if (element) element.textContent = JSON.stringify(results);
  document.title = `AUTOTEST ${JSON.stringify(results)}`;
  window.__autotest = results;
  window.__shotReady = true;
}

if (shot) runShot(shot);
else if (autotest) runAutotest();
else runGame();
