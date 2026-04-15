import { $l } from '../../language';

import type { searchContext } from './search.context';

import style from './search.module.scss';

function search(context: searchContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.className = style.close;
  v1.appendChild(v2);

  const v3 = document.createElement('img');
  v3.setAttribute('src', `/static/images4/cancel.png`);
  v3.setAttribute('alt', `X`);
  v2.appendChild(v3);

  const v4 = document.createElement('ul');
  v4.className = style['panel-header'];
  v1.appendChild(v4);

  const v5 = document.createElement('li');
  v5.className = style.open;
  v4.appendChild(v5);

  const v6 = document.createElement('a');
  v6.appendChild(document.createTextNode($l('search')));
  v5.appendChild(v6);

  const v7 = document.createElement('div');
  v7.className = style['searchbox-container'];
  v1.appendChild(v7);

  const v8 = document.createElement('form');
  v7.appendChild(v8);

  const v9 = document.createElement('button');
  v9.appendChild(document.createTextNode($l('go')));
  v9.className = style['search-button'];
  v8.appendChild(v9);

  const v10 = document.createElement('div');
  v8.appendChild(v10);

  const v11 = document.createElement('input');
  v11.setAttribute('type', `text`);
  v11.setAttribute('placeholder', $l('search...'));
  v11.setAttribute('autocomplete', `off`);
  v11.setAttribute('autocorrect', `off`);
  v11.setAttribute('autocapitalize', `off`);
  v11.setAttribute('spellcheck', `false`);
  v11.className = style['search-box'];
  v10.appendChild(v11);

  const v12 = document.createElement('img');
  v12.setAttribute('src', `/static/images4/search.png`);
  v12.className = style.search;
  v7.appendChild(v12);

  const v13 = document.createElement('img');
  v13.setAttribute('src', `/static/images4/search_clear.png`);
  v13.className = style.cancel;
  v7.appendChild(v13);

  const v14 = document.createElement('div');
  v14.className = style['search-results-container'];
  v1.appendChild(v14);

  const v15 = document.createElement('div');
  v15.className = style['search-results'];
  v14.appendChild(v15);

  return {
    $root: v1,
    searchClose: v2,
    searchHeader: v6,
    searchBoxContainer: v7,
    searchForm: v8,
    searchButton: v9,
    search: v11,
    searchCancel: v13,
    searchResultsContainer: v14,
    searchResults: v15,
  };
}
export { search };
