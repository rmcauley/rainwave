import { RainwaveError, RainwaveSDKDisconnectedError, RainwaveSDKUsageError } from './errors';
import { RainwaveEventListener } from './eventListener';
import { didAnActionFail } from './utils/didAnActionFail';

import type { RainwaveRequests } from './requestTypes';
import type { RainwaveResponseTypes } from './responseTypes';
import type { AllAlbumsPaginated, AllGroupsPaginated, AllArtistsPaginated } from './types';
import type { Station } from './types/station';

const PING_INTERVAL = 45000;
const DEFAULT_RECONNECT_TIMEOUT = 500;
const STATELESS_REQUESTS: Array<keyof RainwaveRequests> = ['ping', 'pong'];
const MAX_QUEUED_REQUESTS = 10;
const SINGLE_REQUEST_TIMEOUT = 4000;

interface RainwaveRequest {
  action: keyof RainwaveRequests;
  params: unknown;
  messageId?: number;
  resolve: (data: unknown) => void;
  reject: (error: unknown) => void;
}

interface RainwaveOptions {
  userId: number;
  apiKey: string;
  sid: Station;
  url?: string;
  debug?: typeof console.log;
  onSocketError?: (evt: Event) => void;
}

class RainwaveApi extends RainwaveEventListener<RainwaveResponseTypes> {
  private _userId: number;
  private _apiKey: string;
  private _sid: Station;
  private _url: string;
  private _debug: typeof console.log;
  private _externalOnSocketError: NonNullable<RainwaveOptions['onSocketError']>;
  private _socket?: WebSocket;
  private _isOk?: boolean = false;
  private _socketTimeoutTimer: number | null = null;
  private _pingInterval: number | null = null;
  private _socketStaysClosed: boolean = false;
  private _socketIsBusy: boolean = false;
  private _authPromiseResolve?: (authOk: boolean) => void;
  private _authPromiseReject?: (error: unknown) => void;

  private _currentScheduleId: number | undefined;
  private _requestId: number = 0;
  private _requestQueue: RainwaveRequest[] = [];
  private _sentRequests: RainwaveRequest[] = [];

  constructor(options: RainwaveOptions) {
    super();

    this._userId = options.userId;
    this._apiKey = options.apiKey;
    this._sid = options.sid;
    this._url = options.url || 'wss://core.rainwave.cc/api4/websocket/';
    this._debug = options?.debug || ((): void => {});
    this._externalOnSocketError = options?.onSocketError || ((): void => {});

    this.addEventListener('wsok', this._onAuthenticationOK.bind(this));
    this.addEventListener('wserror', this._onAuthenticationFailure.bind(this));
    this.addEventListener('ping', this._onPing.bind(this));
    this.addEventListener('sched_current', (current) => {
      this._currentScheduleId = current.id;
    });
  }

  private _getNextRequestId(): number {
    this._requestId += 1;

    return this._requestId;
  }

  // Socket Functions **************************************************************************************

  /**
   * Connect, authenticate, get current Rainwave status, and subscribe to Rainwave API events.
   *
   * @category Connection
   */
  public startWebSocketSync(): Promise<boolean> {
    if (this._socket && this._socket.readyState === this._socket.OPEN) {
      return Promise.resolve(true);
    }

    if (this._socketTimeoutTimer) {
      clearTimeout(this._socketTimeoutTimer);
    }

    const socket = new WebSocket(`${this._url}${this._sid}`);
    socket.onmessage = this._onMessage.bind(this);
    socket.onclose = this._onSocketClose.bind(this);
    socket.onerror = this._onSocketError.bind(this);
    socket.onopen = this._onSocketOpen.bind(this);
    this._socket = socket;

    return new Promise<boolean>((resolve, reject) => {
      this._authPromiseResolve = resolve;
      this._authPromiseReject = reject;
    });
  }

  /**
   * Disconnect from the Rainwave API.
   *
   * @category Connection
   */
  public stopWebSocketSync(): Promise<void> {
    if (
      !this._socket ||
      this._socket.readyState === this._socket.CLOSING ||
      this._socket.readyState === this._socket.CLOSED
    ) {
      return Promise.resolve();
    }

    this._socketStaysClosed = true;
    this._socket.close();
    this._debug('Socket closed by SDK.');

    return new Promise((resolve) => {
      this._authPromiseReject = (): void => resolve();
    });
  }

  private _cleanVariablesOnClose(event?: CloseEvent | ErrorEvent): void {
    if (event) {
      this._debug(JSON.stringify(Object.keys(event)));
    }
    this._isOk = false;
    if (this._socketTimeoutTimer) {
      clearTimeout(this._socketTimeoutTimer);
      this._socketTimeoutTimer = null;
    }
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
    if (this._authPromiseReject) {
      this._authPromiseReject(event);
    }
    this._authPromiseReject = undefined;
    this._authPromiseResolve = undefined;
    this._sentRequests.forEach((rwRequest) => {
      rwRequest.reject(new RainwaveSDKDisconnectedError('Socket closed.'));
    });
    this._sentRequests = [];
  }

