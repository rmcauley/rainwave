import { preferences } from '../preferences';

let viewportWidth = document.documentElement.clientWidth;

window.addEventListener('resize', () => (viewportWidth = document.documentElement.clientWidth));

// taken from theme.scss
const SIMPLE_LAYOUT_BREAKPOINT = 1049;

function isSimpleMode(): boolean {
  if (viewportWidth <= SIMPLE_LAYOUT_BREAKPOINT) {
    return true;
  }
  return !preferences.powerUserMode;
}

export { isSimpleMode };
