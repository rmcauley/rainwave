export function fave(context: unknown): { $root: DocumentFragment; fave: HTMLDivElement };
export function song(context: unknown): {
  $root: DocumentFragment;
  root: HTMLDivElement;
  cancel?: HTMLDivElement;
  vote_button_text: HTMLSpanElement;
  request_drag?: HTMLDivElement;
  art: HTMLDivElement;
  votes: HTMLSpanElement;
  title: HTMLDivElement;
  cooldown?: HTMLDivElement;
  artists: Array<{ $root: DocumentFragment }>;
};
export function searchlist(context: unknown): {
  $root: DocumentFragment;
  box_container: HTMLDivElement;
  loading_bar: HTMLDivElement;
  search_box: HTMLInputElement;
  cancel: HTMLImageElement;
  no_result_message: HTMLDivElement;
  no_result_search_active_message: HTMLDivElement;
  list: HTMLDivElement;
};
export function mobileRating(context: unknown): {
  $root: DocumentFragment;
  el: HTMLDivElement;
  number: HTMLDivElement;
  slider: HTMLDivElement;
};
export function index(context: unknown): {
  $root: DocumentFragment;
  hotkeys_rate10: HTMLSpanElement;
  hotkeys_vote0: HTMLSpanElement;
  hotkeys_rate05: HTMLSpanElement;
  hotkeys_vote1: HTMLSpanElement;
  hotkeys_fave: HTMLSpanElement;
  hotkeys_play: HTMLSpanElement;
  measure_box: HTMLDivElement;
  scroller_size: HTMLDivElement;
  list_item: HTMLDivElement;
  sizeable_area: HTMLDivElement;
  timeline: HTMLDivElement;
  requests_container: HTMLDivElement;
  search_container: HTMLDivElement;
  lists: HTMLDivElement;
  list_close: HTMLDivElement;
  album_list: HTMLDivElement;
  artist_list: HTMLDivElement;
  group_list: HTMLDivElement;
  listener_list: HTMLDivElement;
  detail_container: HTMLDivElement;
  detail_close: HTMLDivElement;
  detail_header_container: HTMLUListElement;
  detail_header: HTMLSpanElement;
  detail: HTMLDivElement;
};
export function settingsMultiOption(context: unknown): {
  $root: DocumentFragment;
  item_root: HTMLDivElement;
  area: HTMLDivElement;
  highlight: HTMLDivElement;
  legal_values: Array<{ $root: DocumentFragment; link: HTMLSpanElement }>;
};
export function oops(context: unknown): { $root: DocumentFragment };
export function search(context: unknown): {
  $root: DocumentFragment;
  search_close: HTMLDivElement;
  search_header: HTMLAnchorElement;
  search_box_container: HTMLDivElement;
  search_form: HTMLFormElement;
  search_button: HTMLButtonElement;
  search: HTMLInputElement;
  search_cancel: HTMLImageElement;
  search_results_container: HTMLDivElement;
  search_results: HTMLDivElement;
};
export function eventTooltip(context: unknown): { $root: DocumentFragment; el: HTMLDivElement };
export function errorModal(context: unknown): {
  $root: DocumentFragment;
  sending_report: HTMLParagraphElement;
};
export function settings(context: unknown): { $root: DocumentFragment };
export function rating(context: unknown): {
  $root: DocumentFragment;
  rating: HTMLDivElement;
  rating_hover_number?: HTMLDivElement;
};
export function searchResults(context: unknown): {
  $root: DocumentFragment;
  artists?: Array<{ $root: DocumentFragment; title: HTMLAnchorElement }>;
  albums?: Array<{ $root: DocumentFragment; title: HTMLAnchorElement }>;
};
export function requests(context: unknown): {
  $root: DocumentFragment;
  panel_close: HTMLDivElement;
  request_header: HTMLAnchorElement;
  request_indicator2?: HTMLDivElement;
  requests_pause: HTMLLIElement;
  requests_play: HTMLLIElement;
  requests_favfill: HTMLLIElement;
  requests_unrated: HTMLLIElement;
  requests_clear: HTMLLIElement;
  song_list: HTMLDivElement;
  song_list_container: HTMLDivElement;
  last_song_padder: HTMLDivElement;
};
export function menu(context: unknown): {
  $root: DocumentFragment;
  header: HTMLDivElement;
  menu_wrapper: HTMLDivElement;
  hamburger_container: HTMLUListElement;
  burger_button: HTMLAnchorElement;
  user_link?: HTMLLIElement;
  login: HTMLAnchorElement;
  main_menu_ul: HTMLUListElement;
  request_indicator: HTMLDivElement;
  request_link: HTMLAnchorElement;
  request_link_text: HTMLSpanElement;
  playlist_link: HTMLAnchorElement;
  search_link: HTMLAnchorElement;
  station_select: HTMLDivElement;
  pulldown: SVGSVGElement;
  station_select_header: HTMLAnchorElement;
  stations: Array<{
    $root: DocumentFragment;
    menu_link: HTMLAnchorElement;
    menu_np?: HTMLDivElement;
    menu_np_art: HTMLDivElement;
    menu_np_song: HTMLDivElement;
    menu_np_album: HTMLDivElement;
  }>;
  player: HTMLDivElement;
  play2: HTMLAnchorElement;
  play: SVGSVGElement;
  stop: SVGSVGElement;
  mute: SVGSVGElement;
};
export function whatIsCooldownModal(context: unknown): { $root: DocumentFragment };
export function settingsYesNo(context: unknown): {
  $root: DocumentFragment;
  item_root: HTMLDivElement;
  wrap: HTMLDivElement;
  yes: HTMLSpanElement;
  no: HTMLSpanElement;
  name: HTMLLabelElement;
};
export function modal(context: unknown): {
  $root: DocumentFragment;
  container: HTMLDivElement;
  close?: HTMLDivElement;
  content: HTMLDivElement;
};
export function authFailureModal(context: unknown): { $root: DocumentFragment };
export function pullout(context: unknown): {
  $root: DocumentFragment;
  requests_pullout: HTMLDivElement;
};
export function hamburgerMenu(context: unknown): {
  $root: DocumentFragment;
  settings_link: HTMLAnchorElement;
};
export function modalRating(context: unknown): { $root: DocumentFragment };
export function albumRating(context: unknown): {
  $root: DocumentFragment;
  rating: HTMLDivElement;
  rating_hover_number?: HTMLDivElement;
};
export function songDetail(context: unknown): {
  $root: DocumentFragment;
  details: HTMLDivElement;
  artists: Array<{ $root: DocumentFragment }>;
  groups: Array<{ $root: DocumentFragment }>;
  graph_placement?: HTMLDivElement;
};
export function albumDetail(context: unknown): {
  $root: DocumentFragment;
  art: HTMLDivElement;
  detail_header: HTMLDivElement;
  album_all_cooldown?: HTMLDivElement;
  album_has_cooldown?: HTMLDivElement;
  graph_placement: HTMLDivElement;
  category_rollover: HTMLDivElement;
  category_list: HTMLDivElement;
  genres: Array<{ $root: DocumentFragment }>;
  fave_all_songs: HTMLAnchorElement;
  unfave_all_songs: HTMLAnchorElement;
};
export function groupDetail(context: unknown): {
  $root: DocumentFragment;
  albums: Array<{ $root: DocumentFragment }>;
};
export function artistDetail(context: unknown): {
  $root: DocumentFragment;
  albums: Array<{ $root: DocumentFragment }>;
};
export function songTable(context: unknown): {
  $root: DocumentFragment;
  songs: Array<{
    $root: DocumentFragment;
    row: HTMLDivElement;
    rating_clear: HTMLImageElement;
    artists: Array<{ $root: DocumentFragment }>;
    detail_icon?: HTMLDivElement;
    title: HTMLDivElement;
  }>;
};
export function listenerDetail(context: unknown): {
  $root: DocumentFragment;
  top_albums?: Array<{ $root: DocumentFragment }>;
  top_request_albums?: Array<{ $root: DocumentFragment }>;
  user_detail_container: HTMLDivElement;
};
export function event(context: unknown): {
  $root: DocumentFragment;
  el: HTMLDivElement;
  header_container: HTMLDivElement;
  clock: HTMLSpanElement;
  header_anchor?: HTMLAnchorElement;
  header_span: HTMLSpanElement;
  progress: HTMLDivElement;
  progress_inside: HTMLDivElement;
  songs: Array<{ $root: DocumentFragment }>;
};
export function timeline(context: unknown): {
  $root: DocumentFragment;
  timeline: HTMLDivElement;
  timeline_sizer: HTMLDivElement;
  history_header: HTMLDivElement;
  history_header_link: HTMLDivElement;
  history_bar: HTMLDivElement;
  progress_history_inside: HTMLDivElement;
};
export function message(context: unknown): {
  $root: DocumentFragment;
  el: HTMLDivElement;
  close?: HTMLDivElement;
  message: HTMLDivElement;
};
