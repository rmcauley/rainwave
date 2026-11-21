import { svgIcon as _svg } from '../../helpers/svg';
import { $l } from '../../language';
function searchPanelTemplate() {
  const v1 = document.createElement('div');
  v1.className = 'search-panel';
  const v2 = document.createElement('div');
  v2.className = 'search-panel-form';
  v1.appendChild(v2);
  const v3 = document.createElement('form');
  v2.appendChild(v3);
  const v4 = document.createElement('input');
  v4.setAttribute('type', `text`);
  v4.setAttribute('placeholder', $l('search...'));
  v4.setAttribute('autocomplete', `off`);
  v4.setAttribute('autocorrect', `off`);
  v4.setAttribute('autocapitalize', `off`);
  v4.setAttribute('spellcheck', `false`);
  v4.className = 'search-panel-form-input';
  v3.appendChild(v4);
  const v5 = _svg('rw-cancel');
  v5.setAttribute('class', `search-panel-form-cancel-icon`);
  v3.appendChild(v5);
  const v6 = document.createElement('button');
  v6.className = 'search-panel-form-button';
  v6.setAttribute('type', `submit`);
  v3.appendChild(v6);
  const v7 = _svg('rw-search');
  v7.setAttribute('class', `search-panel-form-search-icon`);
  v6.appendChild(v7);
  const v8 = document.createElement('div');
  v8.className = 'search-panel-results';
  v1.appendChild(v8);
  return {
    $root: v1,
    searchForm: v3,
    searchInput: v4,
    cancelIcon: v5,
    searchButton: v6,
    searchIcon: v7,
    searchResults: v8,
  };
}
export { searchPanelTemplate };