  private _onSocketClose(event: CloseEvent): void {
    const staysClosed = this._socketStaysClosed || !!this._authPromiseReject;
    this._cleanVariablesOnClose(event);
    if (staysClosed) {
      return;
    }

    this._debug('Socket closed on event.');
    setTimeout(() => {
      void this.startWebSocketSync();
    }, DEFAULT_RECONNECT_TIMEOUT);
  }

  private _onSocketError(event: Event): void {
    this.emit('error', { code: 0, tl_key: 'sync_retrying', text: '' });
    this._externalOnSocketError(event);
    this._socket?.close();
  }

  private _onSocketOpen(): void {
    this._socketSend({
      action: 'auth',
      user_id: this._userId,
      key: this._apiKey,
    });
  }

  private _onAuthenticationOK(): void {
    this._debug('Rainwave connected successfully.');
    this.emit('sdk_error_clear', { tl_key: 'sync_retrying' });
    this._isOk = true;

    if (!this._pingInterval) {
      this._pingInterval = setInterval(this._ping.bind(this), PING_INTERVAL) as unknown as number;
    }

    this._socketSend({
      action: 'check_sched_current_id',
      sched_id: this._currentScheduleId || 1,
    });

    this._nextRequest();

    if (this._authPromiseResolve) {
      this._authPromiseResolve(true);
      this._authPromiseResolve = undefined;
      this._authPromiseReject = undefined;
    }
  }

  private _onAuthenticationFailure(error: RainwaveResponseTypes['wserror']): void {
    if (error.tl_key === 'auth_failed') {
      this._debug('Authorization failed for Rainwave websocket.  Wrong API key/user ID combo.');
      this.emit('error', error);
      if (this._authPromiseReject) {
        this._authPromiseReject(
          new RainwaveError('Authentication failed.', { wserror: error }, error.tl_key, error.text),
        );
        this._authPromiseReject = undefined;
        this._authPromiseResolve = undefined;
      }
      this._socketStaysClosed = true;
      this._socket?.close();
    }
  }

  private _socketSend(message: unknown): void {
    if (!this._socket) {
      throw new RainwaveSDKUsageError('Attempted to send to a disconnected socket.');
    }
    let jsonmsg: string;
    try {
      jsonmsg = JSON.stringify(message);
    } catch (error) {
      this.emit('sdk_exception', error as Error);

      return;
    }
    try {
      this._socket.send(jsonmsg);
    } catch (error) {
      this.emit('sdk_exception', error as Error);
    }
  }

  // Error Handling ****************************************************************************************

  private _reconnectSocket(): void {
    if (this._socket) {
      // _onSocketClose will reconnect after the close is complete
      this._socket.close();
    }
  }

  // Ping and Pong *****************************************************************************************

  private _ping(): void {
    this._socketSend('ping');
  }

  private _onPing(): void {
    this._socketSend('pong');
  }

  // Data From API *****************************************************************************************

  private _onMessage(message: MessageEvent): void {
    this.emit('sdk_error_clear', { tl_key: 'sync_retrying' });
    if (this._socketTimeoutTimer) {
      clearTimeout(this._socketTimeoutTimer);
      this._socketTimeoutTimer = null;
    }

    let json: Partial<RainwaveResponseTypes>;
    try {
      json = JSON.parse(message.data as string) as Partial<RainwaveResponseTypes>;
    } catch (error) {
      this._debug(JSON.stringify(message));
      this._debug(error);
      this.emit('sdk_exception', error as Error);
      this._reconnectSocket();

      return;
    }

    if (!json) {
      this._debug(JSON.stringify(message));
      this._debug('Response from Rainwave API was blank!');
      this._reconnectSocket();

      return;
    }

    const matchingSentRequest = this._sentRequests.find(
      (rq) => rq.messageId === json.message_id?.message_id,
    );

    if (matchingSentRequest) {
      this._sentRequests = this._sentRequests.filter(
        (rq) => rq.messageId !== json.message_id?.message_id,
      );
      const successFalse = didAnActionFail(json);
      if (successFalse) {
        matchingSentRequest.reject(
          new RainwaveError(successFalse.text, json, successFalse.tl_key, successFalse.text),
        );
      } else if (json.error) {
        matchingSentRequest.reject(
          new RainwaveError(json.error.text, json, json.error.tl_key, json.error.text),
        );
      } else {
        matchingSentRequest.resolve(json);
      }
    }

    if (json.sync_result) {
      if (json.sync_result.tl_key === 'station_offline') {
        this.emit('error', json.sync_result);
      } else {
        this.emit('sdk_error_clear', { tl_key: 'station_offline' });
      }
    }

    this._performCallbacks(json);
    this._nextRequest();
  }

  // Calls To API ******************************************************************************************

