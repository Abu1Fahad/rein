/* Background embers, UI sounds and the FPS meter. */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- embers */

export function startEmbers(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  let w = 0;
  let h = 0;
  let parts = [];

  // Pre-render the glow sprites once. Building radial gradients for every particle on every
  // frame was the single most expensive thing on the page.
  const sprite = (size, stops) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => grad.addColorStop(o, col));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  };
  const HUES = [18, 26, 34, 42];
  const emberSprites = HUES.map((hue) => sprite(64, [
    [0, `hsla(${hue + 20}, 100%, 85%, 1)`],
    [0.25, `hsla(${hue}, 100%, 60%, 0.8)`],
    [1, `hsla(${hue}, 100%, 50%, 0)`],
  ]));
  const bokehSprite = sprite(96, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);

  const make = (initial) => {
    const bokeh = Math.random() < 0.12;
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 20,
      r: bokeh ? 8 + Math.random() * 22 : 0.8 + Math.random() * 2.6,
      vx: 0.3 + Math.random() * 1.1,
      vy: -(0.5 + Math.random() * 1.8),
      life: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.06,
      img: bokeh ? bokehSprite : emberSprites[(Math.random() * HUES.length) | 0],
      bokeh,
      alpha: bokeh ? 0.05 + Math.random() * 0.08 : 0.55 + Math.random() * 0.45,
    };
  };

  const resize = () => {
    // 1x is plenty for soft glows; a 2x full-screen canvas costs 4x the fill rate.
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;
    const target = reduced ? 14 : Math.round(Math.min(55, (w * h) / 32000));
    parts = Array.from({ length: target }, () => make(true));
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      p.life += p.speed;
      p.x += p.vx + Math.sin(p.life) * 0.5;
      p.y += p.vy;
      if (p.y < -40 || p.x > w + 40) Object.assign(p, make(false), { x: Math.random() * w * 0.9 - w * 0.1 });
      const flicker = p.bokeh ? 1 : 0.65 + Math.sin(p.life * 3) * 0.35;
      const size = (p.bokeh ? p.r : p.r * 4) * 2;
      ctx.globalAlpha = p.alpha * flicker;
      ctx.drawImage(p.img, p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  // ~30 fps is indistinguishable for slow drifting embers and halves the cost.
  let running = true;
  let stopped = false;
  let lastT = 0;
  const loop = (t) => {
    if (stopped) return;
    if (running && t - lastT >= 32) {
      lastT = t;
      draw();
    }
    requestAnimationFrame(loop);
  };
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(resize, 150);
  });
  resize();
  if (reduced) draw();
  else requestAnimationFrame(loop);

  return {
    stop() {
      stopped = true;
      ctx.clearRect(0, 0, w, h);
      canvas.style.display = 'none';
    },
  };
}

/* ---------------------------------------------------------------- FPS */

export function fpsMeter(cb) {
  let frames = 0;
  let last = performance.now();
  const tick = (now) => {
    frames++;
    if (now - last >= 1000) {
      cb(Math.round((frames * 1000) / (now - last)));
      frames = 0;
      last = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------- sounds */

const SOUND_KEY = 'rein.sound';
let enabled = true;
try {
  enabled = localStorage.getItem(SOUND_KEY) !== '0';
} catch {
  enabled = true;
}
let ac = null;
let lastHover = 0;

export const soundOn = () => enabled;
export function setSound(on) {
  enabled = on;
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {
    // ignore
  }
}

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(freq, dur, { type = 'sine', gain = 0.04, to = null, delay = 0 } = {}) {
  const a = ctx();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function sfx(name) {
  if (!enabled || reduced) return;
  try {
    switch (name) {
      case 'hover': {
        const now = performance.now();
        if (now - lastHover < 45) return;
        lastHover = now;
        tone(2100, 0.035, { gain: 0.012 });
        break;
      }
      case 'click':
        tone(900, 0.07, { type: 'triangle', gain: 0.05, to: 1500 });
        break;
      case 'tab':
        tone(1250, 0.06, { type: 'triangle', gain: 0.04 });
        tone(1850, 0.08, { type: 'sine', gain: 0.025, delay: 0.04 });
        break;
      case 'open':
        tone(420, 0.18, { type: 'sine', gain: 0.035, to: 980 });
        break;
      case 'success':
        tone(880, 0.09, { type: 'triangle', gain: 0.045 });
        tone(1320, 0.14, { type: 'triangle', gain: 0.04, delay: 0.08 });
        break;
      case 'error':
        tone(220, 0.16, { type: 'square', gain: 0.025, to: 150 });
        break;
      default:
        break;
    }
  } catch {
    // audio unavailable
  }
}
