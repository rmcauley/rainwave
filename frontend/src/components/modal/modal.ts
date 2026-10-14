import { removeElement } from '../../helpers/removeElement';
import { modalTemplate } from './modal.template';

let preventingNewModals = false;
const pageDimmer = document.createElement('div');

class Modal {
  static currentModal: Modal | undefined;

  template: ReturnType<typeof modalTemplate>;

  constructor(templateParams: Parameters<typeof modalTemplate>[0]) {
    this.template = modalTemplate(templateParams);

    if (templateParams.closeable) {
      this.template.closeIcon.addEventListener('click', this.close);
    } else {
      this.template.closeIcon.parentElement?.removeChild(this.template.closeIcon);
    }

    this.template.modal.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  setContent = (): void => {
    // to be inherited
  };

  static closeOpenModal = (evt: MouseEvent): void => {
    if (Modal.currentModal && !preventingNewModals) {
      Modal.currentModal.close(evt);
      Modal.currentModal = undefined;
    }
  };

  show = (preventNewModals: boolean = false): void => {
    if (preventingNewModals) {
      return;
    }
    preventingNewModals = preventNewModals;

    Modal.currentModal?.close(undefined, false);
    Modal.currentModal = this;

    document.body.insertBefore(pageDimmer, document.body.firstChild);
    document.body.insertBefore(this.template.modal, document.body.firstChild);
  };

  close = (evt: MouseEvent | undefined, removeDimmer = true): void => {
    if (evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    if (preventingNewModals) {
      return;
    }
    this.template.modal.classList.add('modal--closing');
    setTimeout(() => {
      this.template.modal.parentNode?.removeChild(this.template.modal);
    }, 300);

    if (removeDimmer) {
      removeElement(pageDimmer);
    }
  };
}

pageDimmer.className = 'page-dimmer';
pageDimmer.addEventListener('click', Modal.closeOpenModal);

export { Modal };
