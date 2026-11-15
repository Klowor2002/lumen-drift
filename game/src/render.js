// The renderer: every pixel of Lumen Drift is drawn procedurally on one
// canvas — glowing spores, jagged thorn-crystals, parallax rock, the moth
// with its fluttering wings, the HUD and the title / pause / win / game-over
// screens. The playfield is a fixed 1280x480 logical area scaled to fit the
// window, so the same frame paints at any window size.

import { BANDS, DEPTH, FIELD, FONT, LIVES, MOTH, PALETTE } from './config.js';
import { KIND_HEART, KIND_SPORE, KIND_THORN } from './world.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_WIN = 3;
export const SCREEN_OVER = 4;

const DEPTH_NAMES = [
  'Dusk Hollow',
  'Glimmer Grotto',
  'Whisper Walls',
  'Ember Veins',
  'Crystal Choir',
  'Mosslight Deep',
  'Echoing Dark',
  'Starfall Shaft',
  'Golden Throat',
  'The Sunwell',
];

function ridgeY(layer, x, elapsed, scroll) {
  const offset = elapsed * scroll * (0.25 + layer * 0.2);
  const wave = Math.sin((x + offset) * 0.006 + layer * 2.1) * 26
    + Math.sin((x + offset) * 0.013 + layer * 4.7) * 12
    + Math.sin((x + offset) * 0.031 + layer) * 5;
  return wave;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || FIELD.width;
    const height = canvas.clientHeight || FIELD.height;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
  }

  function transform() {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const offsetX = (canvas.width - FIELD.width * scale) / 2;
    const offsetY = (canvas.height - FIELD.height * scale) / 2;
    context.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    return { scale, offsetX, offsetY };
  }

  function drawBackdrop(state) {
    const band = state.band;
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, band.sky);
    gradient.addColorStop(1, '#05030f');
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Far glow: the moth's light and the depth's own hue.
    const glow = context.createRadialGradient(state.moth.x, state.moth.y, 10, state.moth.x, state.moth.y, 320);
    glow.addColorStop(0, band.glow + '2e');
    glow.addColorStop(1, band.glow + '00');
    context.fillStyle = glow;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawRocks(state) {
    for (let layer = 0; layer < 3; layer += 1) {
      const band = state.band;
      const top = 8 + layer * 6;
      context.beginPath();
      context.moveTo(0, FIELD.height);
      for (let x = 0; x <= FIELD.width; x += 16) {
        context.lineTo(x, FIELD.height - top - 26 - layer * 14 + ridgeY(layer, x, state.elapsed, state.scroll) * (0.5 + layer * 0.3));
      }
      context.lineTo(FIELD.width, FIELD.height);
      context.closePath();
      context.fillStyle = layer === 2 ? band.rock : band.rock + (layer === 0 ? '55' : '88');
      context.fill();
      // Stalactites hanging from the ceiling.
      context.beginPath();
      for (let x = 0; x <= FIELD.width; x += 16) {
        const y = 10 + layer * 4 + ridgeY(layer + 3, x, state.elapsed, state.scroll) * 0.4;
        if (x === 0) context.moveTo(x, 0);
        context.lineTo(x, y);
      }
      context.lineTo(FIELD.width, 0);
      context.lineTo(0, 0);
      context.closePath();
      context.fillStyle = band.rock + (layer === 0 ? '44' : '66');
      context.fill();
    }
  }

  function drawSpore(item, band) {
    const pulse = 1 + Math.sin(item.phase * 3 + item.x * 0.01) * 0.15;
    const glow = context.createRadialGradient(item.x, item.y, 1, item.x, item.y, item.radius * 3);
    glow.addColorStop(0, band.spore);
    glow.addColorStop(1, band.spore + '00');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(item.x, item.y, item.radius * 3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(item.x, item.y, item.radius * 0.55 * pulse, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = band.spore;
    context.beginPath();
    context.arc(item.x, item.y, item.radius * pulse, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(item.x - 2, item.y - 2, item.radius * 0.3, 0, Math.PI * 2);
    context.fill();
  }

  function drawThorn(item) {
    context.save();
    context.translate(item.x, item.y);
    context.rotate(Math.sin(item.phase + item.x * 0.004) * 0.25);
    const points = 7;
    context.beginPath();
    for (let index = 0; index < points * 2; index += 1) {
      const radius = index % 2 === 0 ? item.radius * 1.25 : item.radius * 0.45;
      const angle = (index / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fillStyle = '#8b98d8';
    context.fill();
    context.strokeStyle = '#e8eeff';
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = '#dfe6ff';
    context.beginPath();
    context.arc(0, 0, item.radius * 0.3, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawHeart(item) {
    context.save();
    context.translate(item.x, item.y);
    const beat = 1 + Math.sin(item.phase * 4 + item.x * 0.01) * 0.18;
    context.scale(beat, beat);
    const glow = context.createRadialGradient(0, 0, 1, 0, 0, item.radius * 2.6);
    glow.addColorStop(0, '#ff6b9d');
    glow.addColorStop(1, '#ff6b9d00');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, item.radius * 2.6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ff6b9d';
    context.beginPath();
    context.moveTo(0, item.radius * 0.9);
    context.bezierCurveTo(-item.radius * 1.2, -item.radius * 0.2, -item.radius * 0.7, -item.radius, 0, -item.radius * 0.35);
    context.bezierCurveTo(item.radius * 0.7, -item.radius, item.radius * 1.2, -item.radius * 0.2, 0, item.radius * 0.9);
    context.fill();
    context.restore();
  }

  function drawMoth(state) {
    const moth = state.moth;
    // Wing-flutter trail: fading golden motes behind the moth.
    for (const point of moth.trail) {
      if (point.life <= 0) continue;
      context.globalAlpha = Math.max(0, point.life / 0.35) * 0.5;
      context.fillStyle = '#ffe9a8';
      context.beginPath();
      context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    const blink = moth.invulnerable > 0 && Math.floor(moth.invulnerable * 12) % 2 === 0;
    if (blink) context.globalAlpha = 0.35;
    const glow = context.createRadialGradient(moth.x, moth.y, 2, moth.x, moth.y, 64);
    glow.addColorStop(0, '#ffe9a888');
    glow.addColorStop(1, '#ffe9a800');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(moth.x, moth.y, 64, 0, Math.PI * 2);
    context.fill();
    const flap = Math.sin(moth.flutter) * 0.55;
    const facing = Math.cos(moth.angle) >= 0 ? 1 : -1;
    context.save();
    context.translate(moth.x, moth.y);
    context.rotate(Math.max(-0.5, Math.min(0.5, moth.angle * 0.6)));
    // Wings.
    context.fillStyle = '#c9b8ff';
    for (const side of [-1, 1]) {
      context.save();
      context.scale(1, side);
      context.rotate(-0.5 - flap * side * 0.4);
      context.beginPath();
      context.ellipse(-4 * facing, -10, 15, 8, -0.4 * facing, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    // Body and head.
    context.fillStyle = PALETTE.moth;
    context.beginPath();
    context.ellipse(0, 0, 13, 6.5, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#3a2f10';
    context.beginPath();
    context.arc(11 * facing, -1, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#ffe9a8';
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(12 * facing, -4);
    context.quadraticCurveTo(20 * facing, -12, 24 * facing, -10);
    context.moveTo(12 * facing, -3);
    context.quadraticCurveTo(20 * facing, -6, 25 * facing, -2);
    context.stroke();
    context.restore();
    context.globalAlpha = 1;
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      if (!particle.active) continue;
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawPopups(state) {
    context.textAlign = 'center';
    context.font = `700 17px ${FONT}`;
    for (const popupItem of state.popups) {
      context.globalAlpha = Math.max(0, popupItem.life / popupItem.maxLife);
      context.fillStyle = popupItem.color;
      context.fillText(popupItem.text, popupItem.x, popupItem.y);
    }
    context.globalAlpha = 1;
  }

  function drawVignette() {
    const gradient = context.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42,
      FIELD.width / 2, FIELD.height / 2, FIELD.width * 0.62,
    );
    gradient.addColorStop(0, '#00000000');
    gradient.addColorStop(1, '#00000088');
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawHud(state, best, muted) {
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    // Top strip.
    context.fillStyle = '#0a061acc';
    context.fillRect(0, 0, FIELD.width, 34);
    context.fillStyle = PALETTE.text;
    context.font = `700 19px ${FONT}`;
    context.fillText(`SCORE ${state.score}`, 16, 24);
    context.font = `600 14px ${FONT}`;
    context.fillStyle = PALETTE.muted;
    context.fillText(`BEST ${best}`, 190, 23);
    // Combo.
    if (state.combo > 1) {
      context.fillStyle = state.band.spore;
      context.font = `700 19px ${FONT}`;
      context.textAlign = 'center';
      context.fillText(`COMBO x${state.combo}`, FIELD.width / 2, 24);
      context.fillRect(FIELD.width / 2 - 40, 28, 80 * (state.comboTimer / 2.5), 3);
      context.textAlign = 'left';
    } else if (state.combo === 1) {
      context.fillStyle = PALETTE.muted;
      context.font = `600 14px ${FONT}`;
      context.textAlign = 'center';
      context.fillText('COMBO x1 — chain pickups to raise it', FIELD.width / 2, 23);
      context.textAlign = 'left';
    }
    // Lives as hearts, just right of the best score.
    for (let index = 0; index < LIVES; index += 1) {
      const x = 292 + index * 26;
      context.fillStyle = index < state.lives ? '#ff6b9d' : '#3a3358';
      context.beginPath();
      context.arc(x - 4, 24, 4.5, 0, Math.PI * 2);
      context.arc(x + 4, 24, 4.5, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(x - 8.5, 25);
      context.lineTo(x + 8.5, 25);
      context.lineTo(x, 34);
      context.closePath();
      context.fill();
    }
    // Depth progress, right-aligned so its label never runs off the edge.
    const barX = FIELD.width - 150;
    context.fillStyle = '#3a3358';
    context.fillRect(barX, 14, 130, 6);
    context.fillStyle = state.band.glow;
    context.fillRect(barX, 14, 130 * ((state.depth - 1) / (DEPTH.max - 1) + (state.score % DEPTH.perScore) / DEPTH.perScore / (DEPTH.max - 1)), 6);
    context.fillStyle = PALETTE.text;
    context.font = `600 12px ${FONT}`;
    context.textAlign = 'right';
    context.fillText(`DEPTH ${state.depth}/10 · ${DEPTH_NAMES[state.depth - 1]}`, FIELD.width - 16, 33);
    context.textAlign = 'left';
    // Dash cooldown: a small arc that refills.
    const dashX = 24;
    const dashY = FIELD.height - 22;
    const ready = state.moth.dashCooldown <= 0;
    context.fillStyle = ready ? '#ffe9a8' : '#3a3358';
    context.beginPath();
    context.arc(dashX, dashY, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (ready ? 1 : 1 - state.moth.dashCooldown / 1.6));
    context.fill();
    context.fillStyle = PALETTE.text;
    context.font = `600 12px ${FONT}`;
    context.fillText(ready ? 'DASH READY [Space]' : 'DASH…', dashX + 16, dashY + 4);
    if (muted) {
      context.fillStyle = PALETTE.muted;
      context.textAlign = 'right';
      context.fillText('MUTED [M]', FIELD.width - 16, FIELD.height - 16);
      context.textAlign = 'left';
    }
  }

  function overlay(title, lines, prompt) {
    context.fillStyle = '#07040f99';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.textAlign = 'center';
    context.fillStyle = PALETTE.text;
    context.font = `700 54px ${FONT}`;
    context.fillText(title, FIELD.width / 2, 150);
    context.font = `400 18px ${FONT}`;
    context.fillStyle = PALETTE.muted;
    lines.forEach((line, index) => {
      context.fillText(line, FIELD.width / 2, 196 + index * 28);
    });
    if (prompt) {
      const pulse = 0.65 + Math.sin(Date.now() / 350) * 0.35;
      context.globalAlpha = pulse;
      context.fillStyle = '#ffe9a8';
      context.font = `700 20px ${FONT}`;
      context.fillText(prompt, FIELD.width / 2, 196 + lines.length * 28 + 34);
      context.globalAlpha = 1;
    }
    context.textAlign = 'left';
  }

  function draw(state, screen, best, muted) {
    resize();
    transform();
    context.save();
    if (state.shake > 0) {
      context.translate((Math.random() - 0.5) * state.shake * 10, (Math.random() - 0.5) * state.shake * 10);
    }
    drawBackdrop(state);
    drawRocks(state);
    for (const item of state.items) {
      if (!item.active) continue;
      if (item.kind === KIND_SPORE) drawSpore(item, state.band);
      else if (item.kind === KIND_THORN) drawThorn(item);
      else if (item.kind === KIND_HEART) drawHeart(item);
    }
    drawMoth(state);
    drawParticles(state);
    drawPopups(state);
    drawVignette();
    context.restore();
    // HUD and overlays are drawn unshaken, on top, in logical coordinates.
    transform();
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best, muted);
    if (screen === SCREEN_TITLE) {
      overlay('LUMEN DRIFT', [
        'Pilot Luma, a little light-moth, through the dark cavern.',
        'Gather light-spores to climb toward the Sunwell at Depth 10.',
        'Chain pickups for a combo up to x5. Dodge the thorn-crystals.',
        'Arrows / WASD or mouse to fly · Space to dash · P to pause · R to restart · M to mute',
        `Best score: ${best}`,
      ], 'Press Enter or click to begin');
    } else if (screen === SCREEN_PAUSED) {
      overlay('PAUSED', ['Take a breath. The cavern waits.'], 'Press P or Enter to keep flying');
    } else if (screen === SCREEN_WIN) {
      overlay('THE SUNWELL', [
        `Luma reached Depth 10 — the cavern is lit again.`,
        `Final score: ${state.score} · Best: ${best}`,
        'Thank you for flying with Luma.',
      ], 'Press R or Enter to fly again');
    } else if (screen === SCREEN_OVER) {
      overlay('THE LIGHT FADES', [
        `Luma's glow went out at Depth ${state.depth} (${DEPTH_NAMES[state.depth - 1]}).`,
        `Final score: ${state.score} · Best: ${best}`,
      ], 'Press R or Enter to try again');
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw, resize };
}
