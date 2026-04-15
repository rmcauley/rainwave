import { svgIcon as _svg } from '../../helpers/svg';
import { $l } from '../../language';

import type { timelineContext } from './timeline.context';

import style from './timeline.module.scss';

function timeline(context: timelineContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.className = style.timeline;
  v1.appendChild(v2);

  const v3 = document.createElement('div');
  v3.className = style['timeline-sizer'];
  v2.appendChild(v3);

  const v4 = document.createElement('div');
  v4.className = style['history-header history-expandable unselectable'];
  v3.appendChild(v4);

  const v5 = document.createElement('div');
  v4.appendChild(v5);

  const v6 = document.createElement('span');
  v6.appendChild(document.createTextNode($l('previouslyplayed')));
  v6.className = style['history-header-header'];
  v5.appendChild(v6);

  const v7 = _svg('pulldown');
  v7.setAttribute('class', `history-pulldown-arrow`);
  v5.appendChild(v7);

  const v8 = document.createElement('div');
  v8.className = style['progress history-bar'];
  v3.appendChild(v8);

  const v9 = document.createElement('div');
  v9.className = style['progress-bkg'];
  v8.appendChild(v9);

  const v10 = document.createElement('div');
  v10.className = style['progress-inside'];
  v9.appendChild(v10);

  return {
    $root: v1,
    timeline: v2,
    timelineSizer: v3,
    historyHeader: v4,
    historyHeaderLink: v5,
    historyBar: v8,
    progressHistoryInside: v10,
  };
}
export { timeline };
