import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { bindStage, disposeScene, startLoop, trackPointer } from '../lib/stage.js';

function clockTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, 512, 512);
  g.beginPath();
  g.arc(256, 256, 248, 0, Math.PI * 2);
  g.fillStyle = '#c9843a';
  g.fill();
  g.beginPath();
  g.arc(256, 256, 214, 0, Math.PI * 2);
  const face = g.createRadialGradient(230, 220, 20, 256, 256, 214);
  face.addColorStop(0, '#f3e6c4');
  face.addColorStop(1, '#e4cc96');
  g.fillStyle = face;
  g.fill();
  g.strokeStyle = '#5c3d1e';
  g.lineWidth = 10;
  g.stroke();

  g.save();
  g.translate(256, 256);
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    g.rotate(Math.PI / 30);
    g.fillStyle = '#3a2916';
    g.fillRect(-1.5, major ? -198 : -190, major ? 3 : 2, major ? 18 : 8);
  }
  g.restore();

  const romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  g.fillStyle = '#3a2916';
  g.font = '600 46px "Times New Roman", Times, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  romans.forEach((label, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.fillText(label, 256 + Math.cos(a) * 158, 256 + Math.sin(a) * 158);
  });

  g.beginPath();
  g.arc(256, 256, 8, 0, Math.PI * 2);
  g.fillStyle = '#2a1c10';
  g.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function meltDisk(radius, hang, fold) {
  const geo = new THREE.CircleGeometry(radius, 72);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y < fold) {
      const t = Math.min(1.35, (fold - y) / radius);
      const drip = t * t * hang;
      const pinch = 1 - t * 0.38;
      pos.setXYZ(
        i,
        x * pinch + Math.sin(y * 7.5) * 0.035 * t,
        y - drip,
        z + drip * 0.62 + Math.cos(x * 9.0) * 0.025 * t,
      );
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function makeHand(length, width, color) {
  const geo = new THREE.BoxGeometry(width, length, 0.018);
  geo.translate(0, length / 2, 0);
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.35 }),
  );
}

function createWatch(texture, { radius = 0.72, hang = 1.05, fold = 0.02 } = {}) {
  const group = new THREE.Group();
  const face = new THREE.Mesh(
    meltDisk(radius, hang, fold),
    new THREE.MeshPhysicalMaterial({
      map: texture,
      color: '#8d5a22',
      metalness: 0.62,
      roughness: 0.42,
      clearcoat: 0.3,
      clearcoatRoughness: 0.45,
    }),
  );
  face.castShadow = true;
  face.receiveShadow = true;
  group.add(face);

  const hour = makeHand(radius * 0.46, 0.035, '#2a1c10');
  const minute = makeHand(radius * 0.68, 0.022, '#2a1c10');
  hour.position.z = 0.03;
  minute.position.z = 0.045;
  hour.castShadow = true;
  minute.castShadow = true;
  group.add(hour, minute);
  group.userData.hands = { hour, minute, offset: Math.random() * Math.PI * 2 };
  return group;
}

function shadowDisc() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, 'rgba(90, 55, 20, 0.55)');
  grad.addColorStop(1, 'rgba(90, 55, 20, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function buildSleeper() {
  const geo = new THREE.IcosahedronGeometry(1, 18);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1;
    r += Math.sin(v.x * 3.1 + v.y * 2.0) * 0.07;
    r += Math.cos(v.z * 2.6 + v.y) * 0.05;
    if (v.y < -0.15) r *= 0.82 + v.y * 0.15;
    const nose = Math.exp(
      -((v.x - 0.62) ** 2) / 0.02 - ((v.y - 0.05) ** 2) / 0.04 - ((v.z - 0.62) ** 2) / 0.05,
    );
    r += nose * 0.34;
    const eye = Math.exp(
      -((v.x - 0.12) ** 2) / 0.012 - ((v.y - 0.28) ** 2) / 0.01 - ((v.z - 0.78) ** 2) / 0.02,
    );
    r -= eye * 0.16;
    v.multiplyScalar(r);
    v.y *= 0.74;
    v.x *= 1.18;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color: '#f0c0aa',
      roughness: 0.68,
      metalness: 0.02,
      sheen: 0.7,
      sheenColor: new THREE.Color('#ffd8c8'),
      sheenRoughness: 0.55,
    }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function ant() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#1a120c', roughness: 0.45, metalness: 0.15 });
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat);
  abdomen.scale.z = 1.4;
  abdomen.position.z = -0.03;
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat);
  thorax.position.z = 0.03;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), mat);
  head.position.z = 0.07;
  group.add(abdomen, thorax, head);
  return group;
}

