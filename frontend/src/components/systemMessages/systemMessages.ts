import { removeElement } from '../../helpers/removeElement';
import { systemMessageTemplate } from './systemMessage.template';

const el = document.getElementById('messages')!;

function showSystemMessage(text: string): ReturnType<typeof systemMessageTemplate> {
  const msg = systemMessageTemplate({ text });
  msg.closeButton.addEventListener('click', () => {
    removeElement(msg.$root);
  });
  el.appendChild(msg.$root);
  return msg;
}

export { showSystemMessage };
