import { RainwaveError, RainwaveSDKDisconnectedError, RainwaveSDKUsageError } from './errors';
import { RainwaveEventListener } from './eventListener';

import type { RainwaveSDKInvalidRatingError } from './errors';
import type { components } from './rainwave-openapi';
import type { RainwaveAction, RainwaveParams, RainwaveResponse } from './types';

const DEFAULT_RECONNECT_TIMEOUT = 500;
const MAX_QUEUED_REQUESTS = 10;
const STALLED_SOCKET_TIMEOUT = 10_000;

type RainwaveResolveFn<T extends RainwaveAction> = (value: RainwaveResponse<T>) => void;

type RainwaveRejectFn = (
  error:
    | RainwaveError
    | RainwaveSDKUsageError
    | RainwaveSDKInvalidRatingError
    | RainwaveSDKDisconnectedError,
) => void;

type RainwaveRequest<T extends RainwaveAction> = {
  action: T;
  params: RainwaveParams<T>;
  messageId?: number;
  resolve: RainwaveResolveFn<T>;
  reject: RainwaveRejectFn;
};

type RainwaveRequestWithKey = Partial<{
  [T in RainwaveAction]: RainwaveRequest<T>;
}>;

interface RainwaveOptions {
  userId: number;
  apiKey: string;
  sid: components['schemas']['_station_id'];
  url?: string;
  debug?: typeof console.log;
  onSocketError?: (evt: Event) => void;
}

interface RainwaveApiSdkSchemas {
  sdk_error_clear: { tl_key: string };
  sdk_exception: Error;
  sdk_schedule_synced: boolean;
}

class RainwaveApi extends RainwaveEventListener<components['schemas'] & RainwaveApiSdkSchemas> {
  private _userId: number;
  private _apiKey: string;
  private _sid: components['schemas']['_station_id'];
  private _url: string;
  private _debug: typeof console.log;
  private _externalOnSocketError: NonNullable<RainwaveOptions['onSocketError']>;
  private _socket?: WebSocket;
  private _hasAuthorized?: boolean = false;
  private _pingTimeoutTimer: number | null = null;
  private _socketActivityTimeoutTimer: number | null = null;
  private _socketStaysClosed: boolean = false;
  private _socketIsBusy: boolean = false;

  private _currentScheduleId: number | undefined;
  private _requestId: number = 0;
  private _requestQueue: RainwaveRequestWithKey[] = [];
  private _sentRequests: RainwaveRequestWithKey[] = [];

