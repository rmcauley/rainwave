import { authFailureModalTemplate } from './authFailureModal/authFailureModal.template';
import { errorModalTemplate } from './errorModal/errorModal.template';
import { modalTemplate } from './modal.template';
import { whatIsCooldownModalTemplate } from './whatIsCooldownModal/whatIsCooldownModal.template';

let preventingNewModals = false;

const pageDimmer = document.createElement('div');
pageDimmer.className = 'page-dimmer';

const template = modalTemplate();

type modalNames = 'authFailure' | 'error' | 'whatIsCooldown';
type modalData = { template: () => { $root: HTMLElement | DocumentFragment }; closeable: boolean };

const MODALS: Record<modalNames, modalData> = {
  authFailure: { template: authFailureModalTemplate, closeable: false },
  error: { template: errorModalTemplate, closeable: false },
  whatIsCooldown: { template: whatIsCooldownModalTemplate, closeable: true },
};

function showModal(modal: modalNames): void {
  if (preventingNewModals) {
    return;
  }

  const closeable = MODALS[modal].closeable;
  while (template.body.firstChild) {
    template.body.removeChild(template.body.firstChild);
  }

  if (closeable) {
    template.closeIcon.classList.remove('modal-close-icon--hidden');
  } else {
    template.closeIcon.classList.add('modal-close-icon--hidden');
    preventingNewModals = true;
  }

  document.body.insertBefore(pageDimmer, document.body.firstChild);
  document.body.insertBefore(template.modal, document.body.firstChild);
}

function closeModal(evt: MouseEvent): void {
  if (preventingNewModals) {
    return;
  }
  evt.preventDefault();
  evt.stopPropagation();

  template.modal.classList.add('modal--closing');
  pageDimmer.classList.add('page-dimmer--closing');
  setTimeout(() => {
    template.modal.parentNode?.removeChild(template.modal);
    pageDimmer.parentNode?.removeChild(pageDimmer);
  }, 300);
}

template.modal.addEventListener('click', function (e) {
  e.stopPropagation();
});
template.closeIcon.addEventListener('click', closeModal);
pageDimmer.addEventListener('click', closeModal);

export { showModal };
