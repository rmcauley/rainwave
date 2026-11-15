function timelineEntryTemplate() {
  const v1 = document.createElement('div');
  v1.className = 'timeline-entry';
  const v2 = document.createElement('div');
  v2.className = 'timeline-event-animator';
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = 'timeline-header';
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = 'timeline-header-text';
  v3.appendChild(v4);
  const v5 = document.createElement('div');
  v5.className = 'timeline-header-clock';
  v3.appendChild(v5);
  const v6 = document.createElement('div');
  v6.className = 'timeline-entry-progress';
  v2.appendChild(v6);
  const v7 = document.createElement('div');
  v7.className = 'timeline-entry-progress-bkg';
  v6.appendChild(v7);
  const v8 = document.createElement('div');
  v8.className = 'timeline-entry-progress-bkg-inside';
  v7.appendChild(v8);
  const v9 = document.createElement('div');
  v9.className = 'timeline-entry-songs';
  v2.appendChild(v9);
  return {
    $root: v1,
    headerContainer: v3,
    header: v4,
    clock: v5,
    progress: v6,
    progressInside: v8,
    songs: v9,
  };
}
export { timelineEntryTemplate };
