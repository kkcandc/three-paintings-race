import * as THREE from 'three';
import { bindStage, disposeScene, startLoop, trackPointer } from '../lib/stage.js';

const VERT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vUv = uv;
  vec3 pos = position;
  float h = fbm(uv * 3.2 + vec2(uTime * 0.015, 0.0));
  pos.z += (h - 0.45) * 0.085;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uPointer;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 lin(vec3 c) {
  return pow(max(c, vec3(0.0)), vec3(2.2));
}

float hillBack(float x) {
  return 0.34
    + 0.045 * sin(x * 8.5 + 0.4)
    + 0.02 * sin(x * 21.0);
}

float hillFront(float x) {
  return 0.20
    + 0.055 * sin(x * 6.2)
    + 0.028 * sin(x * 14.0 + 1.3)
    + 0.012 * sin(x * 30.0);
}

float sdBox(vec2 p, vec2 s) {
  vec2 d = abs(p) - s;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

vec2 starAt(int i) {
  if (i == 0) return vec2(0.34, 0.90);
  if (i == 1) return vec2(0.48, 0.80);
  if (i == 2) return vec2(0.61, 0.90);
  if (i == 3) return vec2(0.70, 0.64);
  if (i == 4) return vec2(0.90, 0.84);
  if (i == 5) return vec2(0.42, 0.68);
  if (i == 6) return vec2(0.57, 0.56);
  if (i == 7) return vec2(0.30, 0.58);
  if (i == 8) return vec2(0.83, 0.55);
  if (i == 9) return vec2(0.52, 0.95);
  return vec2(0.22, 0.78);
}

float cypress(vec2 uv) {
  float y = uv.y;
  float cx = 0.145 + sin(y * 4.2) * 0.012 + y * 0.03;
  float width = 0.018 + 0.095 * pow(max(sin(clamp(y * 1.05, 0.0, 3.14159)), 0.0), 0.72);
  width *= smoothstep(-0.02, 0.06, y);
  width *= smoothstep(1.05, 0.62, y);
  width += sin(y * 36.0 + uTime * 0.6) * 0.006;
  width += sin(y * 15.0 - 0.7) * 0.01;
  float d = abs(uv.x - cx) - width;
  float tip = length(vec2((uv.x - cx) * 1.3, (y - 0.93) * 0.55)) - 0.045;
  return min(d, tip);
}

void main() {
  vec2 uv = vUv;
  float t = uTime;

  vec2 c1 = vec2(0.56, 0.64) + uPointer * 0.025;
  vec2 c2 = vec2(0.30, 0.74);
  vec2 c3 = vec2(0.78, 0.48);

  vec2 q = uv;
  float spiral = 0.0;
  vec2 d1 = q - c1;
  float r1 = length(d1) + 1e-4;
  float a1 = atan(d1.y, d1.x);
  float pull1 = exp(-r1 * 2.4) * 1.35;
  float spin1 = a1 + pull1 + t * 0.12 * exp(-r1);
  q = c1 + vec2(cos(spin1), sin(spin1)) * r1 * (1.0 - 0.04 * pull1);
  spiral += (sin(a1 * 2.0 - r1 * 18.0 + t * 0.35) * 0.5 + 0.5) * exp(-r1 * 1.6);

  vec2 d2 = q - c2;
  float r2 = length(d2) + 1e-4;
  float a2 = atan(d2.y, d2.x);
  float pull2 = exp(-r2 * 2.4) * 0.75;
  float spin2 = a2 + pull2 + t * 0.09 * exp(-r2);
  q = c2 + vec2(cos(spin2), sin(spin2)) * r2 * (1.0 - 0.04 * pull2);
  spiral += (sin(a2 * 2.0 - r2 * 24.0 + t * 0.35) * 0.5 + 0.5) * exp(-r2 * 2.4);

  vec2 d3 = q - c3;
  float r3 = length(d3) + 1e-4;
  float a3 = atan(d3.y, d3.x);
  float pull3 = exp(-r3 * 2.4) * 0.7;
  float spin3 = a3 + pull3 + t * 0.06 * exp(-r3);
  q = c3 + vec2(cos(spin3), sin(spin3)) * r3 * (1.0 - 0.04 * pull3);
  spiral += (sin(a3 * 3.0 - r3 * 30.0 + t * 0.35) * 0.5 + 0.5) * exp(-r3 * 2.4);

  vec2 warped = q + vec2(
    fbm(uv * 2.2 + vec2(t * 0.03, 1.2)),
    fbm(uv * 2.2 + vec2(4.0, -t * 0.02))
  ) * 0.08;

  float field = fbm(warped * 3.1);
  float ribbons = sin(field * 16.0 + spiral * 5.5 - t * 0.45);
  float band = ribbons * 0.5 + 0.5;

  vec3 deep = lin(vec3(0.035, 0.07, 0.20));
  vec3 cobalt = lin(vec3(0.11, 0.27, 0.62));
  vec3 sky = lin(vec3(0.36, 0.58, 0.78));
  vec3 cream = lin(vec3(0.93, 0.88, 0.62));
  vec3 yolk = lin(vec3(0.98, 0.86, 0.42));

  vec3 col = mix(deep, cobalt, smoothstep(0.05, 0.55, band));
  col = mix(col, sky, smoothstep(0.48, 0.82, band) * (0.35 + 0.65 * field));
  float crest = smoothstep(0.78, 1.0, band);
  col = mix(col, cream, crest * (0.25 + 0.75 * spiral));
  col = mix(col, yolk, crest * spiral * 0.35);

  float skyLift = smoothstep(0.25, 0.95, uv.y);
  col = mix(lin(vec3(0.05, 0.10, 0.28)), col, 0.35 + 0.65 * skyLift);

  vec2 moonC = vec2(0.80, 0.78) + vec2(uPointer.x, -uPointer.y) * 0.01;
  vec2 md = uv - moonC;
  float mr = length(md);
  float moonDisk = smoothstep(0.072, 0.064, mr);
  float bite = smoothstep(0.058, 0.066, length(md - vec2(0.034, 0.008)));
  float moon = moonDisk * bite;
  col = mix(col, lin(vec3(0.97, 0.95, 0.82)), moon);
  float halo = exp(-abs(mr - 0.09) * 70.0) + exp(-abs(mr - 0.125) * 42.0) * 0.7 + exp(-abs(mr - 0.17) * 24.0) * 0.4;
  col = mix(col, lin(vec3(0.86, 0.84, 0.58)), clamp(halo, 0.0, 1.0) * 0.8);
  col += yolk * exp(-mr * 10.0) * 0.18;

  for (int i = 0; i < 11; i++) {
    vec2 sc = starAt(i);
    vec2 d = uv - sc;
    d.x *= 1.05;
    float r = length(d);
    float a = atan(d.y, d.x);
    float tw = 0.78 + 0.22 * sin(t * 1.7 + float(i) * 1.9);
    float ray = pow(0.5 + 0.5 * cos(a * (i == 2 || i == 4 ? 10.0 : 16.0)), 8.0);
    float glow = exp(-r * 48.0) + exp(-r * 12.0) * 0.5 + ray * exp(-r * 18.0) * 0.9;
    col += lin(vec3(1.0, 0.93, 0.62)) * glow * tw * 0.85;
  }

  float hb = hillBack(uv.x);
  float hf = hillFront(uv.x);
  float back = smoothstep(0.012, -0.004, uv.y - hb);
  float front = smoothstep(0.01, -0.004, uv.y - hf);
  float contourB = 0.5 + 0.5 * sin(uv.y * 90.0 + sin(uv.x * 18.0) * 3.0 + field * 4.0);
  float contourF = 0.5 + 0.5 * sin(uv.y * 70.0 - uv.x * 16.0);
  vec3 backCol = mix(lin(vec3(0.10, 0.28, 0.42)), lin(vec3(0.45, 0.62, 0.38)), contourB * smoothstep(0.25, 0.7, uv.x));
  vec3 frontCol = mix(lin(vec3(0.06, 0.16, 0.28)), lin(vec3(0.16, 0.32, 0.36)), contourF);
  col = mix(col, backCol, back * 0.96);
  col = mix(col, frontCol, front);

  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float hx = 0.33 + fi * 0.048;
    float ground = hillFront(hx) + 0.012;
    float tall = (i == 3) ? 0.075 : 0.04 + hash(vec2(fi, 2.0)) * 0.02;
    float wide = (i == 3) ? 0.028 : 0.02;
    vec2 c = vec2(hx, ground + tall * 0.5);
    float wall = smoothstep(0.003, 0.0, sdBox(uv - c, vec2(wide, tall * 0.5)));
    vec3 wallCol = (i == 3) ? lin(vec3(0.16, 0.22, 0.36)) : lin(vec3(0.10, 0.13, 0.22));
    col = mix(col, wallCol, wall * front);
    vec2 roofA = vec2(hx - wide - 0.008, ground + tall);
    vec2 roofB = vec2(hx + wide + 0.008, ground + tall);
    vec2 roofC = vec2(hx, ground + tall + (i == 3 ? 0.055 : 0.03));
    vec2 v0 = roofC - roofA;
    vec2 v1 = roofB - roofA;
    vec2 v2 = uv - roofA;
    float dot00 = dot(v0, v0);
    float dot01 = dot(v0, v1);
    float dot02 = dot(v0, v2);
    float dot11 = dot(v1, v1);
    float dot12 = dot(v1, v2);
    float inv = 1.0 / (dot00 * dot11 - dot01 * dot01 + 1e-5);
    float bu = (dot11 * dot02 - dot01 * dot12) * inv;
    float bv = (dot00 * dot12 - dot01 * dot02) * inv;
    float roof = (bu >= 0.0 && bv >= 0.0 && (bu + bv) < 1.0) ? 1.0 : 0.0;
    col = mix(col, lin(vec3(0.13, 0.18, 0.32)), roof * front);
    if (i == 3) {
      float spire = smoothstep(0.0025, 0.0, sdBox(uv - vec2(hx, ground + tall + 0.07), vec2(0.006, 0.055)));
      col = mix(col, lin(vec3(0.20, 0.28, 0.42)), spire);
    }
    vec2 w1 = vec2(hx - wide * 0.38, ground + tall * 0.48);
    vec2 w2 = vec2(hx + wide * 0.38, ground + tall * 0.42);
    float win = smoothstep(0.002, 0.0, sdBox(uv - w1, vec2(0.006, 0.008)));
    win += smoothstep(0.002, 0.0, sdBox(uv - w2, vec2(0.005, 0.007)));
    float flicker = 0.75 + 0.25 * sin(t * 2.4 + fi);
    col += lin(vec3(1.0, 0.78, 0.35)) * win * flicker * 0.9;
    col += lin(vec3(1.0, 0.72, 0.28)) * exp(-length((uv - w1) * vec2(1.0, 1.4)) * 55.0) * 0.35;
  }

  float cy = cypress(uv + vec2(uPointer.x * 0.012, 0.0));
  float inside = smoothstep(0.008, -0.01, cy);
  float rim = smoothstep(0.02, 0.0, abs(cy));
  float tongue = 0.5 + 0.5 * sin(uv.y * 46.0 + uv.x * 12.0 + t * 0.4);
  vec3 cyp = mix(lin(vec3(0.015, 0.06, 0.045)), lin(vec3(0.05, 0.16, 0.11)), tongue);
  col = mix(col, cyp, inside);
  col = mix(col, lin(vec3(0.18, 0.36, 0.28)), rim * (1.0 - inside) * 0.9);

  float h0 = fbm(uv * 3.2);
  float hx = fbm(uv * 3.2 + vec2(0.004, 0.0));
  float hy = fbm(uv * 3.2 + vec2(0.0, 0.004));
  vec3 normal = normalize(vec3(h0 - hx, h0 - hy, 0.028));
  vec3 lightDir = normalize(vec3(-0.45 + uPointer.x * 0.8, 0.35 - uPointer.y * 0.5, 0.85));
  float diff = clamp(dot(normal, lightDir), 0.0, 1.0);
  float spec = pow(clamp(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 16.0);
  float paintMask = 1.0 - inside * 0.65;
  col *= 0.78 + 0.4 * diff * paintMask;
  col += lin(vec3(1.0, 0.95, 0.82)) * spec * paintMask * 0.22;

  float weave = sin(uv.x * 740.0) * sin(uv.y * 740.0);
  col *= 0.965 + 0.035 * weave;

  vec2 p = uv * 2.0 - 1.0;
  float vig = smoothstep(1.25, 0.25, length(p * vec2(0.85, 1.0)));
  col *= mix(0.72, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export function createStarry(canvas) {
  const container = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x071426, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
  camera.position.z = 2.15;

  const geometry = new THREE.PlaneGeometry(1, 1, 160, 100);
  const uniforms = {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    toneMapped: false,
  });
  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  const moteGeo = new THREE.BufferGeometry();
  const moteCount = 80;
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePos[i * 3] = (Math.random() - 0.5) * 2.4;
    motePos[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
    motePos[i * 3 + 2] = 0.08 + Math.random() * 0.35;
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({ color: 0xf4e7b0, size: 0.012, transparent: true, opacity: 0.7, depthWrite: false }),
  );
  scene.add(motes);

  const pointer = trackPointer(container);
  const unbind = bindStage(container, camera, renderer, () => {
    const dist = camera.position.z - plane.position.z;
    const height = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
    const width = height * camera.aspect;
    plane.scale.set(width * 1.08, height * 1.08, 1);
  });

  const loop = startLoop((time) => {
    pointer.update();
    uniforms.uTime.value = time;
    uniforms.uPointer.value.set(pointer.pointer.x, pointer.pointer.y);
    plane.rotation.y = pointer.pointer.x * 0.045;
    plane.rotation.x = pointer.pointer.y * 0.03;
    motes.rotation.z = time * 0.01;
    renderer.render(scene, camera);
  });

  return {
    setPaused(paused) {
      loop.pause(paused);
    },
    destroy() {
      loop.stop();
      pointer.dispose();
      unbind();
      disposeScene(scene, renderer);
    },
  };
}
