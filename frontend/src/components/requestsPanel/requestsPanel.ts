import { getViewportHeight } from '../../helpers/getViewportSize';
import { $l } from '../../language';
import { api } from '../../rainwaveApi/api';
import type { components } from '../../rainwaveApi/rainwave-openapi';
import { setAlbumArt } from '../albumArt/albumArt';
import { showErrorTooltip } from '../errorTooltip/errorTooltip';
import { menuRequestsLabel } from '../menu/menu';
import { panelHeaderTemplate } from '../panels/panelHeader/panelHeader.template';
import { requestsPanelTemplate } from './requestsPanel.template';

const DRAG_SCROLL_MAX_SPEED_MARGIN_PERCENT = 0.15;
const DRAG_SCROLL_GRADUAL_WINDOW_PERCENT = 0.15;
const DRAG_SCROLL_MAX_SPEED = 20;

class RequestsPanel {
  template: ReturnType<typeof requestsPanelTemplate>;

  private header: HTMLElement;
  private dragElement: HTMLElement | undefined;
  private dragIcon: HTMLElement | undefined;
  private dragRequest: components['schemas']['requests'][number] | undefined;
  private dragStartClientY: number;
  private dragStartElementY: number;
  private dragToIndex: number;
  private elementHeight: number;
  private elements: Map<number, HTMLElement>;
  private entries: components['schemas']['requests'];
  private listPageY: number;
  private rerenderAfterDrag: boolean;

  constructor() {
    this.entries = [];
    this.elements = new Map();
    this.rerenderAfterDrag = false;
    this.elementHeight = 0;
    this.dragStartClientY = 0;
    this.dragStartElementY = 0;
    this.dragToIndex = 0;
    this.listPageY = 0;

    this.template = requestsPanelTemplate();
    this.header = panelHeaderTemplate().$root;
    this.template.$root.insertBefore(this.header, this.template.$root.firstChild);

    this.template.clearButton.addEventListener('click', this.onClearClick);
    this.template.faveFillButton.addEventListener('click', this.onFaveFillClick);
    this.template.pauseUnpauseButton.addEventListener('click', this.onPauseUnpauseClick);
    this.template.unratedFillButton.addEventListener('click', this.onUnratedFillClick);

    api.addEventListener('requests', this.onRequestsUpdate);
    api.addEventListener('user', this.onUserUpdate);

    // TODO: "no requests" message
    //     list.helpmsg = document.createElement('div');
    //     list.helpmsg.className = 'blank-request-message';
    //     list.helpmsg.textContent = $l('make_a_request');

    // TODO: steal request indicator if power user mode is on
  }

  private onRequestsUpdate = (payload: components['schemas']['requests']): void => {
    this.entries = payload;

    if (
      this.dragRequest &&
      !this.entries.find((r) => r.request_id === this.dragRequest?.request_id)
    ) {
      this.stopDrag();
    } else if (this.dragRequest) {
      this.rerenderAfterDrag = true;
    } else {
      // TODO: render
    }
  };

  private getRequestFromPointerEvent = (
    evt: PointerEvent,
  ): components['schemas']['requests'][number] | undefined => {
    if (evt.currentTarget instanceof HTMLElement) {
      const requestId = Number(evt.currentTarget.dataset.requestId);
      if (requestId && !Number.isNaN(requestId)) {
        return this.entries.find((r) => r.id === requestId);
      }
    }
    return undefined;
  };

  private onRequestDragStart = (evt: PointerEvent): void => {
    if (this.dragRequest) {
      return;
    }

    const request = this.getRequestFromPointerEvent(evt);
    if (request) {
      const requestIndex = this.entries.indexOf(request);
      const dragElement = this.elements.get(request.id);
      if (requestIndex >= -1 && dragElement) {
        this.elementHeight = dragElement.offsetHeight;
        this.listPageY = this.template.songList.getBoundingClientRect().top;
        this.dragElement = dragElement;
        this.dragRequest = request;
        this.dragToIndex = requestIndex;

        this.dragStartClientY = evt.clientY;
        this.dragStartElementY = dragElement.offsetTop;

        this.dragElement.classList.add('requests-panel-list-entry--dragging');
        this.template.songList.classList.add('requests-panel-list--dragging');
        document.body.classList.add('requests-panel-dragging');

        this.dragIcon = document.createElement('div');
        setAlbumArt(this.dragIcon, request.albums[0].art);
        this.dragIcon.classList.add('requests-panel-drag-icon');
        this.dragIcon.style.transform = `translate(${evt.pageX}px ${evt.pageY}px)`;
        document.body.insertBefore(this.dragIcon, document.body.firstChild);

        this.template.songList.addEventListener('pointerleave', this.onListPointerLeave);
        this.template.songList.addEventListener('pointermove', this.onListPointerMove);
        this.template.songList.addEventListener('pointerup', this.onListPointerUp);
        document.body.addEventListener('pointermove', this.onBodyPointerMove);
        document.body.addEventListener('pointerup', this.onBodyPointerUp);
      }
    }
  };

