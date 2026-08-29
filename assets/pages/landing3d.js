/* ============================================================================
   AK CONSTRUCTIONS — 3D hero (Three.js ES module)

   A procedurally-built luxury villa (concrete · glass · wood · stone · metal ·
   water · landscaping) lit like an architectural visualisation. The whole
   villa slowly rotates like a turntable showcase ("rotating 3D render"); the
   camera holds a cinematic 3/4 framing and dollies through the scroll story
   beats (FOUNDATION → STRUCTURE → DESIGN → COMPLETION).

   Fully self-contained: no external models or textures. Degrades to a CSS/SVG
   hero when WebGL is unavailable, on low-end devices, or under reduced-motion.
   Palette: emerald #0F3D2E · sand #F3EEE4 · brass #CBA35A.
   ========================================================================== */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('hero-canvas');
const stage = document.getElementById('stage');
const fallback = document.getElementById('hero-fallback');

/* ------------------------------------------------------------------ */
/* Capability gate                                                     */
/* ------------------------------------------------------------------ */
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
}
function isVeryLowEnd() {
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  return mem <= 1 || cores <= 2;
}
function showFallback() {
  if (fallback) fallback.hidden = false;
  if (canvas) canvas.style.display = 'none';
}

if (!canvas || REDUCED || !hasWebGL() || isVeryLowEnd()) {
  showFallback();
} else {
  boot();
}

