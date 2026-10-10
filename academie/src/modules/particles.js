/**
 * Effet signature : bulles de champagne dorées en 3D (Three.js).
 * Les bulles remontent, scintillent et s'écartent du curseur.
 * Tout le mouvement est calculé dans le shader (GPU) pour rester fluide.
 */
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  Points,
  AdditiveBlending,
  Color,
  Vector2,
} from 'three';
import { gsap } from 'gsap';
import { reduced } from './motion.js';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform vec2 uArea;
  uniform vec2 uMouse;
  uniform float uForce;
  uniform float uPixelRatio;

  attribute vec3 aBase;
  attribute float aSpeed;
  attribute float aSize;
  attribute float aSeed;
  attribute float aKind;

  varying float vAlpha;
  varying float vKind;
  varying float vSeed;

  void main() {
    float h = uArea.y;
    vec3 p = vec3(aBase.xy * uArea, aBase.z);
    p.y = mod(p.y + h * 0.5 + uTime * aSpeed + uScroll * (0.6 + aSpeed * 2.0), h) - h * 0.5;
    p.x += sin(uTime * (0.5 + aSeed) + aSeed * 40.0) * (0.08 + aSeed * 0.22);

    // Répulsion par la souris, projetée à la profondeur de la bulle
    float depth = (10.0 - p.z) / 10.0;
    vec2 m = uMouse * depth;
    vec2 d = p.xy - m;
    float dist = length(d);
    float push = smoothstep(2.2 * depth, 0.0, dist) * uForce;
    p.xy += normalize(d + 0.0001) * push * 1.3;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (14.0 / -mv.z);

    float edge = smoothstep(-h * 0.5, -h * 0.5 + 1.5, p.y) * (1.0 - smoothstep(h * 0.5 - 1.8, h * 0.5, p.y));
    float twinkle = 0.7 + 0.3 * sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 60.0);
    vAlpha = edge * twinkle * (0.35 + 0.65 * fract(aSeed * 7.13)) * (1.0 + push * 0.8);
    vKind = aKind;
    vSeed = aSeed;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uGoldA;
  uniform vec3 uGoldB;
  uniform float uOpacity;

  varying float vAlpha;
  varying float vKind;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    vec3 col = mix(uGoldA, uGoldB, vSeed);
    float a;
    if (vKind < 0.5) {
      // Bulle : contour lumineux, cœur translucide, petit reflet
      float rim = smoothstep(0.5, 0.41, d) * smoothstep(0.2, 0.43, d);
      float core = smoothstep(0.5, 0.0, d) * 0.12;
      float hl = smoothstep(0.13, 0.0, length(uv - vec2(-0.15, -0.17)));
      a = rim * 0.85 + core + hl;
      col = mix(col, vec3(1.0, 0.97, 0.88), hl * 0.9);
    } else {
      // Poussière d'or : point lumineux diffus
      a = pow(smoothstep(0.5, 0.0, d), 2.2);
    }
    gl_FragColor = vec4(col, a * vAlpha * uOpacity);
  }
`;

export function initParticles(canvas) {
  if (!canvas) return null;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  } catch (e) {
    console.warn('WebGL indisponible, particules désactivées.');
    return null;
  }

  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const count = reduced ? 220 : mobile ? 320 : 720;
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.1, 60);
  camera.position.z = 10;

  const base = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  const kind = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const isDust = Math.random() < 0.45;
    base[i * 3] = Math.random() - 0.5;
    base[i * 3 + 1] = Math.random() - 0.5;
    base[i * 3 + 2] = -6 + Math.random() * 9;
    kind[i] = isDust ? 1 : 0;
    seed[i] = Math.random();
    // Les grosses bulles montent plus vite, comme dans une flûte
    const s = isDust ? 2 + Math.random() * 5 : 5 + Math.pow(Math.random(), 3) * 21;
    size[i] = s;
    speed[i] = isDust ? 0.05 + Math.random() * 0.12 : 0.12 + (s / 26) * 0.55 + Math.random() * 0.1;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aBase', new BufferAttribute(base, 3));
  geometry.setAttribute('aSpeed', new BufferAttribute(speed, 1));
  geometry.setAttribute('aSize', new BufferAttribute(size, 1));
  geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));
  geometry.setAttribute('aKind', new BufferAttribute(kind, 1));

  const uniforms = {
    uTime: { value: 12 },
    uScroll: { value: 0 },
    uArea: { value: new Vector2(10, 10) },
    uMouse: { value: new Vector2(99, 99) },
    uForce: { value: 0 },
    uPixelRatio: { value: dpr },
    uOpacity: { value: 0 },
    uGoldA: { value: new Color('#C9A24B') },
    uGoldB: { value: new Color('#FFF1C1') },
  };

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  // Taille
  let viewW = 10;
  let viewH = 10;
  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    viewW = viewH * camera.aspect;
    uniforms.uArea.value.set(viewW * 1.5, viewH * 1.4);
    if (!running) renderer.render(scene, camera);
  };

  // Souris
  const mouse = { x: 99, y: 99, tx: 99, ty: 99, force: 0, targetForce: 0 };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    mouse.tx = (nx * viewW) / 2;
    mouse.ty = (ny * viewH) / 2;
    if (mouse.x > 50) {
      mouse.x = mouse.tx;
      mouse.y = mouse.ty;
    }
    mouse.targetForce = 1;
  };
  if (!reduced) {
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => (mouse.targetForce = 0));
  }

  // Boucle de rendu (en pause hors écran)
  let running = false;
  let visible = true;
  let last = performance.now();
  const tick = (now) => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    uniforms.uTime.value += dt;
    uniforms.uScroll.value = (window.scrollY / window.innerHeight) * 1.2;
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    mouse.force += (mouse.targetForce - mouse.force) * 0.05;
    mouse.targetForce *= 0.985;
    uniforms.uMouse.value.set(mouse.x, mouse.y);
    uniforms.uForce.value = mouse.force;
    const camTarget = mouse.tx < 50 ? (mouse.tx / viewW) * 0.8 : 0;
    camera.position.x += (camTarget - camera.position.x) * 0.03;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  const start = () => {
    if (running || reduced || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  };
  const stop = () => (running = false);

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('resize', resize);
  resize();

  return {
    reveal() {
      if (reduced) {
        uniforms.uOpacity.value = 0.9;
        renderer.render(scene, camera);
        return;
      }
      gsap.to(uniforms.uOpacity, { value: 1, duration: 2.4, ease: 'power2.out' });
      start();
    },
  };
}
