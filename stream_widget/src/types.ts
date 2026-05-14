import type { components } from '../../frontend/src/rainwaveApi/rainwave-openapi';

type StationId = components['schemas']['_station_id'];
type TimelineEntry = components['schemas']['_timeline_entry'];
type TimelineSong = components['schemas']['_timeline_song'];
type Station = components['schemas']['stations'][number];

type Layout = 'art_top' | 'art_bottom' | 'art_left' | 'art_right';
type TextAlign = 'left' | 'center' | 'right';
type Animation = 'to_bottom' | 'to_top' | 'to_left' | 'to_right' | 'fade';
type PresentationMode = 'dark' | 'light';
type PresetLayout =
  | 'top_left'
  | 'top_center'
  | 'top_right'
  | 'center_left'
  | 'center_right'
  | 'bottom_left'
  | 'bottom_center'
  | 'bottom_right';
type PresetSize = '480p' | '720p' | '1080p' | '1440p' | '2160p';
type PresetBackground = 'overbkg' | 'overimg' | 'overgame';

interface WidgetConfig {
  sid: StationId;
  layout: Layout;
  artSize: string;
  textAlign: TextAlign;
  animIn: Animation;
  animOut: Animation;
  showDurationWhenChanged: number | null;
  showArtist: boolean;
  color: string;
  backgroundColor: string;
  boxShadow: string;
  fontSize: string;
  fontFamily: string;
  textStrokeColor: string;
  textStrokeSize: string;
  textShadow: string;
  artShadow: string;
  maxWidth: string;
  padding: string;
  npHeader: boolean;
  npMessage: string;
  npColor: string;
  attributionFrequency: number;
  adMessage: string;
  delay: number;
  showRequesters: boolean;
  presentationMode: PresentationMode;
  presetLayout: PresetLayout;
  presetSize: PresetSize;
  presetBackground: PresetBackground;
}

interface NowPlaying {
  id: number;
  title: string;
  artist: string;
  album: string;
  artUrl: string;
  requester: string | null;
}

interface BootstrapUser {
  id: number;
  api_key: string;
  sid?: StationId;
}

interface BootstrapPayload {
  user: BootstrapUser;
  websocket_host?: string;
}

export type {
  Animation,
  BootstrapPayload,
  Layout,
  NowPlaying,
  PresetBackground,
  PresentationMode,
  PresetLayout,
  PresetSize,
  Station,
  StationId,
  TextAlign,
  TimelineEntry,
  TimelineSong,
  WidgetConfig,
};
