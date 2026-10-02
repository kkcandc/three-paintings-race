import '../study.css';
import { createMemory } from '../scenes/memory.js';

const study = createMemory(document.querySelector('canvas'));
window.addEventListener('pagehide', () => study.destroy());
