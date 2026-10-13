/*
 * Real-time 3D models built with three.js (procedural geometry — no external model files):
 *   data-3d="hammer"  → Reinhardt-style rocket hammer, ignites + spins faster on hover, swings on click
 *   data-3d="trophy"  → gold champion trophy with orbiting sparkles
 * Any element with data-3d is mounted automatically; it is disposed when removed from the page.
 */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lite = () => document.documentElement.classList.contains('lite');
let threeP = null;
const loadThree = () => {
  threeP ??= Promise.all([
    import('three'),
    import('three/addons/environments/RoomEnvironment.js'),
    import('three/addons/geometries/RoundedBoxGeometry.js'),
  ]).then(([THREE, env, rb]) => ({ THREE, RoomEnvironment: env.RoomEnvironment, RoundedBoxGeometry: rb.RoundedBoxGeometry }));
  return threeP;
};

const pointer = { x: -1e5, y: -1e5 };
window.addEventListener('pointermove', (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
}, { passive: true });

/* ---------------------------------------------------------------- materials */

function materials(THREE) {
  return {
    gold: new THREE.MeshStandardMaterial({ color: 0xf0bf4c, metalness: 1, roughness: 0.22 }),
    darkGold: new THREE.MeshStandardMaterial({ color: 0xb8862a, metalness: 1, roughness: 0.35 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc9d1de, metalness: 0.95, roughness: 0.28 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x3b4560, metalness: 0.85, roughness: 0.4 }),
    navy: new THREE.MeshStandardMaterial({ color: 0x232b45, metalness: 0.4, roughness: 0.55 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x4a2a1a, metalness: 0.1, roughness: 0.75 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xffa040 }),
    flame: new THREE.MeshBasicMaterial({ color: 0xff7a1f, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    flameCore: new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  };
}

function shieldShape(THREE, s = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.5 * s);
  sh.lineTo(0.38 * s, 0.36 * s);
  sh.lineTo(0.38 * s, 0.02 * s);
  sh.quadraticCurveTo(0.36 * s, -0.36 * s, 0, -0.55 * s);
  sh.quadraticCurveTo(-0.36 * s, -0.36 * s, -0.38 * s, 0.02 * s);
  sh.lineTo(-0.38 * s, 0.36 * s);
  sh.closePath();
  return sh;
}

/* ---------------------------------------------------------------- hammer */

function buildHammer({ THREE, RoundedBoxGeometry }, M) {
  const root = new THREE.Group();
  const hammer = new THREE.Group();
  root.add(hammer);

  // handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 3.1, 28), M.darkSteel);
  handle.position.y = -1.1;
  hammer.add(handle);
  for (let i = 0; i < 7; i++) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.026, 10, 28), M.leather);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.y = -2.0 - i * 0.09;
    hammer.add(wrap);
  }
  const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.24, 28), M.gold);
  pommel.position.y = -2.72;
  hammer.add(pommel);
  const pommelCap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), M.gold);
  pommelCap.position.y = -2.86;
  hammer.add(pommelCap);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.32, 28), M.gold);
  collar.position.y = -0.02;
  hammer.add(collar);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 10, 28), M.gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.55;
  hammer.add(ring);

  // head
  const head = new THREE.Group();
  head.position.y = 0.58;
  hammer.add(head);
  head.add(new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.92, 0.92, 4, 0.12), M.steel));
  const band = new THREE.Mesh(new RoundedBoxGeometry(0.54, 1.0, 1.0, 3, 0.07), M.gold);
  head.add(band);
  for (const x of [-0.62, 0.62]) {
    const trim = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.98, 0.98, 2, 0.03), M.darkGold);
    trim.position.x = x;
    head.add(trim);
  }
  // crest on both sides of the band
  const crestGeo = new THREE.ExtrudeGeometry(shieldShape(THREE, 0.62), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  crestGeo.center();
  for (const z of [0.52, -0.52]) {
    const crest = new THREE.Mesh(crestGeo, M.navy);
    crest.position.z = z;
    if (z < 0) crest.rotation.y = Math.PI;
    head.add(crest);
    const inner = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape(THREE, 0.42), { depth: 0.04, bevelEnabled: false }), M.glow);
    inner.geometry.center();
    inner.position.z = z + (z > 0 ? 0.05 : -0.05);
    if (z < 0) inner.rotation.y = Math.PI;
    head.add(inner);
  }
  // striking face (+x)
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.32, 48), M.steel);
  face.rotation.z = Math.PI / 2;
  face.position.x = 1.12;
  head.add(face);
  const faceRim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.055, 14, 48), M.gold);
  faceRim.rotation.y = Math.PI / 2;
  faceRim.position.x = 1.28;
  head.add(faceRim);
  const faceCap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 40), M.darkSteel);
  faceCap.rotation.z = Math.PI / 2;
  faceCap.position.x = 1.3;
  head.add(faceCap);
  // rocket (-x)
  const rocket = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.42, 36), M.darkSteel);
  rocket.rotation.z = Math.PI / 2;
  rocket.position.x = -1.16;
  head.add(rocket);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.34, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a3146, metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide }));
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.x = -1.52;
  head.add(nozzle);
  const nozzleRim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 12, 40), M.gold);
  nozzleRim.rotation.y = Math.PI / 2;
  nozzleRim.position.x = -1.69;
  head.add(nozzleRim);
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), M.glow);
  core.rotation.y = -Math.PI / 2;
  core.position.x = -1.4;
  head.add(core);

  // flame
  const flame = new THREE.Group();
  flame.position.x = -1.7;
  head.add(flame);
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.3, 28, 1, true), M.flame);
  outer.rotation.z = Math.PI / 2;
  outer.position.x = -0.62;
  flame.add(outer);
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 24, 1, true), M.flameCore);
  inner.rotation.z = Math.PI / 2;
  inner.position.x = -0.38;
  flame.add(inner);
  const halo = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.9, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xff4d0a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  halo.rotation.z = Math.PI / 2;
  halo.position.x = -0.85;
  flame.add(halo);
  flame.scale.setScalar(0.001);

  // rocket sparks
  const SPARKS = 60;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkData = Array.from({ length: SPARKS }, () => ({ life: Math.random(), vx: 0, vy: 0, vz: 0 }));
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xffb347, size: 0.09, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  head.add(sparks);

  const light = new THREE.PointLight(0xff7a1f, 0, 6, 1.6);
  light.position.set(-2.3, 0.58, 0.4);
  hammer.add(light);

  hammer.rotation.z = -0.62;
  hammer.position.set(0.55, 0.2, 0);
  root.userData = { hammer, flame, light, core, sparks, sparkData, kind: 'hammer' };
  return root;
}