  constructor(options: RainwaveOptions) {
    super();

    this._userId = options.userId;
    this._apiKey = options.apiKey;
    this._sid = options.sid;
    this._url = options.url || 'wss://core.rainwave.cc/api4/websocket/';
    this._debug = options?.debug || ((): void => {});
    this._externalOnSocketError = options?.onSocketError || ((): void => {});

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
  public async startWebSocketSync(): Promise<RainwaveResponse<'auth'>> {
    if (this._socket && this._socket.readyState === this._socket.OPEN && this._hasAuthorized) {
      return Promise.resolve({ wsok: true });
    } else if (this._socket && this._socket.readyState !== this._socket.CLOSED) {
      throw new RainwaveSDKUsageError(
        'startWebSocketSync was called without waiting for an existing connection to complete.',
      );
    }

    this._socketStaysClosed = false;
    this._cleanVariablesOnClose();

    const socket = new WebSocket(`${this._url}${this._sid}`);
    socket.addEventListener('message', this._onMessage.bind(this));
    socket.addEventListener('close', this._onSocketClose.bind(this));
    socket.addEventListener('error', this._onSocketError.bind(this));
    socket.addEventListener('open', this._onSocketOpen.bind(this));
    this._socket = socket;

    try {
      const authResult = await this.fetch('auth', { user_id: this._userId, key: this._apiKey });
      if (authResult.wsok) {
        this._onAuthenticationOK();
      }

      return authResult;
    } catch (err) {
      // If it's an RW error (not e.g. a network error) we treat this as an auth failure.
      if (err instanceof RainwaveError) {
        this._onAuthenticationFailure();
      }

      throw err;
    }
  }

  /**
   * Disconnect from the Rainwave API.
   *
   * @category Connection
   */
  public stopWebSocketSync(): Promise<void> {
    const socket = this._socket;

    if (!socket || socket.readyState === socket.CLOSED) {
      return Promise.resolve();
    }

    this._socketStaysClosed = true;

    return new Promise((resolve) => {
      const onClose = (): void => {
        socket.removeEventListener('close', onClose);
        resolve();
      };

      socket.addEventListener('close', onClose, { once: true });

      if (socket.readyState !== socket.CLOSING) {
        socket.close();
        this._debug('Socket closed by SDK.');
      }
    });
  }

  private _ping(): void {
    this.fetch('ping', {}).catch(() => {
      // Suppress any error, we don't really care, the rest of this class
      // will handle connection errors for us.
      // This is just to stop promise rejection noise from hitting the console.
    });
  }

  private _cleanVariablesOnClose(event?: CloseEvent | ErrorEvent): void {
    if (event) {
      this._debug(JSON.stringify(Object.keys(event)));
    }
    this._hasAuthorized = false;
    if (this._socketActivityTimeoutTimer) {
      clearTimeout(this._socketActivityTimeoutTimer);
      this._socketActivityTimeoutTimer = null;
    }
    if (this._pingTimeoutTimer) {
      clearTimeout(this._pingTimeoutTimer);
      this._pingTimeoutTimer = null;
    }
    this._sentRequests.forEach((rwRequest) => {
      Object.values(rwRequest).forEach((req) => {
        req.reject(new RainwaveSDKDisconnectedError('Socket closed.'));
      });
    });
    this._sentRequests = [];
    this._requestQueue.forEach((rwRequest) => {
      Object.values(rwRequest).forEach((req) => {
        req.reject(new RainwaveSDKDisconnectedError('Socket closed.'));
      });
    });
    this._requestQueue = [];
    this._socketIsBusy = false;
  }

  private _retryStartWebSocketSync(): void {
    this.startWebSocketSync().catch((error) => {
      if (error instanceof RainwaveSDKUsageError) {
        setTimeout(() => {
          this._retryStartWebSocketSync();
        }, DEFAULT_RECONNECT_TIMEOUT);
      }
    });
  }

  private _onSocketClose(event: CloseEvent): void {
    this._socket = undefined;
    this._cleanVariablesOnClose(event);
    if (this._socketStaysClosed) {
      return;
    }

    this._debug('Socket closed on event.');
    setTimeout(() => {
      this._retryStartWebSocketSync();
    }, DEFAULT_RECONNECT_TIMEOUT);
  }

  private _onSocketError(event: Event): void {
    this.emit('error', { code: 0, tl_key: 'sync_retrying', text: '' });
    this._externalOnSocketError(event);
    this._socket?.close();
  }

  private _onSocketOpen(): void {
    this._nextRequest();
  }

  private _onAuthenticationOK(): void {
    this._debug('Rainwave connected successfully.');
    this.emit('sdk_error_clear', { tl_key: 'sync_retrying' });
    this._hasAuthorized = true;

    this._socketSend({
      action: 'check_sched_current_id',
      sched_id: this._currentScheduleId || 1,
    });

    this._nextRequest();

    this._pingTimeoutTimer = setInterval(
      this._ping.bind(this),
      STALLED_SOCKET_TIMEOUT - 1000,
    ) as unknown as number;
  }

  private _onAuthenticationFailure(): void {
    this._debug('Authorization failed for Rainwave websocket.');
    this._socketStaysClosed = true;
    this._socket?.close();
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

  // Data From API *****************************************************************************************

  private _onMessage(message: MessageEvent): void {
    this.emit('sdk_error_clear', { tl_key: 'sync_retrying' });
    if (this._socketActivityTimeoutTimer) {
      clearTimeout(this._socketActivityTimeoutTimer);
      this._socketActivityTimeoutTimer = null;
    }

    let json: Partial<components['schemas']>;
    try {
      json = JSON.parse(message.data as string) as Partial<components['schemas']>;
    } catch (error) {
      this._debug(JSON.stringify(message));
      this._debug(error);
      this.emit('sdk_exception', error as Error);
      this._reconnectSocket();

      return;
    }

    if (!json) {
      this._debug(JSON.stringify(message));
      this._debug('Response from src.backend.rainwave API was blank!');
      this._reconnectSocket();

      return;
    }

    const matchingSentRequest = this._sentRequests.find((requestWithKey) =>
      Object.values(requestWithKey).find(
        (request) => request.messageId === json.message_id?.message_id,
      ),
    );

    if (matchingSentRequest) {
      this._sentRequests = this._sentRequests.filter(
        (requestWithKey) => requestWithKey !== matchingSentRequest,
      );
      const jsonError = json.error || json.wsthrottle || json.wserror;
      if (jsonError) {
        Object.values(matchingSentRequest).forEach((req) => {
          req.reject(new RainwaveError(jsonError.text, json, jsonError.tl_key, jsonError.text));
        });
      } else {
        Object.values(matchingSentRequest).forEach((req) => {
          // Just get Typescript to ignore this, the server has sent what we expect.
          req.resolve(json as never);
        });
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

  private _request<T extends RainwaveAction>(
    action: T,
    params: RainwaveParams<T>,
    resolve: RainwaveResolveFn<T>,
    reject: RainwaveRejectFn,
  ): void {
    this._requestQueue.push({
      [action]: {
        action,
        params,
        reject,
        resolve,
      },
    });
    if (!this._socketIsBusy) {
      this._nextRequest();
    }
  }

  private _nextRequest(): void {
    // This first half of the if always allows auth requests through to the server.
    if (!this._requestQueue[0]?.auth && !this._hasAuthorized) {
      return;
    }

    if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const requestWithKey = this._requestQueue.shift();

    if (!requestWithKey) {
      this._socketIsBusy = false;

      return;
    }

    this._socketIsBusy = true;

    // The way RequestWithKey is built, there'll always
    // be 1 and only 1 value we can extract that safely.
    const request = Object.values(requestWithKey)[0]!;

    request.messageId = this._getNextRequestId();
    if (this._sentRequests.length > MAX_QUEUED_REQUESTS) {
      this._sentRequests.splice(0, this._sentRequests.length - MAX_QUEUED_REQUESTS);
    }

    if (this._socketActivityTimeoutTimer) {
      clearTimeout(this._socketActivityTimeoutTimer);
    }
    this._socketActivityTimeoutTimer = setTimeout(() => {
      this._onActivityTimeout(requestWithKey);
    }, STALLED_SOCKET_TIMEOUT) as unknown as number;

    this._socketSend({
      action: request.action,
      message_id: request.messageId,
      sid: this._sid,
      ...request.params,
    });
    this._sentRequests.push(requestWithKey);
  }

  private _onActivityTimeout(request: RainwaveRequestWithKey): void {
    if (this._socketActivityTimeoutTimer) {
      this._socketActivityTimeoutTimer = null;
      this._requestQueue.unshift(request);
      this._debug('Looks like the connection timed out.');
      this.emit('error', { code: 0, text: '', tl_key: 'sync_retrying' });
      this._reconnectSocket();
    }
  }

  // Callback Handling *************************************************************************************

  private _performCallbacks(json: Partial<components['schemas']>): void {
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
      const typedKey = responseKey as keyof components['schemas'];
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

  fetch<T extends RainwaveAction>(
    action: T,
    params: RainwaveParams<T>,
  ): Promise<RainwaveResponse<T>> {
    return new Promise((resolve, reject) => {
      this._request(action, params, resolve, reject);
    });
  }

  async allAlbums(
    progressCallback?: (progress: number) => void,
  ): Promise<RainwaveResponse<'all_albums_paginated'>['all_albums_paginated']['data']> {
    let result = await this.fetch('all_albums_paginated', {});
    let albums = result.all_albums_paginated.data;
    if (progressCallback) {
      progressCallback(result.all_albums_paginated.progress * 100);
    }
    while (result.all_albums_paginated.has_more) {
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
  ): Promise<RainwaveResponse<'all_artists_paginated'>['all_artists_paginated']['data']> {
    let result = await this.fetch('all_artists_paginated', {});
    let artists = result.all_artists_paginated.data;
    if (progressCallback) {
      progressCallback(result.all_artists_paginated.progress * 100);
    }
    while (result.all_artists_paginated.has_more) {
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
  ): Promise<RainwaveResponse<'all_groups_paginated'>['all_groups_paginated']['data']> {
    let result = await this.fetch('all_groups_paginated', {});
    let groups = result.all_groups_paginated.data;
    if (progressCallback) {
      progressCallback(result.all_groups_paginated.progress * 100);
    }
    while (result.all_groups_paginated.has_more) {
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
