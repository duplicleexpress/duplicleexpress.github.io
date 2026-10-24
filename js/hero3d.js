// Dupli'Clé Express : clé de voiture en 3D animée au défilement (page d'accueil)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const section = document.getElementById('k3d');
const canvas = document.getElementById('k3d-canvas');

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

if (section && canvas && webglOk()) start();

function start() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.classList.add('k3d-on');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  // Lumières : une douce + un contre-jour jaune aux couleurs de la marque
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.PointLight(0xffcb18, 40, 30); rim.position.set(-5, 3, -4); scene.add(rim);
  const rim2 = new THREE.PointLight(0xffcb18, 18, 30); rim2.position.set(5, -4, -3); scene.add(rim2);

  // ─── Matériaux ───
  const mBody = new THREE.MeshPhysicalMaterial({ color: 0x0d0e10, roughness: 0.32, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12 });
  const mButton = new THREE.MeshPhysicalMaterial({ color: 0x1b1d21, roughness: 0.55, clearcoat: 0.4 });
  const mYellow = new THREE.MeshStandardMaterial({ color: 0xffcb18, emissive: 0xffb000, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.3 });
  const mChrome = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, metalness: 1, roughness: 0.14, envMapIntensity: 2.2 });
  const mIcon = new THREE.MeshStandardMaterial({ color: 0xffcb18, emissive: 0xffcb18, emissiveIntensity: 1.2 });

  // ─── Construction d'une clé ───
  function roundedRect(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function extrude(shape, depth, bevel) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 6, curveSegments: 24 });
    g.translate(0, 0, -depth / 2);
    return g;
  }

  const W = 1.7, H = 2.7, D = 0.5;
  const bodyGeo = extrude(roundedRect(W, H, 0.62), D, 0.14);
  // Bande jaune sur le tour de la clé
  const ringShape = roundedRect(W + 0.22, H + 0.22, 0.7);
  ringShape.holes.push(roundedRect(W + 0.02, H + 0.02, 0.62));
  const ringGeo = extrude(ringShape, 0.12, 0.02);
  const btnGeo = extrude(roundedRect(0.92, 0.5, 0.22), 0.08, 0.03);
  // Icônes : cadenas fermé, cadenas ouvert, coffre
  const lockBody = new THREE.BoxGeometry(0.2, 0.16, 0.03);
  const lockArc = new THREE.TorusGeometry(0.07, 0.022, 8, 20, Math.PI);
  const trunk = new THREE.TorusGeometry(0.12, 0.022, 8, 24, Math.PI);

  // Lame à paillettes (profil dentelé)
  function bladeGeo() {
    const s = new THREE.Shape();
    const L = 2.5, w = 0.36;
    s.moveTo(-w / 2, 0);
    s.lineTo(-w / 2, L - 0.25);
    s.lineTo(0, L);
    s.lineTo(w / 2, L - 0.12);
    const teeth = 7;
    for (let i = 0; i < teeth; i++) {
      const y0 = L - 0.25 - i * ((L - 0.45) / teeth);
      const y1 = y0 - ((L - 0.45) / teeth) / 2;
      s.lineTo(w / 2, y0);
      s.lineTo(w / 2 - (i % 2 ? 0.1 : 0.06), y1);
    }
    s.lineTo(w / 2, 0.2);
    s.lineTo(w / 2, 0);
    s.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
    g.translate(0, 0, -0.045);
    return g;
  }
  const bladeG = bladeGeo();

  function makeKey() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, mBody); g.add(body);
    const ring = new THREE.Mesh(ringGeo, mYellow); g.add(ring);
    const front = D / 2 + 0.14;
    [0.62, 0, -0.62].forEach((y, i) => {
      const b = new THREE.Mesh(btnGeo, mButton); b.position.set(0, y, front + 0.02); g.add(b);
      const ic = new THREE.Group(); ic.position.set(0, y, front + 0.09);
      if (i < 2) {
        const lb = new THREE.Mesh(lockBody, mIcon); lb.position.y = -0.04; ic.add(lb);
        const la = new THREE.Mesh(lockArc, mIcon); la.position.set(i === 1 ? 0.05 : 0, 0.04, 0); ic.add(la);
      } else {
        const t = new THREE.Mesh(trunk, mIcon); t.position.y = -0.06; ic.add(t);
      }
      g.add(ic);
    });
    // Anneau métallique en bas
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 12, 32), mChrome);
    loop.position.set(0, -H / 2 - 0.12, 0); loop.rotation.x = Math.PI / 2; g.add(loop);
    // Lame : pivot en haut de la clé, rangée dans la coque au départ
    const pivot = new THREE.Group(); pivot.position.set(0, H / 2 - 0.25, -0.02);
    const blade = new THREE.Mesh(bladeG, mChrome); pivot.add(blade);
    pivot.rotation.z = Math.PI;
    g.add(pivot);
    g.userData.pivot = pivot;
    return g;
  }

  const key1 = makeKey();
  const key2 = makeKey();
  key2.visible = false;
  const rig = new THREE.Group(); rig.add(key1, key2); scene.add(rig);

  // Ondes de programmation
  const waves = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffcb18, transparent: true, opacity: 0, depthWrite: false });
    const w = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 64), m);
    scene.add(w); waves.push(w);
  }

  // Poussière lumineuse en fond
  const dustGeo = new THREE.BufferGeometry();
  const N = 260, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 22; pos[i * 3 + 1] = (Math.random() - 0.5) * 14; pos[i * 3 + 2] = -3 - Math.random() * 8; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffcb18, size: 0.035, transparent: true, opacity: 0.55 }));
  scene.add(dust);

  // ─── Défilement ───
  const panels = [...section.querySelectorAll('[data-step]')];
  const bar = section.querySelector('.k3d-bar i');
  let progress = 0, smooth = 0;
  function readScroll() {
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    progress = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
  }
  window.addEventListener('scroll', readScroll, { passive: true });

  const clamp01 = v => Math.min(1, Math.max(0, v));
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  let mobile = false;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    mobile = w < 760;
    camera.position.z = mobile ? 17 : 13;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  let visible = true;
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { rootMargin: '100px' }).observe(section);

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    // Lissage basé sur le temps : même fluidité sur un téléphone lent ou rapide
    smooth += (progress - smooth) * (reduce ? 1 : 1 - Math.exp(-dt * 7));
    const p = smooth;

    // Étapes : 0 intro · 1 lame qui sort · 2 duplication · 3 programmation · 4 final
    const sOpen = ease(seg(p, 0.12, 0.32));
    const sDup = ease(seg(p, 0.38, 0.6));
    const sProg = seg(p, 0.64, 0.84);
    const sEnd = ease(seg(p, 0.86, 1));

    const float = reduce ? 0 : Math.sin(t * 1.2) * 0.08;
    const baseX = mobile ? 0 : 2.3;            // la clé à droite sur ordinateur, au centre sur mobile
    const baseY = mobile ? 1.6 : 0;

    key1.userData.pivot.rotation.z = Math.PI * (1 - sOpen);
    key2.userData.pivot.rotation.z = Math.PI * (1 - sOpen);

    const spread = mobile ? 1.25 : 1.6;
    key2.visible = sDup > 0.001;
    key1.position.set(-spread * sDup * (1 - sEnd * 0.4), 0, 0);
    key2.position.set(spread * sDup * (1 - sEnd * 0.4), 0, -0.4 * (1 - sDup));
    key2.scale.setScalar(0.4 + 0.6 * sDup);
    key2.rotation.y = (1 - sDup) * -1.2;

    rig.position.set(baseX * (1 - sEnd * 0.15), baseY + float - (mobile ? 0.9 : 1.15) * sOpen, 0);
    const spin = reduce ? 0 : (1 - sOpen) * Math.sin(t * 0.6) * 0.35;
    rig.rotation.y = -0.55 + sOpen * 0.35 + spin + sEnd * 0.2 + (reduce ? 0 : Math.sin(t * 0.5) * 0.06);
    rig.rotation.x = 0.12 - sDup * 0.06;
    rig.rotation.z = -0.18 * (1 - sOpen) + 0.04;
    const sc = (mobile ? 0.82 : 1) * (1 - 0.12 * sDup);
    rig.scale.setScalar(sc);

    // Ondes autour des clés pendant la programmation
    waves.forEach((w, i) => {
      const ph = ((t * 0.7 + i / 3) % 1);
      const on = sProg * (1 - sEnd);
      w.position.copy(rig.position); w.position.z = 0.5;
      w.rotation.y = rig.rotation.y;
      w.scale.setScalar((1.4 + ph * 3.2) * sc);
      w.material.opacity = on * (1 - ph) * 0.8;
    });
    mYellow.emissiveIntensity = 0.55 + sProg * (1 - sEnd) * (0.6 + Math.sin(t * 6) * 0.3);
    mIcon.emissiveIntensity = 1.2 + sProg * 1.5;

    dust.rotation.y = t * 0.02; dust.position.y = -p * 2;

    // Textes : un panneau visible à la fois
    const step = p < 0.1 ? 0 : p < 0.35 ? 1 : p < 0.62 ? 2 : p < 0.85 ? 3 : 4;
    panels.forEach(el => el.classList.toggle('on', +el.dataset.step === step));
    if (bar) bar.style.transform = `scaleX(${p})`;

    renderer.render(scene, camera);
  }
  resize(); readScroll(); frame();
}
