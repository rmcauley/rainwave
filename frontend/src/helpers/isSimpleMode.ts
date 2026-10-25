import { preferences } from '../preferences/preferences';
import { getViewportWidth } from './getViewportSize';

// taken from theme.scss
const SIMPLE_LAYOUT_BREAKPOINT = 1049;

function isSimpleMode(): boolean {
  if (getViewportWidth() <= SIMPLE_LAYOUT_BREAKPOINT) {
    return true;
  }
  return !preferences.store.powerUserMode;
}

export { isSimpleMode };
