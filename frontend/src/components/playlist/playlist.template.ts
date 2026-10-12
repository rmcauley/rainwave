import { svgIcon as _svg } from '../../helpers/svg';
import type { playlistContext } from './playlist.context';

import style from './playlist.scss';
function playlistTemplate(context: playlistContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.setAttribute('id', `playlist`);
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.setAttribute('id', `playlist-header`);
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.setAttribute('id', `playlist-header-tabs`);
  v3.appendChild(v4);
  const v5 = document.createElement('a');
  v5.href = `#!/album`;
  v5.className = 'playlist-header-tabs-tab';
  v4.appendChild(v5);
  const v6 = document.createElement('a');
  v6.href = `#!/artist`;
  v6.className = 'playlist-header-tabs-tab';
  v4.appendChild(v6);
  const v7 = document.createElement('a');
  v7.href = `#!/group`;
  v7.className = 'playlist-header-tabs-tab';
  v4.appendChild(v7);
  const v8 = document.createElement('a');
  v8.href = `#!/request_line`;
  v8.className = 'playlist-header-tabs-tab';
  v4.appendChild(v8);
  const v9 = _svg('#rw-icon-close');
  v9.setAttribute('class', `rw-icon-close`);
  v9.setAttribute('viewbox', `0 0 100 100`);
  v3.appendChild(v9);
  const v10 = document.createElement('div');
  v10.setAttribute('id', `playlist-album`);
  v10.className = 'playlist-list';
  v2.appendChild(v10);
  const v11 = document.createElement('div');
  v11.setAttribute('id', `playlist-artist`);
  v11.className = 'playlist-list';
  v2.appendChild(v11);
  const v12 = document.createElement('div');
  v12.setAttribute('id', `playlist-group`);
  v12.className = 'playlist-list';
  v2.appendChild(v12);
  const v13 = document.createElement('div');
  v13.setAttribute('id', `playlist-request`);
  v13.className = 'playlist-list';
  v2.appendChild(v13);
  return {
    $root: v1,
    albumTab: v5,
    artistTab: v6,
    groupTab: v7,
    requestLineTab: v8,
    closeIcon: v9,
    albumList: v10,
    artistList: v11,
    groupList: v12,
    requestLineList: v13,
  };
}
export { playlistTemplate };
