import '../study.css';
import { createPoppies } from '../scenes/poppies.js';

const study = createPoppies(document.querySelector('canvas'));
window.addEventListener('pagehide', () => study.destroy());
