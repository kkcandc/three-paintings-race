export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function bindStage(container, camera, renderer, onResize) {
  const apply = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w < 2 || h < 2) return;
    const cap = container.dataset.density === 'full' ? 1.75 : 1.35;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    renderer.setSize(w, h, false);
    if (camera.isPerspectiveCamera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    onResize?.(w, h);
  };
  apply();
  const observer = new ResizeObserver(apply);
  observer.observe(container);
  return () => observer.disconnect();
}

export function startLoop(draw) {
  let id = 0;
  let alive = true;
  let paused = false;
  const reduced = prefersReducedMotion();
  const t0 = performance.now();

  const frame = (now) => {
    if (!alive) return;
    id = requestAnimationFrame(frame);
    if (paused || document.hidden) return;
    const elapsed = reduced ? 0 : (now - t0) / 1000;
    draw(elapsed);
  };

  id = requestAnimationFrame(frame);
  if (reduced) draw(0);

  return {
    pause(next) {
      paused = next;
    },
    stop() {
      alive = false;
      cancelAnimationFrame(id);
    },
  };
}

export function trackPointer(target) {
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (event) => {
    const rect = target.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    pointer.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.ty = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  };
  const onLeave = () => {
    pointer.tx = 0;
    pointer.ty = 0;
  };
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerleave', onLeave);
  return {
    pointer,
    update() {
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
    },
    dispose() {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerleave', onLeave);
    },
  };
}

export function disposeScene(scene, renderer) {
  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const materials = obj.material ? [].concat(obj.material) : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value && value.isTexture) value.dispose();
      }
      material.dispose();
    }
  });
  renderer.dispose();
  renderer.forceContextLoss?.();
}
