import { svgIcon as _svg } from '../../helpers/svg';
import { $l } from '../../language';

import style from './timeline.scss';
function timelineTemplate() {
  const v1 = document.createElement('div');
  v1.className = 'timeline';
  const v2 = document.createElement('div');
  v2.className = 'timeline-history-header';
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.appendChild(document.createTextNode($l('previouslyplayed')));
  v3.className = 'history-header-header';
  v2.appendChild(v3);
  const v4 = _svg('rw-pulldown');
  v4.setAttribute('class', `history-pulldown-arrow`);
  v2.appendChild(v4);
  const v5 = document.createElement('div');
  v5.className = 'progress history-bar';
  v1.appendChild(v5);
  const v6 = document.createElement('div');
  v6.className = 'progress-bkg';
  v5.appendChild(v6);
  const v7 = document.createElement('div');
  v7.className = 'progress-inside';
  v6.appendChild(v7);
  return { $root: v1, timeline: v1, historyHeader: v2, historyBar: v5, progressHistoryInside: v7 };
}
export { timelineTemplate };
