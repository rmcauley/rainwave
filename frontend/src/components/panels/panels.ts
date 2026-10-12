import { panelsTemplate } from './panels.template';

function initPanels(): void {
  const template = panelsTemplate(null);
  document.getElementById('main')!.appendChild(template.$root);
}

export { initPanels };
