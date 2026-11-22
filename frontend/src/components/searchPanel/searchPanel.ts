import { $l } from '../../language';
import { api } from '../../rainwaveApi/api';
import type { paths } from '../../rainwaveApi/rainwave-openapi';
import { router } from '../../router/router';
import { detailAlbumsTable } from '../detailAlbumsTable/detailAlbumsTable';
import { detailArtistsTable } from '../detailArtistsTable/detailArtistsTable';
import { detailSongsTable } from '../detailSongsTable/detailSongsTable';
import { getErrorText } from '../errorTooltip/errorTooltip';
import { Panel } from '../panel/panel';
import { searchPanelTemplate } from './searchPanel.template';

class SearchPanel extends Panel {
  template: ReturnType<typeof searchPanelTemplate>;

  constructor() {
    super('search-panel');

    this.template = searchPanelTemplate();
    this.el.appendChild(this.template.$root);

    this.template.searchForm.addEventListener('submit', this.onSubmit);
    this.template.searchInput.addEventListener('keypress', this.onInputKeypress);
    this.template.searchInput.addEventListener('input', this.onInputChange);
    this.template.cancelIcon.addEventListener('click', this.onCancelClick);

    router.addEventListener('change', ([newKey]) => {
      if (newKey === 'search') {
        this.open();
      } else {
        this.close();
      }
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

  onCancelClick = (): void => {
    this.onClear();
    this.template.searchInput.focus();
  };

  onClear = (): void => {
    this.clearResults();

    this.template.searchInput.value = '';
    this.template.$root.classList.remove('search-panel--has-value');
    this.resetColor();
  };

  onInputKeypress = (evt: KeyboardEvent): void => {
    if (evt.key === 'Escape') {
      this.onClear();
    } else {
      this.resetColor();
    }
  };

  onInputChange = (): void => {
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
  };

  onResults = (
    payload: paths['/search']['post']['responses']['default']['content']['application/json'],
    query: string,
  ): void => {
    this.clearResults();

    if (payload.artists.length > 0) {
      this.template.searchResults.appendChild(
        detailArtistsTable(payload.artists, $l('Artists'), query),
      );
    }

    if (payload.albums.length > 0) {
      this.template.searchResults.appendChild(
        detailAlbumsTable(payload.albums, $l('Albums'), query),
      );
    }

    if (payload.songs.length > 0) {
      this.template.searchResults.appendChild(detailSongsTable(payload.songs, $l('Songs'), query));
    }

    if (
      payload.songs.length >= 100 ||
      payload.albums.length >= 50 ||
      payload.artists.length >= 50
    ) {
      const limitReached = document.createElement('div');
      limitReached.className = 'search-panel-limit-reached';
      limitReached.textContent = $l('search_result_limit');
      this.template.searchResults.appendChild(limitReached);
    }
  };

  onSubmit = (): void => {
    const search = this.template.searchInput.value;
    api
      .fetch('search', { search })
      .then((payload) => {
        this.onResults(payload, search);
      })
      .catch((err: unknown): void => {
        this.onError(err);
      });
  };
}
export { SearchPanel };