/* ---------------------------------------------------------------- trophy */

function buildTrophy({ THREE }, M) {
  const root = new THREE.Group();
  const trophy = new THREE.Group();
  root.add(trophy);
  const profile = [
    [0, 0.55], [0.13, 0.55], [0.17, 0.6], [0.36, 0.76], [0.58, 1.0], [0.72, 1.3], [0.79, 1.6], [0.82, 1.76],
    [0.76, 1.78], [0.71, 1.62], [0.62, 1.32], [0.48, 1.08], [0.2, 0.96], [0, 0.95],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const cupMat = M.gold.clone();
  cupMat.side = THREE.DoubleSide;
  trophy.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 64), cupMat));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.035, 12, 64), M.gold);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 1.77;
  trophy.add(lip);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.48, 28), M.gold);
  stem.position.y = 0.3;
  trophy.add(stem);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 28, 18), M.darkGold);
  knob.position.y = 0.5;
  trophy.add(knob);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.14, 48), M.gold);
  base.position.y = 0.04;
  trophy.add(base);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.42, 1.2), M.navy);
  plinth.position.y = -0.24;
  trophy.add(plinth);
  const plinthTrim = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 1.24), M.gold);
  plinthTrim.position.y = -0.04;
  trophy.add(plinthTrim);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.02), M.gold);
  plate.position.set(0, -0.24, 0.61);
  trophy.add(plate);
  for (const side of [1, -1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 14, 36, Math.PI), M.gold);
    handle.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    handle.position.set(side * 0.72, 1.35, 0);
    trophy.add(handle);
  }
  const crest = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape(THREE, 0.46), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 }), M.navy);
  crest.geometry.center();
  crest.position.set(0, 1.32, 0.66);
  crest.rotation.x = -0.18;
  trophy.add(crest);
  const crestGlow = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape(THREE, 0.3), { depth: 0.03, bevelEnabled: false }), M.glow);
  crestGlow.geometry.center();
  crestGlow.position.set(0, 1.32, 0.7);
  crestGlow.rotation.x = -0.18;
  trophy.add(crestGlow);

  // sparkles
  const count = 70;
  const pos = new Float32Array(count * 3);
  const seeds = [];
  for (let i = 0; i < count; i++) seeds.push({ r: 0.9 + Math.random() * 0.8, a: Math.random() * Math.PI * 2, y: Math.random() * 2.4 - 0.2, s: 0.3 + Math.random() * 0.8 });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparkles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffe08a, size: 0.06, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  root.add(sparkles);

  trophy.position.y = -0.75;
  sparkles.position.y = -0.75;
  root.userData = { trophy, sparkles, seeds, kind: 'trophy' };
  return root;
}

