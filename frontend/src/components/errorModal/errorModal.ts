import { Modal } from '../modal/modal';
import { errorModalTemplate } from './errorModal.template';

class ErrorModal extends Modal {
  setContent = (): void => {
    this.template.body.appendChild(errorModalTemplate().$root);
  };
}

export { ErrorModal };
