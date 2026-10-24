import { Modal } from '../modal/modal';
import { authFailureModalTemplate } from './authFailureModal.template';

class AuthFailureModal extends Modal {
  setContent = (): void => {
    this.template.body.appendChild(authFailureModalTemplate().$root);
  };
}

export { AuthFailureModal };
