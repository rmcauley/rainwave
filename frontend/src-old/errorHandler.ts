import { $l } from '../language';
import { errorModal } from '../templates';

let alreadyReported = false;

const onErrorHadler: OnErrorEventHandler = async (exception) => {
  if (alreadyReported) {
    return;
  }
  alreadyReported = true;

  const template = errorModal($l('crash_happened'), 'modal_error', null, true);
  template._root.parentNode.classList.add('error');

  try {
    const submitObj = {
      name: exception.name,
      message: exception.message,
      lineNumber: exception.lineNumber || '(no line)',
      columnNumber: exception.columnNumber || '(no char number)',
      stack: exception.stack || exception.backtrace || exception.stacktrace || '(no stack)',
      location: window.location.href,
      userAgent: navigator.userAgent,
      browserLanguage: navigator.language || navigator.userLanguage,
    };
    API.async_get(
      'error_report',
      submitObj,
      function () {
        template.sending_report.textContent = $l('report_sent');
        API.sync_stop();
      },
      function () {
        template.sending_report.textContent = $l('report_error');
        API.sync_stop();
      },
    );
  } catch (_e) {
    // don't complain, we've already crashed
  }
};
