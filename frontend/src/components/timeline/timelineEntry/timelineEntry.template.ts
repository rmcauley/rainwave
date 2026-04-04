import { timelineSong } from '../timelineSong/timelineSong.template';

import type { eventContext } from './timelineEntry.context';

import style from './event.module.scss';
function event(context: eventContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = style['timeline-event timeline-{{ type }}'];
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = style['timeline-event-animator'];
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = style['timeline-header'];
  v3.appendChild(v4);
  const v5 = document.createElement('span');
  v5.className = style['timeline-header-clock'];
  v4.appendChild(v5);
  if (context.url) {
    const v6 = document.createElement('a');
    v6.className = style['header-text'];
    v6.href = context.url;
    v6.setAttribute('target', `_blank`);
    v4.appendChild(v6);
  } else {
    const v7 = document.createElement('span');
    v7.className = style['header-text'];
    v4.appendChild(v7);
  }
  const v8 = document.createElement('div');
  v8.className = style.progress;
  v3.appendChild(v8);
  const v9 = document.createElement('div');
  v9.className = style['progress-bkg'];
  v8.appendChild(v9);
  const v10 = document.createElement('div');
  v10.className = style['progress-inside'];
  v9.appendChild(v10);
  const v11 = context.songs.map((context) => {
    const v12 = document.createDocumentFragment();
    v12.appendChild(timelineSong(context).$root);
    v3.appendChild(v12);

    return { $root: v12 };
  });

  return {
    $root: v1,
    el: v2,
    header_container: v4,
    clock: v5,
    header_anchor: v6,
    header_span: v7,
    progress: v8,
    progress_inside: v10,
    songs: v11,
  };
}
export { event };