  private getDragYAndIndex = (evt: PointerEvent): [number, number] => {
    const newY =
      this.dragStartElementY -
      this.dragStartClientY -
      evt.clientY +
      this.template.songList.scrollTop;
    return [
      newY,
      Math.min(
        this.entries.length,
        Math.max(0, Math.floor((newY + this.elementHeight * 0.3) / this.elementHeight)),
      ),
    ];
  };

  private getDragEntries = (newIndex: number): components['schemas']['requests'] => {
    const dragEntries = this.entries.toSpliced(this.dragToIndex, 1);
    dragEntries.splice(newIndex, 0, this.entries[this.dragToIndex]!);
    return dragEntries;
  };

  private onListPointerLeave = (): void => {
    this.reflow(this.entries);
  };

  private onListPointerMove = (evt: PointerEvent): void => {
    if (!this.dragElement) {
      return;
    }

    const [newY, newIndex] = this.getDragYAndIndex(evt);
    if (newIndex !== this.dragToIndex) {
      this.reflow(this.getDragEntries(newIndex));
      this.dragToIndex = newIndex;
    }

    this.dragElement.style.transform = `translateY(${newY}px)`;

    const viewportHeight = getViewportHeight();
    const scrollMaxSpeedMargin = viewportHeight * DRAG_SCROLL_MAX_SPEED_MARGIN_PERCENT;
    const scrollGradualWindow = viewportHeight * DRAG_SCROLL_GRADUAL_WINDOW_PERCENT;
    if (evt.pageY < this.listPageY + scrollMaxSpeedMargin) {
      this.template.songList.scrollTop = Math.max(
        0,
        this.template.songList.scrollTop - DRAG_SCROLL_MAX_SPEED,
      );
    } else if (evt.pageY > viewportHeight - scrollMaxSpeedMargin) {
      this.template.songList.scrollTop = Math.min(
        this.template.songList.scrollHeight,
        this.template.songList.scrollTop + DRAG_SCROLL_MAX_SPEED,
      );
    } else if (evt.pageY < this.listPageY + scrollMaxSpeedMargin + scrollGradualWindow) {
      const percentFromTopOfWindow =
        (evt.pageY - this.listPageY - scrollMaxSpeedMargin) / scrollGradualWindow;
      this.template.songList.scrollTop = Math.max(
        0,
        this.template.songList.scrollTop - percentFromTopOfWindow * DRAG_SCROLL_MAX_SPEED,
      );
    } else if (evt.pageY > viewportHeight - scrollMaxSpeedMargin - scrollGradualWindow) {
      const percentFromBottomOfWindow =
        (viewportHeight - evt.pageY - scrollMaxSpeedMargin) / scrollGradualWindow;
      this.template.songList.scrollTop = Math.min(
        this.template.songList.scrollHeight,
        this.template.songList.scrollTop + percentFromBottomOfWindow * DRAG_SCROLL_MAX_SPEED,
      );
    }
  };

  private onBodyPointerMove = (evt: PointerEvent): void => {
    if (!this.dragIcon) {
      this.stopDrag();
      return;
    }
    this.dragIcon.style.transform = `translate(${evt.pageX}px ${evt.pageY}px)`;
  };

  private onListPointerUp = (evt: PointerEvent): void => {
    if (!this.dragRequest) {
      return;
    }
    const dragEntries = this.getDragEntries(this.getDragYAndIndex(evt)[1]);
    evt.stopPropagation();
    api
      .fetch('order_requests', { order: dragEntries.map((entry) => entry.id).join(',') })
      .catch((err: unknown) => {
        showErrorTooltip(err, this.dragIcon || this.dragElement || this.template.songList);
      })
      .finally(() => {
        this.stopDrag();
      });
  };

  private onBodyPointerUp = (): void => {
    this.stopDrag();
  };

