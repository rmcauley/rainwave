function preferencesModalSectionHeader(text: string): HTMLElement {
  const headerEl = document.createElement('div');
  headerEl.className = 'preferences-modal-section-header';
  headerEl.textContent = text;
  return headerEl;
}

export { preferencesModalSectionHeader };
