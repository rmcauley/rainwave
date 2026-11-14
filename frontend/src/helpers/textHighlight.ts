function textHighlight(el: HTMLElement, searchString: string): void {
  const text = el.textContent ?? '';
  if (!text || !searchString) {
    return;
  }

  const lower = text.toLowerCase();
  const query = searchString.toLowerCase();

  const idx = lower.indexOf(query);
  if (idx === -1) {
    return;
  }

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);

  el.textContent = '';
  if (before) {
    el.appendChild(document.createTextNode(before));
  }

  const mark = document.createElement('mark');
  mark.textContent = match;
  el.appendChild(mark);

  if (after) {
    el.appendChild(document.createTextNode(after));
  }
}

export { textHighlight };