/* ================================================================== */
function boot() {
  const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  const DPR_CAP = isMobile ? 1.5 : 2;
  const SHADOW = isMobile ? 1024 : 2048;
  const ROT_SPEED = 0.16; // rad/s — slow turntable (~39s per revolution)

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { showFallback(); return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = gradientTexture(['#16513c', '#0f3d2e', '#08281e']);
  scene.fog = new THREE.Fog(0x0d3527, 16, 52);

  const camera = new THREE.PerspectiveCamera(42, stage.clientWidth / stage.clientHeight, 0.1, 200);

  // Everything that should turn on the turntable lives in `world`.
  const world = new THREE.Group();
  scene.add(world);

  /* ---- Environment (image-based reflections, no external HDR) ---- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  /* ---- Lighting ---- */
  const hemi = new THREE.HemisphereLight(0xd0e3d4, 0x2a2a1f, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0d4, 2.3);
  sun.position.set(9, 13, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW, SHADOW);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 44;
  sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 3;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x9fd0b4, 0.5);
  rim.position.set(-8, 6, -6);
  scene.add(rim);

  const warm = new THREE.PointLight(0xffb765, 12, 14, 2);
  warm.position.set(0.5, 1.6, 1.6);
  world.add(warm); // rides the turntable so the window glow tracks the glass

  /* ---- Materials ---- */
  const M = {
    concrete: new THREE.MeshStandardMaterial({ color: 0xece7dc, roughness: 0.92, metalness: 0.0 }),
    concreteWarm: new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 0.85, metalness: 0.0 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x35392f, roughness: 0.9, metalness: 0.05 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7c4f28, roughness: 0.6, metalness: 0.0 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x191d18, roughness: 0.35, metalness: 1.0, envMapIntensity: 1.1 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x123f31, roughness: 0.06, metalness: 0.55, transparent: true, opacity: 0.52, envMapIntensity: 1.6 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xffca82 }),
    water: new THREE.MeshStandardMaterial({ color: 0x0d4636, roughness: 0.07, metalness: 0.35, envMapIntensity: 1.4 }),
    deck: new THREE.MeshStandardMaterial({ color: 0xbdb3a0, roughness: 0.95, metalness: 0.0 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x0e2b20, roughness: 1.0, metalness: 0.0 }),
    lawn: new THREE.MeshStandardMaterial({ color: 0x2f4a2c, roughness: 1.0, metalness: 0.0 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x3c6238, roughness: 0.9, metalness: 0.0 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x5a4327, roughness: 0.9, metalness: 0.0 }),
    accent: new THREE.MeshStandardMaterial({ color: 0xcba35a, roughness: 0.45, metalness: 0.2 }),
  };

  function box(w, h, d, mat, x, y, z, opts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = !(opts && opts.noCast);
    m.receiveShadow = !(opts && opts.noReceive);
    world.add(m);
    return m;
  }

  /* ---- Ground (static), deck, lawn, pool ---- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), M.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground); // stays put; uniform so rotation would be invisible anyway

  box(20, 0.12, 16, M.deck, 0, 0.06, 0, { noCast: true });                 // paved deck
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), M.lawn);
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(-6.5, 0.13, -2.2); lawn.receiveShadow = true;
  world.add(lawn);

  // Reflecting pool
  box(4.4, 0.3, 2.6, M.stone, -5.4, 0.15, 2.4, { noCast: true });          // coping
  const pool = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.06, 2.1), M.water);
  pool.position.set(-5.4, 0.26, 2.4); pool.receiveShadow = true;
  world.add(pool);

  /* ---- The villa ---- */
  box(9, 0.5, 6.4, M.stone, 0, 0.25, 0);                                    // stone plinth
  box(7, 2.6, 5, M.concrete, 0, 1.75, 0);                                   // ground floor mass
  box(5, 2.4, 5.4, M.concreteWarm, 1.15, 4.25, -0.3);                       // cantilevered upper mass
  box(5.6, 0.28, 6, M.metal, 1.15, 5.6, -0.3, { noReceive: true });         // roof slab

  // Glass facades (front = +z)
  box(6.2, 2.1, 0.08, M.glass, 0, 1.75, 2.52, { noCast: true, noReceive: true });
  box(4.4, 2.0, 0.08, M.glass, 1.15, 4.25, 2.45, { noCast: true, noReceive: true });
  box(0.08, 2.1, 4.2, M.glass, -3.52, 1.75, 0, { noCast: true, noReceive: true });

  // Warm interior glow behind the glass
  box(6.0, 1.9, 0.05, M.glow, 0, 1.75, 2.35, { noCast: true, noReceive: true });
  box(4.2, 1.8, 0.05, M.glow, 1.15, 4.25, 2.3, { noCast: true, noReceive: true });

  // Mullions (thin metal frames dividing the glazing)
  for (let i = -2; i <= 2; i++) box(0.06, 2.15, 0.12, M.metal, i * 1.25, 1.75, 2.55, { noReceive: true });
  box(6.3, 0.08, 0.14, M.metal, 0, 2.78, 2.55, { noReceive: true });
  box(6.3, 0.08, 0.14, M.metal, 0, 0.72, 2.55, { noReceive: true });

  // Wood soffit under the cantilever + wood slat wall
  box(5, 0.16, 2, M.wood, 1.15, 3.02, 1.6);
  for (let i = 0; i < 10; i++) box(0.16, 2.3, 0.16, M.wood, -3.15 + i * 0.34, 4.25, -3.05);

  // Rooftop terrace railing
  const railY = 3.15;
  box(4.6, 0.08, 0.06, M.metal, -1.4, railY + 0.9, 2.45, { noReceive: true });
  for (let i = 0; i <= 8; i++) box(0.04, 0.9, 0.04, M.metal, -3.6 + i * 0.55, railY + 0.45, 2.45, { noReceive: true });

  // Entry portal + steps
  box(1.7, 2.4, 0.3, M.concreteWarm, -2.0, 1.4, 2.6);
  box(1.0, 2.0, 0.08, M.wood, -2.0, 1.2, 2.78, { noReceive: true });
  box(2.2, 0.16, 1.0, M.deck, -2.0, 0.16, 3.3, { noCast: true });
  box(2.6, 0.16, 1.4, M.deck, -2.0, 0.08, 3.7, { noCast: true });

  // Slim planter by the entry
  box(2.2, 0.4, 0.5, M.stone, -0.2, 0.4, 3.1);
  box(2.0, 0.4, 0.35, M.foliage, -0.2, 0.66, 3.1, { noReceive: true });

  /* ---- Landscaping (low-poly trees & shrubs) — ride the turntable ---- */
  function tree(x, z, s) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.11 * s, 1.1 * s, 6), M.trunk);
    trunk.position.y = 0.55 * s; trunk.castShadow = true;
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 * s, 0), M.foliage);
    foliage.position.y = 1.5 * s; foliage.castShadow = true; foliage.rotation.y = Math.random();
    g.add(trunk, foliage);
    g.position.set(x, 0.12, z);
    world.add(g);
  }
  function shrub(x, z, s) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 * s, 0), M.foliage);
    m.position.set(x, 0.3 * s, z); m.scale.y = 0.7; m.castShadow = true;
    world.add(m);
  }
  tree(-8.2, -1.5, 1.15); tree(-7.2, -3.6, 0.9); tree(6.6, -2.2, 1.05); tree(4.8, 3.2, 0.8);
  shrub(-5.2, 3.6, 1); shrub(3.2, 3.4, 0.9); shrub(-9, 1.5, 1.1);

  /* ---- Floating architectural motifs (independent of the turntable) ---- */
  const floaters = [];
  if (!isMobile) {
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.02, 12, 60), M.accent);
    ring1.position.set(-4.5, 5.4, 1); floaters.push(ring1); scene.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.015, 12, 48), M.metal);
    ring2.position.set(5, 3.6, 2.5); floaters.push(ring2); scene.add(ring2);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.5, wireframe: true }));
    cube.position.set(-3, 6.4, -1); floaters.push(cube); scene.add(cube);

    const N = 120, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 26; pos[i * 3 + 1] = Math.random() * 12; pos[i * 3 + 2] = (Math.random() - 0.5) * 22; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const motes = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xe8d6a8, size: 0.045, transparent: true, opacity: 0.5, depthWrite: false }));
    scene.add(motes);
    floaters.motes = motes;
  }

  /* ---- Camera keyframes (progress 0 → 1) — front 3/4, dolly only.        */
  /*      The turntable supplies the 360° tour, so the camera never orbits. */
  const KF = [
    { p: [9.5, 5.2, 12.5], t: [0, 2.1, 0] },   // hero — wide establishing
    { p: [8.5, 2.2, 10.5], t: [0, 1.3, 0] },   // 01 foundation — low & close
    { p: [10.5, 4.6, 12.0], t: [0, 2.6, 0] },  // 02 structure — rising
    { p: [7.0, 3.0, 9.0],  t: [0, 2.2, 0] },   // 03 design — closer to glazing
    { p: [11.5, 6.6, 14.5], t: [0, 2.3, 0] },  // 04 completion — glory pull-back
  ];
  const curPos = new THREE.Vector3().fromArray(KF[0].p);
  const curTgt = new THREE.Vector3().fromArray(KF[0].t);
  const desPos = curPos.clone();
  const desTgt = curTgt.clone();
  const vA = new THREE.Vector3(), vB = new THREE.Vector3();

  function smooth(x) { return x * x * (3 - 2 * x); }
  function sampleKF(progress, outPos, outTgt) {
    const seg = Math.min(KF.length - 2, Math.floor(progress * (KF.length - 1)));
    const f = smooth(THREE.MathUtils.clamp(progress * (KF.length - 1) - seg, 0, 1));
    outPos.fromArray(KF[seg].p).lerp(vA.fromArray(KF[seg + 1].p), f);
    outTgt.fromArray(KF[seg].t).lerp(vB.fromArray(KF[seg + 1].t), f);
  }

  /* ---- Mouse parallax ---- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5);
      mouse.ty = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
  }

  /* ---- Render loop (paused when offscreen / hidden) ---- */
  const clock = new THREE.Clock();
  let ready = false;
  let running = false;

  function frame() {
    const t = clock.getElapsedTime();
    const progress = (window.AK && typeof window.AK.expProgress === 'number') ? window.AK.expProgress : 0;

    // Continuous turntable rotation of the whole villa.
    world.rotation.y = t * ROT_SPEED;

    sampleKF(progress, desPos, desTgt);

    // idle drift + mouse parallax (camera stays on the front 3/4)
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    desPos.x += Math.sin(t * 0.3) * 0.18 + mouse.x * 1.4;
    desPos.y += Math.sin(t * 0.5) * 0.12 - mouse.y * 0.9;
    desTgt.x += mouse.x * 0.4;

    curPos.lerp(desPos, 0.06);
    curTgt.lerp(desTgt, 0.07);
    camera.position.copy(curPos);
    camera.lookAt(curTgt);

    // floaters drift independently
    for (let i = 0; i < floaters.length; i++) {
      const o = floaters[i];
      o.rotation.x = t * 0.3 + i; o.rotation.y = t * 0.25 + i;
      o.position.y += Math.sin(t * 0.8 + i * 2) * 0.0016;
    }
    if (floaters.motes) floaters.motes.rotation.y = t * 0.02;

    renderer.render(scene, camera);

    if (!ready) { ready = true; canvas.classList.add('ready'); }
  }

  function start() { if (!running) { running = true; renderer.setAnimationLoop(frame); } }
  function stop() { if (running) { running = false; renderer.setAnimationLoop(null); } }

  /* ---- Resize ---- */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  /* ---- Only render while the stage is on screen ---- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { en.isIntersecting ? start() : stop(); });
    }, { threshold: 0.01 });
    io.observe(stage);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
  start();

  // If the GL context is lost, fall back gracefully.
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); showFallback(); }, false);

  /* ---- Gradient sky helper ---- */
  function gradientTexture(colors) {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    const ctx = c.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, colors[0]);
    grd.addColorStop(0.55, colors[1]);
    grd.addColorStop(1, colors[2]);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}
