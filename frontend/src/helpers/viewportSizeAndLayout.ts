import { preferences } from '../preferences/preferences';

let viewportWidth = document.documentElement.clientWidth;
let viewportHeight = document.documentElement.clientHeight;

function updateSiteMode(): void {
  if (preferences.store.powerUserMode && viewportWidth >= 1440) {
    if (!document.body.classList.contains('power')) {
      document.body.classList.add('power');
      document.body.classList.remove('normal');
      document.body.classList.remove('narrow');
    }
  } else if (viewportWidth >= 600) {
    if (!document.body.classList.contains('normal')) {
      document.body.classList.remove('power');
      document.body.classList.add('normal');
      document.body.classList.remove('narrow');
    }
  } else {
    if (!document.body.classList.contains('narrow')) {
      document.body.classList.remove('power');
      document.body.classList.remove('normal');
      document.body.classList.add('narrow');
    }
  }
}

window.addEventListener('resize', () => {
  viewportWidth = document.documentElement.clientWidth;
  viewportHeight = document.documentElement.clientHeight;
  updateSiteMode();
});

function getViewportWidth(): number {
  return viewportWidth;
}

function getViewportHeight(): number {
  return viewportHeight;
}

function isCurrentlyPowerUserMode(): boolean {
  return document.body.classList.contains('power');
}

export { getViewportWidth, getViewportHeight, isCurrentlyPowerUserMode, updateSiteMode };
