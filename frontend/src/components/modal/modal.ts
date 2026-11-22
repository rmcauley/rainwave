import { preferencesModal } from '../preferencesModal/preferencesModal';
import { authFailureModalTemplate } from './authFailureModal/authFailureModal.template';
import { errorModalTemplate } from './errorModal/errorModal.template';
import { modalTemplate } from './modal.template';
import { whatIsCooldownModalTemplate } from './whatIsCooldownModal/whatIsCooldownModal.template';

let preventingNewModals = false;

const template = modalTemplate();

type modalNames = 'authFailure' | 'error' | 'whatIsCooldown' | 'preferences';
type modalData = { template: () => { $root: HTMLElement | DocumentFragment }; closeable: boolean };

const MODALS: Record<modalNames, modalData> = {
  authFailure: { template: authFailureModalTemplate, closeable: false },
  error: { template: errorModalTemplate, closeable: false },
  whatIsCooldown: { template: whatIsCooldownModalTemplate, closeable: true },
  preferences: { template: preferencesModal, closeable: true },
};

function showModal(modal: modalNames): typeof template | undefined {
  if (preventingNewModals) {
    return undefined;
  }

  if (!MODALS[modal].closeable) {
    template.closeIcon.classList.add('modal-close-icon--hidden');
    preventingNewModals = true;
  }

  document.body.insertBefore(template.modal, document.body.firstChild);

  return template;
}

function closeModal(evt: MouseEvent): void {
  if (preventingNewModals) {
    return;
  }
  evt.preventDefault();
  evt.stopPropagation();

  template.modal.classList.add('modal--closing');
}

template.modal.addEventListener('click', function (e) {
  e.stopPropagation();
});
template.closeIcon.addEventListener('click', closeModal);

export { showModal };