/* ---------------------------------------------------------------- mount */

// Wait for the browser to be idle so the page content paints before three.js (~600 KB) loads.
const whenIdle = () => new Promise((resolve) => {
  if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout: 1200 });
  else setTimeout(resolve, 300);
});

async function mount(el) {
  if (el.dataset.mounted3d) return;
  el.dataset.mounted3d = '1';
  await whenIdle();
  if (!el.isConnected) return;
  let libs;
  try {
    libs = await loadThree();
  } catch (err) {
    console.warn('3D unavailable:', err);
    return;
  }
  if (!el.isConnected) return;
  const { THREE, RoomEnvironment } = libs;

  let renderer;
  try {
    const dpr = window.devicePixelRatio || 1;
    // MSAA is redundant on high-DPI screens and expensive on integrated GPUs.
    renderer = new THREE.WebGLRenderer({ antialias: dpr < 1.5, alpha: true, powerPreference: 'low-power' });
  } catch {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.className = 'three-canvas';
  el.append(canvas);
  el.classList.add('ready');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const kind = el.dataset['3d'];
  const camera = new THREE.PerspectiveCamera(kind === 'hammer' ? 32 : 30, 1, 0.1, 100);
  camera.position.set(0, 0.1, kind === 'hammer' ? 10.5 : 6.2);

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1b2238, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8a3d, 2.4);
  rim.position.set(-4, 1, -3);
  scene.add(rim);

  const M = materials(THREE);
  const model = kind === 'trophy' ? buildTrophy(libs, M) : buildHammer(libs, M);
  scene.add(model);

  // Cache the element's position instead of forcing a layout read on every frame.
  let rect = el.getBoundingClientRect();
  const measure = () => { rect = el.getBoundingClientRect(); };
  window.addEventListener('scroll', measure, { passive: true, capture: true });
  window.addEventListener('resize', measure, { passive: true });

  const resize = () => {
    measure();
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(el);

  const state = { hover: 0, spin: 0, rx: 0, ry: 0, swing: 0, burst: 0 };
  let hovering = false;
  el.addEventListener('pointerenter', () => { hovering = true; });
  el.addEventListener('pointerleave', () => { hovering = false; });
  el.addEventListener('click', () => {
    state.swing = 1;
    state.burst = 1;
  });

  const clock = new THREE.Clock();
  let raf = 0;
  let frameNo = 0;
  const dispose = () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener('scroll', measure, { capture: true });
    window.removeEventListener('resize', measure);
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
  };

  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!el.isConnected) {
      dispose();
      return;
    }
    // Off-screen, hidden tab, or low-power mode while not hovered: skip (but always draw the first frame).
    if (frameNo > 0 && (!visible || document.hidden || (lite() && !hovering))) {
      clock.getDelta();
      return;
    }
    // While idle (no hover / swing) the model only drifts slowly, so 30 fps is enough.
    frameNo++;
    const idle = !hovering && state.hover < 0.02 && state.burst === 0 && state.swing === 0;
    if (idle && frameNo % 2 === 0) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;

    const r = rect;
    const nx = Math.max(-1, Math.min(1, (pointer.x - (r.left + r.width / 2)) / Math.max(200, r.width)));
    const ny = Math.max(-1, Math.min(1, (pointer.y - (r.top + r.height / 2)) / Math.max(200, r.height)));
    state.hover += ((hovering ? 1 : 0) - state.hover) * Math.min(1, dt * 6);
    const follow = 0.25 + state.hover * 0.45;
    state.ry += (nx * follow - state.ry) * Math.min(1, dt * 5);
    state.rx += (ny * follow * 0.6 - state.rx) * Math.min(1, dt * 5);
    state.spin += dt * (reduced ? 0 : 0.45 + state.hover * 2.4);
    state.swing = Math.max(0, state.swing - dt * 1.6);
    state.burst = Math.max(0, state.burst - dt * 1.2);

    const u = model.userData;
    model.rotation.set(state.rx, state.spin + state.ry, 0);
    model.position.y = Math.sin(t * 1.6) * 0.06;

    if (u.kind === 'hammer') {
      const sw = Math.sin(state.swing * Math.PI) * (state.swing > 0 ? 1 : 0);
      u.hammer.rotation.z = -0.62 + sw * 1.1;
      const power = Math.max(state.hover, state.burst);
      const flick = 0.85 + Math.sin(t * 40) * 0.08 + Math.sin(t * 23) * 0.07;
      const s = 0.001 + power * flick * (1 + state.burst * 0.6);
      u.flame.scale.set(s, 0.7 + power * 0.3 * flick, 0.7 + power * 0.3 * flick);
      u.light.intensity = power * 9 * flick;
      u.core.material.color.setHSL(0.07, 1, 0.55 + power * 0.25);
      const sp = u.sparks.geometry.attributes.position;
      u.sparkData.forEach((d, i) => {
        d.life += dt * (1.4 + Math.random());
        if (d.life >= 1) {
          d.life = 0;
          d.vx = -(2.5 + Math.random() * 3);
          d.vy = (Math.random() - 0.5) * 1.4;
          d.vz = (Math.random() - 0.5) * 1.4;
        }
        const k = d.life * 0.9;
        sp.setXYZ(i, -1.75 + d.vx * k, d.vy * k, d.vz * k);
      });
      sp.needsUpdate = true;
      u.sparks.material.opacity = power * 0.95;
    } else {
      const pos = u.sparkles.geometry.attributes.position;
      u.seeds.forEach((s, i) => {
        const a = s.a + t * s.s * (1 + state.hover * 2 + state.burst * 4);
        const rr = s.r + state.burst * 0.6;
        pos.setXYZ(i, Math.cos(a) * rr, s.y + Math.sin(t * s.s * 2 + i) * 0.12, Math.sin(a) * rr);
      });
      pos.needsUpdate = true;
      u.sparkles.material.opacity = 0.35 + state.hover * 0.55 + state.burst * 0.3;
      u.trophy.scale.setScalar(1 + state.hover * 0.06 + Math.sin(state.burst * Math.PI) * 0.08);
    }
    renderer.render(scene, camera);
  };
  tick();
}

export function init3D() {
  const scan = () => document.querySelectorAll('[data-3d]:not([data-mounted3d])').forEach((el) => mount(el));
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
}
