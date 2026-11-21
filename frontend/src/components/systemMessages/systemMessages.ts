import { removeElement } from '../../helpers/removeElement';
import { svgIcon } from '../../helpers/svg';

const el = document.getElementById('messages')!;

function showSystemMessage(
  key: string,
  content: string | HTMLElement,
  closeable: boolean,
): HTMLElement {
  const alreadyExists = el.querySelectorAll<HTMLElement>(`[data-key="${key}"]`)[0];
  if (alreadyExists) {
    return alreadyExists;
  }

  const parentDiv = document.createElement('div');
  parentDiv.className = 'system-message';
  parentDiv.dataset.key = key;
  const contentDiv = document.createElement('div');
  contentDiv.className = 'system-message-content';
  if (typeof content === 'string') {
    contentDiv.textContent = content;
  } else {
    contentDiv.appendChild(content);
  }
  parentDiv.appendChild(contentDiv);

  if (closeable) {
    const closeDiv = document.createElement('div');
    closeDiv.className = 'system-message-close-button';
    closeDiv.appendChild(svgIcon('#rw-close'));
    parentDiv.appendChild(closeDiv);
    closeDiv.addEventListener('click', () => {
      removeElement(parentDiv);
    });
  }

  el.appendChild(parentDiv);

  return parentDiv;
}

function removeSystemMessage(key: string): void {
  el.querySelectorAll<HTMLElement>(`[data-key="${key}"]`).forEach((msg) => {
    removeElement(msg);
  });
}

export { showSystemMessage, removeSystemMessage };
