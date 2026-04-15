import type { timelineEntryTooltipContext } from './timelineEntryTooltip.context';

import style from './timelineEntryTooltip.module.scss';

function timelineEntryTooltip(context: timelineEntryTooltipContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.appendChild(document.createTextNode(context.text));
  v2.className = style['error-tooltip'];
  v1.appendChild(v2);

  return { $root: v1, el: v2 };
}
export { timelineEntryTooltip };
