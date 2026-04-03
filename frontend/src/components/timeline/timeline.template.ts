import { svgIcon as _svg } from '../../helpers/svg';
import { $l } from '../../language';

import type { timelineContext } from './timeline.context';
function timeline(context: timelineContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `timeline`;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `timeline_sizer`;
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = `history_header history_expandable unselectable`;
  v3.appendChild(v4);
  const v5 = document.createElement('div');
  v4.appendChild(v5);
  const v6 = document.createElement('span');
  v6.appendChild(document.createTextNode($l('previouslyplayed')));
  v6.className = `history_header_header`;
  v5.appendChild(v6);
  const v7 = _svg('pulldown');
  v7.setAttribute('class', `history_pulldown_arrow`);
  v5.appendChild(v7);
  const v8 = document.createElement('div');
  v8.className = `progress history_bar`;
  v3.appendChild(v8);
  const v9 = document.createElement('div');
  v9.className = `progress_bkg`;
  v8.appendChild(v9);
  const v10 = document.createElement('div');
  v10.className = `progress_inside`;
  v9.appendChild(v10);
  
return {
    $root: v1,
    timeline: v2,
    timeline_sizer: v3,
    history_header: v4,
    history_header_link: v5,
    history_bar: v8,
    progress_history_inside: v10,
  };
}
export { timeline };
