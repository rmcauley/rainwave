import { $l } from '../../language';

import type { searchListContext } from './searchList.context';

import style from './searchList.module.scss';

function searchList(context: searchListContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.className = style['searchbox-container'];
  v1.appendChild(v2);

  const v3 = document.createElement('div');
  v3.className = style['searchlist-loading-bar'];
  v2.appendChild(v3);

  const v4 = document.createElement('input');
  v4.setAttribute('type', `text`);
  v4.setAttribute('placeholder', $l('Loading...'));
  v4.setAttribute('autocomplete', `off`);
  v4.setAttribute('autocorrect', `off`);
  v4.setAttribute('autocapitalize', `off`);
  v4.setAttribute('spellcheck', `false`);
  v4.className = style['search-box'];
  v4.setAttribute('disabled', `disabled`);
  v2.appendChild(v4);

  const v5 = document.createElement('img');
  v5.setAttribute('src', `/static/images4/search.png`);
  v5.className = style.search;
  v2.appendChild(v5);

  const v6 = document.createElement('img');
  v6.setAttribute('src', `/static/images4/search_clear.png`);
  v6.className = style.cancel;
  v2.appendChild(v6);

  const v7 = document.createElement('div');
  v7.appendChild(document.createTextNode($l('empty_list')));
  v7.className = style['no-result-message'];
  v1.appendChild(v7);

  const v8 = document.createElement('div');
  v8.appendChild(document.createTextNode($l('no_search_results')));
  v8.className = style['no-result-message while-search-active'];
  v1.appendChild(v8);

  const v9 = document.createElement('div');
  v9.className = style['list-contents'];
  v1.appendChild(v9);

  return {
    $root: v1,
    boxContainer: v2,
    loadingBar: v3,
    searchBox: v4,
    cancel: v6,
    noResultMessage: v7,
    noResultSearchActiveMessage: v8,
    list: v9,
  };
}
export { searchList };
