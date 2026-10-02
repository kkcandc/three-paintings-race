import '../study.css';
import { createStarry } from '../scenes/starry.js';

const study = createStarry(document.querySelector('canvas'));
window.addEventListener('pagehide', () => study.destroy());
