import { svgIcon as _svg } from '../../helpers/svg';
function playlistTemplate() {
  const v1 = document.createElement('div');
  v1.setAttribute('id', `playlist`);
  const v2 = document.createElement('div');
  v2.setAttribute('id', `playlist-header`);
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.setAttribute('id', `playlist-header-tabs`);
  v2.appendChild(v3);
  const v4 = document.createElement('a');
  v4.href = `#!/album`;
  v4.className = 'playlist-header-tabs-tab';
  v3.appendChild(v4);
  const v5 = document.createElement('a');
  v5.href = `#!/artist`;
  v5.className = 'playlist-header-tabs-tab';
  v3.appendChild(v5);
  const v6 = document.createElement('a');
  v6.href = `#!/group`;
  v6.className = 'playlist-header-tabs-tab';
  v3.appendChild(v6);
  const v7 = document.createElement('a');
  v7.href = `#!/request_line`;
  v7.className = 'playlist-header-tabs-tab';
  v3.appendChild(v7);
  const v8 = _svg('#rw-icon-close');
  v8.setAttribute('class', `rw-icon-close`);
  v8.setAttribute('viewbox', `0 0 100 100`);
  v2.appendChild(v8);
  const v9 = document.createElement('div');
  v9.setAttribute('id', `playlist-album`);
  v9.className = 'playlist-list';
  v1.appendChild(v9);
  const v10 = document.createElement('div');
  v10.setAttribute('id', `playlist-artist`);
  v10.className = 'playlist-list';
  v1.appendChild(v10);
  const v11 = document.createElement('div');
  v11.setAttribute('id', `playlist-group`);
  v11.className = 'playlist-list';
  v1.appendChild(v11);
  const v12 = document.createElement('div');
  v12.setAttribute('id', `playlist-request`);
  v12.className = 'playlist-list';
  v1.appendChild(v12);
  return {
    $root: v1,
    albumTab: v4,
    artistTab: v5,
    groupTab: v6,
    requestLineTab: v7,
    closeIcon: v8,
    albumList: v9,
    artistList: v10,
    groupList: v11,
    requestLineList: v12,
  };
}
export { playlistTemplate };