  private stopDrag = (): void => {
    if (this.dragElement) {
      this.dragElement.classList.remove('requests-panel-list-entry--dragging');
    }
    this.template.songList.classList.remove('requests-panel-list--dragging');
    document.body.classList.remove('requests-panel-dragging');

    this.dragElement = undefined;
    this.dragRequest = undefined;
    this.dragToIndex = 0;

    if (this.dragIcon) {
      document.body.removeChild(this.dragIcon);
    }
    this.dragIcon = undefined;

    this.template.songList.removeEventListener('pointerleave', this.onListPointerLeave);
    this.template.songList.removeEventListener('pointermove', this.onListPointerMove);
    this.template.songList.removeEventListener('pointerup', this.onListPointerUp);
    document.body.removeEventListener('pointermove', this.onBodyPointerMove);
    document.body.removeEventListener('pointerup', this.onBodyPointerUp);
  };

  private reflow = (entries: components['schemas']['requests']): void => {
    let runningHeight = 0;
    entries.forEach((entry) => {
      const el = this.elements.get(entry.id);
      if (el && (!this.dragRequest || entry.id !== this.dragRequest.id)) {
        el.style.transform = `translateY(${runningHeight}px)`;
      }
      runningHeight += this.elementHeight;
    });
  };

  private onPauseUnpauseClick = (): void => {
    if (api.user.requests_paused) {
      api.fetch('unpause_request_queue', undefined).catch((err: unknown) => {
        showErrorTooltip(err, this.template.pauseUnpauseButton);
      });
    } else {
      api.fetch('pause_request_queue', undefined).catch((err: unknown) => {
        showErrorTooltip(err, this.template.pauseUnpauseButton);
      });
    }
  };

  private onUserUpdate = (_user: components['schemas']['user']): void => {
    this.updateStatus();
  };

  private onClearClick = (): void => {
    api.fetch('clear_requests', undefined).catch((err: unknown) => {
      showErrorTooltip(err, this.template.clearButton);
    });
  };

  private onUnratedFillClick = (): void => {
    api.fetch('request_unrated_songs', undefined).catch((err: unknown) => {
      showErrorTooltip(err, this.template.unratedFillButton);
    });
  };

  private onFaveFillClick = (): void => {
    api.fetch('request_favorited_songs', undefined).catch((err: unknown) => {
      showErrorTooltip(err, this.template.faveFillButton);
    });
  };

  private onDelete = (evt: PointerEvent): void => {
    const request = this.getRequestFromPointerEvent(evt);
    if (!request) {
      return;
    }
    const element = this.elements.get(request.id);
    if (!element) {
      return;
    }
    // TODO add --delete class to element
    api.fetch('delete_request', { song_id: request.id }).catch((err: unknown) => {
      showErrorTooltip(err, element);
    });
  };

  private updateStatus = (): void => {
    if (api.user.requests_paused) {
      this.template.$root.classList.add('requests-panel--paused');
      this.template.pauseUnpauseLabel.textContent = $l('unpause_request_queue');
    } else {
      this.template.$root.classList.add('requests-panel--paused');
      this.template.pauseUnpauseLabel.textContent = $l('pause_request_queue');
    }

    this.template.$root.classList.remove('requests-panel--warning');
    menuRequestsLabel.classList.remove(`${menuRequestsLabel.dataset.className}--warning`);

    if (api.user.tuned_in) {
      if (api.user.requests_paused) {
        this.header.textContent = $l('request_grab_tag__paused');
        menuRequestsLabel.textContent = $l('request_grab_tag__paused');
      } else {
        const goodRequests = this.entries.filter((entry) => entry.valid);
        const allBad = goodRequests.length === this.entries.length;

        if (allBad) {
          this.header.textContent = $l('requests_all_on_cooldown');
          this.template.$root.classList.add('requests-panel--warning');
          menuRequestsLabel.textContent = $l('Requests');
          menuRequestsLabel.classList.add(`${menuRequestsLabel.dataset.className}--warning`);
        } else if (api.user.request_position) {
          this.header.textContent = $l('request_you_are_x_in_line', {
            position: api.user.request_position,
          });
          menuRequestsLabel.textContent = this.header.textContent;
        } else if (goodRequests.length > 0) {
          menuRequestsLabel.textContent = $l('#_requests', {
            num_requests: goodRequests.length,
          });
          menuRequestsLabel.textContent = $l('Requests');
        } else {
          this.header.textContent = $l('Requests');
          menuRequestsLabel.textContent = $l('Requests');
        }
      }
    } else {
      this.header.textContent = $l('Requests');
      menuRequestsLabel.textContent = $l('Requests');
    }
  };
}

export { RequestsPanel };
