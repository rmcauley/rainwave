import { textHighlight } from '../../../helpers/textHighlight';
import { $l } from '../../../language';
import { api } from '../../../rainwaveApi/api';
import type { paths } from '../../../rainwaveApi/rainwave-openapi';
import { getErrorText } from '../../errorTooltip/errorTooltip';
import { panelTableTemplate } from '../panelTable/panelTable.template';
import { panelTableAlbumRow } from '../panelTable/panelTableAlbumRow/panelTableAlbumRow';
import { panelTableArtistRowTemplate } from '../panelTable/panelTableArtistRow/panelTableArtistRow.template';
import { panelTableSongRow } from '../panelTable/panelTableSongRow/panelTableSongRow';
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
    query: string,
  ): void => {
    this.clearResults();

    if (payload.artists.length > 0) {
      const tableTemplate = panelTableTemplate({ header: $l('Artists') });
      payload.artists.forEach((artist) => {
        const artistTemplate = panelTableArtistRowTemplate(artist);
        textHighlight(artistTemplate.name, query);
        tableTemplate.table.appendChild(artistTemplate.$root);
      });
      this.template.searchResults.appendChild(tableTemplate.table);
    }

    if (payload.albums.length > 0) {
      const tableTemplate = panelTableTemplate({ header: $l('Albums') });
      payload.albums.forEach((album) => {
        const albumTemplate = panelTableAlbumRow(album);
        textHighlight(albumTemplate.name, query);
        tableTemplate.table.appendChild(albumTemplate.$root);
      });
      this.template.searchResults.appendChild(tableTemplate.table);
    }

    if (payload.songs.length > 0) {
      const tableTemplate = panelTableTemplate({ header: $l('Songs') });
      payload.songs.forEach((song) => {
        const songTemplate = panelTableSongRow(song);
        textHighlight(songTemplate.title, query);
        tableTemplate.table.appendChild(songTemplate.$root);
      });
      this.template.searchResults.appendChild(tableTemplate.table);
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
