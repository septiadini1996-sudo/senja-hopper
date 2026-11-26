// ui.js — canvas buttons: the game draws its own controls so the
// screenshots show the real interface, and one registry serves the
// mouse, the touch screen and the headless tests alike.

import { rr, text } from './render.js';

let buttons = [];

export function clearButtons() {
  buttons = [];
}

export function addButton(x, y, w, h, label, action, opts = {}) {
  buttons.push({ x, y, w, h, label, action, ...opts });
  return buttons[buttons.length - 1];
}

export function drawButtons(ctx) {
  for (const b of buttons) {
    if (b.hidden || b.bare) continue;
    rr(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.fillStyle = b.primary ? '#e8933f' : 'rgba(20,26,48,0.92)';
    ctx.fill();
    ctx.strokeStyle = b.primary ? '#ffd76a' : 'rgba(255,179,64,0.6)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + (b.size ?? 21) * 0.36, b.size ?? 21, b.primary ? '#231303' : '#fff7e6', 'center', 800);
  }
}

export function hitButton(px, py) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (b.hidden) continue;
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b;
  }
  return null;
}

export function buttonCount() {
  return buttons.length;
}
