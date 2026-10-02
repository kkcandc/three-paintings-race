import './gallery.css';
import { createStarry } from './scenes/starry.js';
import { createMemory } from './scenes/memory.js';
import { createPoppies } from './scenes/poppies.js';

const factories = {
  starry: createStarry,
  memory: createMemory,
  poppies: createPoppies,
};

const lanesRoot = document.querySelector('#lanes');
const buttons = [...document.querySelectorAll('.modes button')];
const lanes = [...document.querySelectorAll('.lane')].map((section) => {
  const id = section.dataset.lane;
  const canvas = section.querySelector('canvas');
  let api = null;
  try {
    api = factories[id](canvas);
  } catch (error) {
    console.error(error);
    canvas.insertAdjacentHTML('afterend', '<p class="fail">This study could not start.</p>');
  }
  return { id, section, api };
});

function modeFromHash() {
  const hash = location.hash.replace('#', '');
  if (hash === 'night' || hash === 'starry') return 'starry';
  if (hash === 'hours' || hash === 'memory') return 'memory';
  if (hash === 'field' || hash === 'poppies') return 'poppies';
  return 'all';
}

function applyMode(mode) {
  lanesRoot.dataset.mode = mode;
  for (const lane of lanes) {
    const active = mode === 'all' || mode === lane.id;
    lane.section.hidden = !active;
    lane.api?.setPaused(!active);
  }
  for (const button of buttons) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  }
}

for (const button of buttons) {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode;
    const hash = mode === 'all' ? '#all' : `#${mode === 'starry' ? 'night' : mode === 'memory' ? 'hours' : 'field'}`;
    history.replaceState(null, '', hash);
    applyMode(mode);
  });
}

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey || event.altKey) return;
  const next = { 0: 'all', 1: 'starry', 2: 'memory', 3: 'poppies', Escape: 'all' }[event.key];
  if (!next) return;
  history.replaceState(null, '', next === 'all' ? '#all' : `#${next === 'starry' ? 'night' : next === 'memory' ? 'hours' : 'field'}`);
  applyMode(next);
});

applyMode(modeFromHash());

window.addEventListener('pagehide', () => {
  for (const lane of lanes) lane.api?.destroy();
});