  private _request(request: Omit<RainwaveRequest, 'messageId'>): void {
    if (STATELESS_REQUESTS.indexOf(request.action) !== -1 || !this._isOk) {
      this._requestQueue = this._requestQueue.filter((rq) => rq.action !== request.action);
    }
    this._requestQueue.push(request);
    if (!this._socketIsBusy && this._isOk) {
      this._nextRequest();
    }
  }

  private _nextRequest(): void {
    const request = this._requestQueue.shift();

    if (!request) {
      this._socketIsBusy = false;

      return;
    }
    if (!this._isOk) {
      return;
    }

    if (STATELESS_REQUESTS.indexOf(request.action) === -1) {
      request.messageId = this._getNextRequestId();
      if (this._sentRequests.length > MAX_QUEUED_REQUESTS) {
        this._sentRequests.splice(0, this._sentRequests.length - MAX_QUEUED_REQUESTS);
      }
    }

    if (this._socketTimeoutTimer) {
      clearTimeout(this._socketTimeoutTimer);
    }
    this._socketTimeoutTimer = setTimeout(() => {
      this._onRequestTimeout(request);
    }, SINGLE_REQUEST_TIMEOUT) as unknown as number;

    this._socketSend({
      ...request,
      sid: this._sid,
    });
    this._sentRequests.push(request);
  }

  private _onRequestTimeout(request: RainwaveRequest): void {
    if (this._socketTimeoutTimer) {
      this._socketTimeoutTimer = null;
      this._requestQueue.unshift(request);
      this._debug('Looks like the connection timed out.');
      this.emit('error', { code: 0, text: '', tl_key: 'sync_retrying' });
      this._reconnectSocket();
    }
  }

  // Callback Handling *************************************************************************************

  private _performCallbacks(json: Partial<RainwaveResponseTypes>): void {
    // Make sure any vote results are registered after the schedule has been loaded.
    const alreadyVoted = json.already_voted;
    const liveVoting = json.live_voting;
    if (alreadyVoted) {
      delete json.already_voted;
    }
    if (liveVoting) {
      delete json.live_voting;
    }

    Object.keys(json).forEach((responseKey) => {
      const typedKey = responseKey as keyof RainwaveResponseTypes;
      const response = json[typedKey];

      if (response !== undefined) {
        this.emit(typedKey, response);
      }
    });

    if ('sched_current' in json) {
      this.emit('sdk_schedule_synced', true);
    }

    if (alreadyVoted) {
      this.emit('already_voted', alreadyVoted);
    }

    if (liveVoting) {
      this.emit('live_voting', liveVoting);
    }
  }

  // API calls ***********************************************************************************************

  fetch<T extends keyof RainwaveRequests>(
    action: T,
    params: RainwaveRequests[T]['params'],
  ): Promise<RainwaveRequests[T]['response']> {
    return new Promise((resolve, reject) => {
      this._request({ action, params, reject, resolve });
    });
  }

  async allAlbums(
    progressCallback?: (progress: number) => void,
  ): Promise<AllAlbumsPaginated['data']> {
    let result = await this.fetch('all_albums_paginated', {});
    let albums = result.all_albums_paginated.data;
    if (progressCallback) {
      progressCallback(result.all_albums_paginated.progress * 100);
    }
    while (result.all_albums_paginated.has_next) {
      result = await this.fetch('all_albums_paginated', {
        after: result.all_albums_paginated.next,
      });
      albums = albums.concat(result.all_albums_paginated.data);
      if (progressCallback) {
        progressCallback(result.all_albums_paginated.progress * 100);
      }
    }

    return albums;
  }

  async allArtists(
    progressCallback?: (progress: number) => void,
  ): Promise<AllArtistsPaginated['data']> {
    let result = await this.fetch('all_artists_paginated', {});
    let artists = result.all_artists_paginated.data;
    if (progressCallback) {
      progressCallback(result.all_artists_paginated.progress * 100);
    }
    while (result.all_artists_paginated.has_next) {
      result = await this.fetch('all_artists_paginated', {
        after: result.all_artists_paginated.next,
      });
      artists = artists.concat(result.all_artists_paginated.data);
      if (progressCallback) {
        progressCallback(result.all_artists_paginated.progress * 100);
      }
    }

    return artists;
  }

  async allGroups(
    progressCallback?: (progress: number) => void,
  ): Promise<AllGroupsPaginated['data']> {
    let result = await this.fetch('all_groups_paginated', {});
    let groups = result.all_groups_paginated.data;
    if (progressCallback) {
      progressCallback(result.all_groups_paginated.progress * 100);
    }
    while (result.all_groups_paginated.has_next) {
      result = await this.fetch('all_groups_paginated', {
        after: result.all_groups_paginated.next,
      });
      groups = groups.concat(result.all_groups_paginated.data);
      if (progressCallback) {
        progressCallback(result.all_groups_paginated.progress * 100);
      }
    }

    return groups;
  }
}

export type { RainwaveOptions };
export { RainwaveApi };
