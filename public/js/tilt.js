/* 3D hover tilt with glare + parallax layers for every card on the site. */

const TARGETS = [
  ['.b-match', 7, 1.02],
  ['.wp', 10, 1.04],
  ['.t-hero', 3.5, 1.005],
  ['.tile', 12, 1.04],
  ['.pod', 12, 1.04],
  ['.hero-card', 11, 1.03],
  ['.champ-card', 14, 1.05],
  ['.dc-modal', 6, 1.01],
  ['.dc-card', 8, 1.02],
  ['.login-card', 6, 1.01],
  ['.showcase', 9, 1.02],
];
const SELECTOR = TARGETS.map((x) => x[0]).join(',');
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let active = null;
let frame = 0;
let last = null;

function settings(el) {
  for (const [sel, max, scale] of TARGETS) if (el.matches(sel)) return { max, scale };
  return { max: 8, scale: 1.02 };
}

function release(el) {
  el.classList.remove('tilting');
  el.style.transition = 'transform .7s cubic-bezier(.2,.8,.2,1)';
  el.style.transform = '';
  el.style.setProperty('--px', 0);
  el.style.setProperty('--py', 0);
  setTimeout(() => {
    if (!el.classList.contains('tilting')) el.style.transition = '';
  }, 700);
}

function apply() {
  frame = 0;
  if (!active || !last) return;
  const el = active;
  const r = el.getBoundingClientRect();
  const px = Math.min(1, Math.max(0, (last.x - r.left) / r.width)) - 0.5;
  const py = Math.min(1, Math.max(0, (last.y - r.top) / r.height)) - 0.5;
  const { max, scale } = settings(el);
  el.style.transform = `perspective(${Math.max(600, r.width * 2.2)}px) rotateX(${(-py * max * 2).toFixed(2)}deg) rotateY(${(px * max * 2).toFixed(2)}deg) scale(${scale})`;
  el.style.setProperty('--px', px.toFixed(3));
  el.style.setProperty('--py', py.toFixed(3));
  el.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
  el.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
}

function enter(el) {
  if (active && active !== el) release(active);
  active = el;
  // The entrance animation also drives `transform`; drop it so the tilt can take over.
  el.style.animation = 'none';
  el.classList.add('tilting');
  el.style.transition = 'transform .12s linear';
  if (!el.querySelector(':scope > .glare')) {
    const g = document.createElement('span');
    g.className = 'glare';
    el.append(g);
  }
}

export function initTilt() {
  if (!fine || reduced) return;
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.(SELECTOR) ?? null;
    if (el !== active) {
      if (active) release(active);
      active = null;
      if (el) enter(el);
    }
    last = { x: e.clientX, y: e.clientY };
    if (active && !frame) frame = requestAnimationFrame(apply);
  }, { passive: true });
  document.addEventListener('pointerleave', () => {
    if (active) release(active);
    active = null;
  });
}
