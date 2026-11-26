import { preferencesModal } from '../preferencesModal/preferencesModal';
import { authFailureModalTemplate } from './authFailureModal/authFailureModal.template';
import { errorModalTemplate } from './errorModal/errorModal.template';
import { modalTemplate } from './modal.template';
import { whatIsCooldownModalTemplate } from './whatIsCooldownModal/whatIsCooldownModal.template';

let preventingNewModals = false;

const modalEl = document.getElementById('modal')! as HTMLDialogElement;

let template: ReturnType<typeof modalTemplate> | undefined;

type modalNames = 'authFailure' | 'error' | 'whatIsCooldown' | 'preferences';
type modalData = { template: () => { $root: HTMLElement | DocumentFragment }; closeable: boolean };

const MODALS: Record<modalNames, modalData> = {
  authFailure: { template: authFailureModalTemplate, closeable: false },
  error: { template: errorModalTemplate, closeable: false },
  whatIsCooldown: { template: whatIsCooldownModalTemplate, closeable: true },
  preferences: { template: preferencesModal, closeable: true },
};

function closeModal(evt: MouseEvent): void {
  if (preventingNewModals) {
    return;
  }
  evt.preventDefault();
  evt.stopPropagation();

  modalEl.close();
}

function showModal(modal: modalNames): typeof template | undefined {
  if (preventingNewModals) {
    return undefined;
  }

  if (!template) {
    template = modalTemplate();
    template.closeIcon.addEventListener('click', closeModal);
    modalEl.appendChild(template.$root);
  }

  if (!MODALS[modal].closeable) {
    template.closeIcon.parentElement?.removeChild(template.closeIcon);
    preventingNewModals = true;
    modalEl.closedBy = 'none';
  }

  template.body.replaceChildren(MODALS[modal].template().$root);

  modalEl.showModal();

  return template;
}

export { modalEl, showModal };
