import { showModal } from '../components/modal/modal';
import { $l } from '../language';
import { api } from '../rainwaveApi/api';
import type { components } from '../rainwaveApi/rainwave-openapi';

let alreadyReported = false;

const onErrorHandler = (evt: ErrorEvent): void => {
  if (alreadyReported) {
    return;
  }
  alreadyReported = true;

  const modal = showModal('error');
  if (!modal) {
    return;
  }

  modal.$root.classList.add('error-handler-modal');

  const errorBasics = {
    location: window.location.href,
    userAgent: navigator.userAgent,
    time: Math.round(new Date().valueOf() / 1000),
    user_id: api.user.id,
    username: api.user.name,
    browserLanguage: navigator.language,
  } as const;

  let submitObj: components['schemas']['_admin_js_error'];
  if (evt.error instanceof Error) {
    submitObj = {
      ...errorBasics,
      name: evt.error.name,
      message: evt.error.message,
      cause: JSON.stringify(evt.error.cause ?? ''),
      stack: evt.error.stack ?? '',
    };
  } else {
    submitObj = {
      ...errorBasics,
      name: 'ErrorHandler',
      message: evt.type,
      stack: '(none)',
      cause: '(none)',
    };
  }

  const sending = document.createElement('p');
  sending.textContent = $l('report_sending');
  modal.body.appendChild(sending);

  api
    .fetch('error_report', submitObj)
    .then(() => {
      sending.textContent = $l('report_sent');
    })
    .catch(() => {
      sending.textContent = $l('report_error');
    })
    .finally(() => {
      void api.stopWebSocketSync();

      const pleaseRefresh = document.createElement('p');
      const refreshLink = document.createElement('a');
      refreshLink.addEventListener('click', () => {
        window.location.reload();
      });
      refreshLink.textContent = $l('please_refresh');
      pleaseRefresh.appendChild(refreshLink);
      modal.body.appendChild(pleaseRefresh);
    });
};

export { onErrorHandler };