export function createMemory(canvas) {
  const container = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xd7e6ea, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcbb89a, 12, 26);
  scene.background = new THREE.Color(0xd5e6ea);
  scene.environmentIntensity = 0.22;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  camera.position.set(2.7, 1.55, 3.7);

  const hemi = new THREE.HemisphereLight(0xf3ead8, 0x6d4a2c, 0.16);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d4, 1.85);
  sun.position.set(-7.5, 9.5, 6.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 28;
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(42, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec3 vPos;
        uniform float uTime;
        vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
        void main(){
          vec3 n = normalize(vPos);
          float h = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(lin(vec3(0.96, 0.86, 0.70)), lin(vec3(0.62, 0.80, 0.84)), smoothstep(0.0, 0.55, h));
          col = mix(col, lin(vec3(0.78, 0.88, 0.90)), smoothstep(0.45, 1.0, h));
          float cloud = sin(n.x * 8.0 + uTime * 0.05) * sin(n.z * 6.0);
          col = mix(col, lin(vec3(0.98, 0.96, 0.93)), smoothstep(0.35, 0.9, cloud) * smoothstep(0.15, 0.5, h) * 0.35);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    }),
  );
  scene.add(sky);

  const groundGeo = new THREE.PlaneGeometry(48, 48, 90, 90);
  const gp = groundGeo.attributes.position;
  const colors = new Float32Array(gp.count * 3);
  const sand = new THREE.Color('#d7b56a');
  const wet = new THREE.Color('#b7cbb8');
  const deep = new THREE.Color('#7fa8aa');
  const tint = new THREE.Color();
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    const y = gp.getY(i);
    const dune = Math.sin(x * 0.28) * 0.16 + Math.cos(y * 0.18) * 0.12 + Math.sin((x + y) * 0.11) * 0.08;
    const shore = THREE.MathUtils.smoothstep(y, 4, -8);
    gp.setZ(i, dune * (1 - shore) + Math.sin(x * 1.4 + y) * 0.015 * shore);
    tint.copy(sand).lerp(wet, THREE.MathUtils.smoothstep(y, 2.5, -1)).lerp(deep, shore);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.02 }),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const platform = new THREE.Mesh(
    new RoundedBoxGeometry(2.5, 1.25, 1.65, 3, 0.08),
    new THREE.MeshStandardMaterial({ color: '#e4d0ae', roughness: 0.86, metalness: 0.02 }),
  );
  platform.position.set(1.15, 0.62, 0.05);
  platform.castShadow = true;
  platform.receiveShadow = true;
  scene.add(platform);

  const branchCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.6, 0.02, 0.85),
    new THREE.Vector3(-2.7, 0.72, 0.35),
    new THREE.Vector3(-1.85, 1.42, 0.05),
    new THREE.Vector3(-1.05, 1.2, -0.25),
    new THREE.Vector3(-0.25, 0.62, -0.05),
  ]);
  const branch = new THREE.Mesh(
    new THREE.TubeGeometry(branchCurve, 48, 0.075, 7, false),
    new THREE.MeshStandardMaterial({ color: '#6b4428', roughness: 0.82 }),
  );
  branch.castShadow = true;
  scene.add(branch);

  const twigCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.7, 1.28, 0.02),
    new THREE.Vector3(-1.35, 1.72, 0.25),
    new THREE.Vector3(-1.05, 1.85, 0.55),
  ]);
  scene.add(new THREE.Mesh(
    new THREE.TubeGeometry(twigCurve, 12, 0.03, 5, false),
    branch.material,
  ));

  const faceMap = clockTexture();
  const branchWatch = createWatch(faceMap, { radius: 0.7, hang: 1.15, fold: 0.08 });
  branchWatch.position.set(-1.72, 1.48, 0.12);
  branchWatch.rotation.set(-0.35, 0.45, 0.15);
  scene.add(branchWatch);

  const ledgeWatch = createWatch(faceMap, { radius: 0.78, hang: 1.35, fold: -0.02 });
  ledgeWatch.position.set(1.35, 1.32, 0.72);
  ledgeWatch.rotation.set(-1.05, -0.15, 0.05);
  scene.add(ledgeWatch);

  const pocket = createWatch(faceMap, { radius: 0.48, hang: 0.22, fold: -0.2 });
  pocket.position.set(-0.35, 0.16, 1.85);
  pocket.rotation.set(-1.25, 0.4, 0.2);
  scene.add(pocket);

  const sleeper = buildSleeper();
  sleeper.position.set(0.15, 0.62, -0.55);
  sleeper.rotation.set(0.15, -0.7, 0.25);
  sleeper.scale.set(1.15, 0.95, 1.05);
  scene.add(sleeper);

  const cliffMat = new THREE.MeshStandardMaterial({ color: '#d2c0a0', roughness: 0.92 });
  const cliffBlue = new THREE.MeshStandardMaterial({ color: '#8f9ea6', roughness: 0.9 });
  const cliffs = new THREE.Group();
  const specs = [
    [6.4, 1.1, -6.2, 1.4, 2.2, 1.6, cliffMat],
    [7.6, 1.6, -7.4, 1.8, 3.1, 1.5, cliffBlue],
    [5.2, 0.7, -5.2, 1.1, 1.4, 1.2, cliffMat],
    [8.5, 0.9, -5.6, 1.3, 1.7, 1.4, cliffMat],
  ];
  for (const [x, y, z, sx, sy, sz, mat] of specs) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat);
    rock.position.set(x, y, z);
    rock.scale.set(sx, sy, sz);
    rock.castShadow = true;
    rock.receiveShadow = true;
    cliffs.add(rock);
  }
  scene.add(cliffs);

  const egg = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    new THREE.MeshStandardMaterial({ color: '#f6f1e6', roughness: 0.35 }),
  );
  egg.scale.y = 1.25;
  egg.position.set(7.15, 3.15, -7.1);
  egg.castShadow = true;
  scene.add(egg);

  const ripples = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 14, 1, 1),
    new THREE.MeshPhysicalMaterial({
      color: '#7eb4b6',
      roughness: 0.12,
      metalness: 0.08,
      transparent: true,
      opacity: 0.72,
    }),
  );
  ripples.rotation.x = -Math.PI / 2;
  ripples.position.set(1.5, 0.035, -6.5);
  scene.add(ripples);

  for (const anchor of [branchWatch, ledgeWatch, pocket, platform]) {
    const blob = shadowDisc();
    blob.position.set(anchor.position.x, 0.03, anchor.position.z);
    blob.scale.set(anchor === platform ? 3.4 : 1.8, 1, anchor === platform ? 2.2 : 1.5);
    scene.add(blob);
  }

  const ants = Array.from({ length: 6 }, () => ant());
  ants.forEach((bug) => scene.add(bug));

  const dustGeo = new THREE.BufferGeometry();
  const dustCount = 140;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 10;
    dustPos[i * 3 + 1] = Math.random() * 3.5;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0xfff4dd, size: 0.025, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  scene.add(dust);

  const pointer = trackPointer(container);
  const unbind = bindStage(container, camera, renderer);
  const watches = [branchWatch, ledgeWatch, pocket];

  const loop = startLoop((time) => {
    pointer.update();
    sky.material.uniforms.uTime.value = time;
    const drift = time * 0.08;
    camera.position.x = 2.7 + Math.sin(drift) * 0.18 + pointer.pointer.x * 0.16;
    camera.position.y = 1.55 + pointer.pointer.y * -0.08;
    camera.position.z = 3.7 + Math.cos(drift) * 0.1;
    camera.lookAt(0.35, 0.95, 0.0);

    for (const watch of watches) {
      const { hour, minute, offset } = watch.userData.hands;
      hour.rotation.z = -0.8 + Math.sin(time * 0.15 + offset) * 0.04;
      minute.rotation.z = time * 0.22 + offset;
    }

    ants.forEach((bug, i) => {
      const a = time * 0.45 + i * 1.05;
      const radius = 0.32 + (i % 3) * 0.06;
      bug.position.set(
        pocket.position.x + Math.cos(a) * radius,
        0.2 + Math.sin(a * 2.0) * 0.015,
        pocket.position.z + Math.sin(a) * radius * 0.72,
      );
      bug.lookAt(
        pocket.position.x + Math.cos(a + 0.3) * radius,
        bug.position.y,
        pocket.position.z + Math.sin(a + 0.3) * radius * 0.72,
      );
    });

    dust.position.y = Math.sin(time * 0.3) * 0.05;
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
