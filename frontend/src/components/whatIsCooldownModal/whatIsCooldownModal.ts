import { $l } from '../../language';
import { Modal } from '../modal/modal';
import { whatIsCooldownModalTemplate } from './whatIsCooldownModal.template';

class WhatIsCooldownModal extends Modal {
  constructor() {
    super({ closeable: true, title: $l('cd_what_is') });
  }

  setContent = (): void => {
    this.template.body.appendChild(whatIsCooldownModalTemplate().$root);
  };
}

export { WhatIsCooldownModal };
