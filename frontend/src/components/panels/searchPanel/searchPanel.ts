import { api } from '../../../rainwaveApi/api';
import type { paths } from '../../../rainwaveApi/rainwave-openapi';
import { getErrorText } from '../../errorTooltip/errorTooltip';
import { searchPanelTemplate } from './searchPanel.template';

class SearchPanel {
  template: ReturnType<typeof searchPanelTemplate>;

  constructor() {
    this.template = searchPanelTemplate();

    this.template.searchForm.addEventListener('submit', this.onSubmit);

    this.template.searchInput.addEventListener('keypress', (evt) => {
      if (evt.key === 'Escape') {
        this.onClear();
      } else {
        this.resetColor();
      }
    });

    this.template.searchInput.addEventListener('input', () => {
      if (
        this.template.searchInput.value &&
        !this.template.$root.classList.contains('search-panel--has-value')
      ) {
        this.template.$root.classList.add('search-panel--has-value');
      } else if (
        !this.template.searchInput.value &&
        this.template.$root.classList.contains('search-panel--has-value')
      ) {
        this.template.$root.classList.remove('search-panel--has-value');
      }
    });

    this.template.cancelIcon.addEventListener('click', () => {
      this.onClear();
      this.template.searchInput.focus();
    });
  }

  resetColor = (): void => {
    this.template.$root.classList.remove('search-panel--error');
    this.template.$root.classList.remove('search-panel--active');
    this.template.searchInput.removeEventListener('input', this.resetColor);
  };

  clearResults = (): void => {
    while (this.template.searchResults.lastChild) {
      this.template.searchResults.removeChild(this.template.searchResults.lastChild);
    }
  };

  onError = (payload: unknown): void => {
    this.clearResults();

    const div = document.createElement('div');
    div.className = 'search-panel-no-result-message';
    div.textContent = getErrorText(payload);
    this.template.searchResults.appendChild(div);

    this.template.$root.classList.add('search-panel--error');
    this.template.searchInput.addEventListener('input', this.resetColor);
  };

  onClear = (): void => {
    this.clearResults();

    this.template.searchInput.value = '';
    this.template.$root.classList.remove('search-panel--has-value');
    this.resetColor();
  };

  onResults = (
    payload: paths['/api4/search']['post']['responses']['default']['content']['application/json'],
  ): void => {
    // TODO
  };

  // const highlightText = function (title) {
  //   // too many characters = too big a regex.  NOPE.
  //   if (searchText.length > 8) {
  //     return;
  //   }
  //   const t = title.textContent;
  //   let m = t.match(searchRegex);
  //   if (!m) {
  //     m = t.match(searchRegexGreedy);
  //   }
  //   if (m?.length == 4) {
  //     title.textContent = '';

  //     if (m[1]) {
  //       const beforeEl = document.createElement('span');
  //       beforeEl.textContent = m[1];
  //       title.appendChild(beforeEl);
  //     }

  //     const highlightEl = document.createElement('span');
  //     highlightEl.className = 'search-highlight';
  //     highlightEl.textContent = m[2];
  //     title.appendChild(highlightEl);

  //     if (m[2]) {
  //       const afterEl = document.createElement('span');
  //       afterEl.textContent = m[3];
  //       title.appendChild(afterEl);
  //     }
  //   }
  // };

  // const searchResult = function (json) {
  //   if (json.artists.length + json.albums.length + json.songs.length === 0) {
  //     return searchError({ tl_key: 'no_search_results' });
  //   }

  //   while (el.hasChildNodes()) {
  //     el.removeChild(el.lastChild);
  //   }

  //   this.template.$root.classList.add('active');
  //   input.addEventListener('input', searchResetColor);
  //   RWTemplates.search_results(json, el);
  //   let div, a, i;

  //   for (i = 0; i < json.artists.length; i++) {
  //     highlightText(json.artists[i].$t.title);
  //   }

  //   for (i = 0; i < json.albums.length; i++) {
  //     highlightText(json.albums[i].$t.title);
  //     Fave.register(json.albums[i], true);
  //     Rating.register(json.albums[i]);
  //   }

  //   for (i = 0; i < json.songs.length; i++) {
  //     highlightText(json.songs[i].$t.title);

  //     div = document.createElement('div');
  //     div.className = 'album-name';
  //     a = document.createElement('a');
  //     a.setAttribute('href', `#!/album/${json.songs[i].album_id}`);
  //     a.textContent = json.songs[i].album_name;
  //     div.appendChild(a);
  //     json.songs[i].$t.row.insertBefore(div, json.songs[i].$t.title);

  //     Fave.register(json.songs[i]);
  //     Rating.register(json.songs[i]);
  //     if (json.songs[i].requestable) {
  //       Requests.makeClickable(json.songs[i].$t.title, json.songs[i].id);
  //     }
  //     SongsTableDetail(json.songs[i], i > json.songs.length - 4);
  //   }

  //   scroller.set_height(false);
  //   scroller.refresh();
  // };

  onSubmit = (): void => {
    api
      .fetch('search', { search: this.template.searchInput.value })
      .then((payload) => {
        this.onResults(payload);
      })
      .catch((err: unknown): void => {
        this.onError(err);
      });
  };
}
export { SearchPanel };
