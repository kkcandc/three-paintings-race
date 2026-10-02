import * as THREE from 'three';
import { bindStage, disposeScene, startLoop, trackPointer } from '../lib/stage.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function heightAt(x, z) {
  return (
    Math.sin(x * 0.085) * 0.55 +
    Math.cos(z * 0.07) * 0.4 +
    Math.sin((x + z) * 0.035) * 0.7
  );
}

function paintRamp() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 1;
  const g = canvas.getContext('2d');
  ['#8d8d8d', '#b5b5b5', '#dedede', '#ffffff'].forEach((color, i) => {
    g.fillStyle = color;
    g.fillRect(i, 0, 1, 1);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function petalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.16, 0.04, 0.2, 0.22, 0.0, 0.42);
  shape.bezierCurveTo(-0.2, 0.22, -0.16, 0.04, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setZ(i, -y * y * 0.85);
  }
  geo.computeVertexNormals();
  return geo;
}

function windMaterial(base, timeUniform, amount) {
  base.customProgramCacheKey = () => `wind-${amount}`;
  base.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform;
    shader.uniforms.uAmount = { value: amount };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime;\nuniform float uAmount;\n',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float h = clamp(transformed.y, 0.0, 3.0);
        float gust = sin(uTime * 1.35 + ip.x * 0.37 + ip.z * 0.21);
        transformed.x += gust * uAmount * h;
        transformed.z += cos(uTime * 1.1 + ip.z * 0.33) * uAmount * 0.65 * h;`,
      );
  };
  return base;
}

function skyMaterial(timeUniform) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: timeUniform },
    vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
    fragmentShader: /* glsl */ `
      varying vec3 vPos;
      uniform float uTime;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y);
      }
      float fbm(vec2 p){
        float v=0.0; float a=0.5;
        for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.05+3.1; a*=0.5; }
        return v;
      }
      vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
      void main(){
        vec3 n = normalize(vPos);
        float h = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(lin(vec3(0.86, 0.93, 0.98)), lin(vec3(0.18, 0.46, 0.86)), smoothstep(0.0, 0.72, h));
        vec2 uv = n.xz / max(0.15, n.y + 0.35);
        float clouds = fbm(uv * 1.4 + vec2(uTime * 0.015, 0.0));
        clouds = smoothstep(0.58, 0.88, clouds);
        float strokes = 0.5 + 0.5 * sin((uv.x + uv.y) * 28.0 + clouds * 6.0);
        vec3 cloudCol = mix(lin(vec3(0.99, 0.97, 0.93)), lin(vec3(0.93, 0.90, 0.84)), strokes);
        col = mix(col, cloudCol, clouds * smoothstep(0.05, 0.4, h));
        vec2 sun = n.xz - vec2(-0.25, -0.12);
        float sd = length(sun);
        col += lin(vec3(1.0, 0.86, 0.55)) * exp(-sd * 10.0) * 0.9;
        col += lin(vec3(1.0, 0.92, 0.75)) * exp(-sd * 2.2) * 0.25;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

export function createPoppies(canvas) {
  const container = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x3d7ec4, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x9ec8ee, 22, 70);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 180);
  camera.position.set(0.2, 1.55, 9.4);

  const timeUniform = { value: 0 };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(90, 32, 20), skyMaterial(timeUniform)));

  const hemi = new THREE.HemisphereLight(0xe7f4ff, 0x6d8a3c, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d2, 2.4);
  sun.position.set(-18, 22, -8);
  scene.add(sun);

  const rand = mulberry32(1889);
  const groundGeo = new THREE.PlaneGeometry(90, 90, 80, 80);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  const gColors = new Float32Array(gp.count * 3);
  const palette = ['#c5d07a', '#7ea24a', '#e4d48a', '#4f7a38', '#d8d2a4', '#68883c'].map((hex) => new THREE.Color(hex));
  const tint = new THREE.Color();
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    const z = gp.getZ(i);
    const y = heightAt(x, z);
    gp.setY(i, y);
    tint.copy(palette[Math.floor(rand() * palette.length)]);
    if (Math.abs(x - Math.sin(z * 0.15) * 1.4) < 1.15) tint.lerp(new THREE.Color('#efe2b8'), 0.55);
    gColors[i * 3] = tint.r;
    gColors[i * 3 + 1] = tint.g;
    gColors[i * 3 + 2] = tint.b;
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(gColors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const ramp = paintRamp();
  const reds = ['#e23b32', '#c4171c', '#ff5d3c', '#9f1418', '#d24a38', '#f18462'].map((h) => new THREE.Color(h));
  const greens = ['#3f6b34', '#6d8f3c', '#234824', '#8aaa48'].map((h) => new THREE.Color(h));

  const flowerCount = 780;
  const flowers = [];
  for (let i = 0; i < flowerCount; i++) {
    const foreground = i < 280;
    const x = foreground ? (rand() - 0.5) * 15 : (rand() - 0.5) * 52;
    const z = foreground ? 0.2 + rand() * 5.4 : -22 + rand() * 20;
    const stem = foreground ? 0.85 + rand() * 0.7 : 0.5 + rand() * 0.7;
    flowers.push({
      x,
      y: heightAt(x, z),
      z,
      stem,
      petals: rand() > 0.18 ? 5 : 4,
      yaw: rand() * Math.PI * 2,
      tilt: foreground ? 0.55 + rand() * 0.4 : 0.35 + rand() * 0.4,
      scale: foreground ? 1.35 + rand() * 0.85 : 0.6 + rand() * 0.7,
      color: reds[Math.floor(rand() * reds.length)],
    });
  }
  flowers.sort((a, b) => a.z - b.z);

  let petalInstances = 0;
  for (const flower of flowers) petalInstances += flower.petals;

  const petalMat = windMaterial(
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    timeUniform,
    0.22,
  );
  const petals = new THREE.InstancedMesh(petalGeometry(), petalMat, petalInstances);
  petals.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(petalInstances * 3), 3);
  petals.frustumCulled = false;

  const stemGeo = new THREE.CylinderGeometry(0.012, 0.016, 1, 5);
  stemGeo.translate(0, 0.5, 0);
  const stemMat = windMaterial(new THREE.MeshBasicMaterial(), timeUniform, 0.18);
  const stems = new THREE.InstancedMesh(stemGeo, stemMat, flowerCount);
  stems.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(flowerCount * 3), 3);
  stems.frustumCulled = false;

  const centerGeo = new THREE.SphereGeometry(0.055, 8, 6);
  const centers = new THREE.InstancedMesh(
    centerGeo,
    new THREE.MeshLambertMaterial({ color: '#24160f' }),
    flowerCount,
  );
  centers.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let petalIndex = 0;
  flowers.forEach((flower, i) => {
    dummy.position.set(flower.x, flower.y, flower.z);
    dummy.scale.set(1, flower.stem, 1);
    dummy.rotation.set(0, flower.yaw, 0);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
    color.copy(greens[i % greens.length]);
    stems.setColorAt(i, color);

    dummy.position.set(flower.x, flower.y + flower.stem, flower.z);
    dummy.scale.setScalar(flower.scale * 0.7);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    centers.setMatrixAt(i, dummy.matrix);

    for (let k = 0; k < flower.petals; k++) {
      const angle = flower.yaw + (k / flower.petals) * Math.PI * 2;
      dummy.position.set(flower.x, flower.y + flower.stem, flower.z);
      dummy.scale.setScalar(flower.scale);
      dummy.rotation.set(0, 0, 0);
      const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      const qTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -flower.tilt);
      dummy.quaternion.copy(qYaw.multiply(qTilt));
      dummy.updateMatrix();
      petals.setMatrixAt(petalIndex, dummy.matrix);
      petals.setColorAt(petalIndex, flower.color);
      petalIndex += 1;
    }
  });
  scene.add(stems, petals, centers);

  const grassCount = 7000;
  const blade = new THREE.PlaneGeometry(0.08, 0.62);
  blade.translate(0, 0.31, 0);
  const grassMat = windMaterial(
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    timeUniform,
    0.28,
  );
  const grass = new THREE.InstancedMesh(blade, grassMat, grassCount);
  grass.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(grassCount * 3), 3);
  grass.frustumCulled = false;
  const grassColors = ['#6e8f38', '#b7c56a', '#4e7a34', '#d5d39a', '#8aaa4e', '#355e30'].map((h) => new THREE.Color(h));
  for (let i = 0; i < grassCount; i++) {
    const x = (rand() - 0.5) * 70;
    const z = (rand() - 0.42) * 70;
    dummy.position.set(x, heightAt(x, z), z);
    dummy.scale.set(0.7 + rand(), 0.45 + rand() * 1.1, 1);
    dummy.rotation.set((rand() - 0.5) * 0.4, rand() * Math.PI, 0);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    grass.setColorAt(i, grassColors[Math.floor(rand() * grassColors.length)]);
  }
  scene.add(grass);

  const dabCount = 1800;
  const dabGeo = new THREE.CircleGeometry(0.16, 6);
  const dabMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const dabs = new THREE.InstancedMesh(dabGeo, dabMat, dabCount);
  dabs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(dabCount * 3), 3);
  dabs.frustumCulled = false;
  const dabColors = ['#e23b32', '#f4f7ef', '#6ea0d8', '#e7d56a', '#c8171d', '#f7f3ea'].map((h) => new THREE.Color(h));
  for (let i = 0; i < dabCount; i++) {
    const x = (rand() - 0.5) * 60;
    const z = (rand() - 0.4) * 55;
    dummy.position.set(x, heightAt(x, z) + 0.03, z);
    dummy.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.3, rand() * 6, rand());
    const s = 0.35 + rand() * 1.4;
    dummy.scale.set(s, s * (0.55 + rand() * 0.5), 1);
    dummy.updateMatrix();
    dabs.setMatrixAt(i, dummy.matrix);
    dabs.setColorAt(i, dabColors[Math.floor(rand() * dabColors.length)]);
  }
  scene.add(dabs);

  const treeMat = new THREE.MeshLambertMaterial({ color: '#3e6a40' });
  const treeGeo = new THREE.IcosahedronGeometry(1, 1);
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, 28);
  trees.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(28 * 3), 3);
  trees.frustumCulled = false;
  const treeCols = ['#2f5b38', '#4d7a42', '#6e9450', '#234830'].map((h) => new THREE.Color(h));
  for (let i = 0; i < 28; i++) {
    const x = -28 + (i % 14) * 4.2 + rand();
    const z = -24 - rand() * 6;
    dummy.position.set(x, heightAt(x, z) + 1.4, z);
    dummy.rotation.set(0, rand() * 3, 0);
    dummy.scale.set(1.4 + rand(), 1.1 + rand() * 0.8, 1.3);
    dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
    trees.setColorAt(i, treeCols[i % treeCols.length]);
  }
  scene.add(trees);

  const figure = new THREE.Group();
  const dress = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.7, 8),
    new THREE.MeshToonMaterial({ color: '#22304e', gradientMap: ramp }),
  );
  dress.position.y = 0.4;
  const bodice = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.1, 0.28, 4, 8),
    new THREE.MeshToonMaterial({ color: '#f4f1ea', gradientMap: ramp }),
  );
  bodice.position.y = 0.95;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 10),
    new THREE.MeshToonMaterial({ color: '#e6b898', gradientMap: ramp }),
  );
  head.position.y = 1.28;
  const parasol = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 16),
    new THREE.MeshToonMaterial({ color: '#f7f4ec', side: THREE.DoubleSide, gradientMap: ramp }),
  );
  parasol.position.set(0.18, 1.55, 0);
  parasol.rotation.z = 0.4;
  parasol.rotation.x = 0.3;
  figure.add(dress, bodice, head, parasol);
  const child = figure.clone();
  child.scale.setScalar(0.62);
  child.position.x = 0.7;
  scene.add(figure, child);

  const butterflies = Array.from({ length: 10 }, () => {
    const wing = new THREE.Mesh(
      new THREE.CircleGeometry(0.08, 6),
      new THREE.MeshBasicMaterial({ color: iColor(rand), side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
    );
    const bug = new THREE.Group();
    const left = wing;
    const right = wing.clone();
    left.position.x = -0.06;
    right.position.x = 0.06;
    bug.add(left, right);
    bug.userData.base = new THREE.Vector3((rand() - 0.5) * 16, 1.2 + rand() * 1.4, (rand() - 0.5) * 12);
    bug.userData.phase = rand() * Math.PI * 2;
    scene.add(bug);
    return bug;
  });

  const falling = new THREE.InstancedMesh(
    petalGeometry(),
    new THREE.MeshBasicMaterial({ color: '#e23b32', side: THREE.DoubleSide }),
    36,
  );
  falling.frustumCulled = false;
  scene.add(falling);

  const pointer = trackPointer(container);
  const unbind = bindStage(container, camera, renderer);

  const loop = startLoop((time) => {
    pointer.update();
    timeUniform.value = time;
    const bob = Math.sin(time * 0.25);
    camera.position.x = 0.1 + pointer.pointer.x * 0.7 + Math.sin(time * 0.12) * 0.2;
    camera.position.y = 1.5 + bob * 0.05 + pointer.pointer.y * -0.12;
    camera.position.z = 9.3 + Math.sin(time * 0.08) * 0.15;
    camera.lookAt(pointer.pointer.x * 0.6, 1.7, -6);

    const walk = Math.sin(time * 0.35) * 2.2;
    const px = -1.5 + walk;
    const pz = 1.2;
    figure.position.set(px, heightAt(px, pz), pz);
    figure.rotation.y = Math.cos(time * 0.35) > 0 ? 0.4 : -2.6;
    const cx = px + 0.75;
    child.position.set(cx, heightAt(cx, pz + 0.1), pz + 0.1);

    butterflies.forEach((bug) => {
      const p = bug.userData.phase;
      bug.position.set(
        bug.userData.base.x + Math.sin(time * 0.7 + p) * 1.4,
        bug.userData.base.y + Math.sin(time * 1.8 + p) * 0.25,
        bug.userData.base.z + Math.cos(time * 0.55 + p) * 1.1,
      );
      const flap = Math.sin(time * 14 + p) * 0.8;
      bug.children[0].rotation.y = flap;
      bug.children[1].rotation.y = -flap;
    });

    for (let i = 0; i < 36; i++) {
      const life = (time * 0.18 + i * 0.17) % 1;
      const x = Math.sin(i * 12.3) * 8 + Math.sin(time + i) * 0.4;
      const z = 4 - life * 10;
      dummy.position.set(x, 2.4 - life * 2.2, z);
      dummy.rotation.set(time + i, time * 0.6, life * 3);
      dummy.scale.setScalar(0.35);
      dummy.updateMatrix();
      falling.setMatrixAt(i, dummy.matrix);
    }
    falling.instanceMatrix.needsUpdate = true;

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

function iColor(rand) {
  const colors = ['#f2f6fb', '#f6d98a', '#d9ecff', '#ffd0c8'];
  return colors[Math.floor(rand() * colors.length)];
}
