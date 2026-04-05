import type { components, paths } from './rainwave-openapi';

type JsonBody<T> = T extends { requestBody: { content: { 'application/json': infer B } } }
  ? B
  : never;

type JsonResponse<T> = T extends {
  responses: { default: { content: { 'application/json': infer R } } };
}
  ? R
  : never;

type PostApiPath = {
  [P in keyof paths]: paths[P] extends { post: unknown } ? P : never;
}[keyof paths] &
  `/api4/${string}`;

type RainwaveAction = PostApiPath extends `/api4/${infer A}` ? A : never;

type PathForAction<A extends RainwaveAction> = Extract<PostApiPath, `/api4/${A}`>;

type OperationForAction<A extends RainwaveAction> = paths[PathForAction<A>]['post'];

type RainwaveParams<A extends RainwaveAction> = JsonBody<OperationForAction<A>>;
type RainwaveResponse<A extends RainwaveAction> = JsonResponse<OperationForAction<A>>;

type TimelineEntry = components['schemas']['_timeline_entry'];
type TimelineSong = components['schemas']['_timeline_song'];
type RainwaveUser = components['schemas']['user'];
type RainwaveSchemas = components['schemas'];

type RainwaveCallback<T extends keyof components['schemas']> = (
  result: components['schemas'][T],
) => void;

interface RainwaveBootstrap {
  all_stations_info: RainwaveSchemas['all_stations_info'];
  already_voted: RainwaveSchemas['already_voted'];
  api_info: RainwaveSchemas['api_info'];
  build_version: RainwaveSchemas['build_version'];
  cookie_domain: RainwaveSchemas['cookie_domain'];
  live_voting: RainwaveSchemas['live_voting'];
  locale: RainwaveSchemas['locale'];
  locales: RainwaveSchemas['locales'];
  mobile: boolean;
  relays: RainwaveSchemas['relays'];
  request_line: RainwaveSchemas['request_line'];
  requests: RainwaveSchemas['requests'];
  sched_current: RainwaveSchemas['sched_current'];
  sched_history: RainwaveSchemas['sched_history'];
  sched_next: RainwaveSchemas['sched_next'];
  station_list: RainwaveSchemas['station_list'];
  stream_filename: RainwaveSchemas['stream_filename'];
  user: RainwaveSchemas['user'] & { api_key: string };
  websocket_host: RainwaveSchemas['websocket_host'];
}

export type {
  RainwaveAction,
  RainwaveParams,
  RainwaveResponse,
  TimelineEntry,
  RainwaveSchemas,
  RainwaveBootstrap,
  TimelineSong,
  RainwaveUser,
  RainwaveCallback,
};
