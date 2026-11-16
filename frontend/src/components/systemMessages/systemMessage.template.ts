import { svgIcon as _svg } from '../../helpers/svg';
import type { systemMessageContext } from './systemMessage.context';
function systemMessageTemplate(context: systemMessageContext) {
  const v1 = document.createElement('div');
  v1.className = 'system-message';
  const v2 = document.createElement('div');
  v2.appendChild(document.createTextNode(context.text));
  v2.className = 'system-message-text';
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = 'system-message-close-button';
  v1.appendChild(v3);
  const v4 = _svg('rw-close');
  v3.appendChild(v4);
  return { $root: v1, text: v2, closeButton: v3 };
}
export { systemMessageTemplate };
