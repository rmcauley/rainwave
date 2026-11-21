import type { components, paths } from './rainwave-openapi';

type RainwaveAction = keyof {
  [
    K in keyof paths as paths[K] extends { post: unknown }
      ? K extends `/${infer Rest}`
        ? Rest
        : K
      : never
  ]: unknown;
};

type RainwaveParams<A extends RainwaveAction> = paths[`/${A}`] extends {
  post: { requestBody: { content: { 'application/json': infer T } } };
}
  ? T
  : undefined;

type RainwaveResponse<A extends RainwaveAction> =
  paths[`/${A}`]['post']['responses']['default']['content']['application/json'];

type TimelineEntry = components['schemas']['_timeline_entry'];
type TimelineSong = components['schemas']['_timeline_song'];
type RainwaveUser = components['schemas']['user'];

type RainwaveCallback<T extends keyof components['schemas']> = (
  result: components['schemas'][T],
) => void;

interface RainwaveBootstrap {
  all_stations_info: components['schemas']['all_stations_info'];
  already_voted: components['schemas']['already_voted'];
  api_info: components['schemas']['api_info'];
  build_version: components['schemas']['build_version'];
  cookie_domain: components['schemas']['cookie_domain'];
  live_voting: components['schemas']['live_voting'];
  locale: components['schemas']['locale'];
  locales: components['schemas']['locales'];
  mobile: boolean;
  relays: components['schemas']['relays'];
  request_line: components['schemas']['request_line'];
  requests: components['schemas']['requests'];
  sched_current: components['schemas']['sched_current'];
  sched_history: components['schemas']['sched_history'];
  sched_next: components['schemas']['sched_next'];
  station_list: components['schemas']['station_list'];
  stream_filename: components['schemas']['stream_filename'];
  user: components['schemas']['user'] & { api_key: string };
  websocket_host: components['schemas']['websocket_host'];
}

export type {
  RainwaveAction,
  RainwaveParams,
  RainwaveResponse,
  TimelineEntry,
  RainwaveBootstrap,
  TimelineSong,
  RainwaveUser,
  RainwaveCallback,
};
