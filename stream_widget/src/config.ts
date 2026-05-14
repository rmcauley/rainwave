import type {
  Animation,
  Layout,
  PresentationMode,
  PresetBackground,
  PresetLayout,
  PresetSize,
  StationId,
  TextAlign,
  WidgetConfig,
} from './types';

const LAYOUTS = ['art_top', 'art_bottom', 'art_left', 'art_right'] as const;
const TEXT_ALIGNS = ['left', 'center', 'right'] as const;
const ANIMATIONS = ['to_bottom', 'to_top', 'to_left', 'to_right', 'fade'] as const;
const PRESENTATION_MODES = ['dark', 'light'] as const;
const PRESET_LAYOUTS = [
  'top_left',
  'top_center',
  'top_right',
  'center_left',
  'center_right',
  'bottom_left',
  'bottom_center',
  'bottom_right',
] as const;
const PRESET_SIZES = ['480p', '720p', '1080p', '1440p', '2160p'] as const;
const PRESET_BACKGROUNDS = ['overbkg', 'overimg', 'overgame'] as const;

const SIZE_SCALE: Record<PresetSize, number> = {
  '480p': 0.55,
  '720p': 0.72,
  '1080p': 1,
  '1440p': 1.25,
  '2160p': 1.6,
};

const DEFAULT_CONFIG: WidgetConfig = {
  sid: 5,
  layout: 'art_left',
  artSize: '120px',
  textAlign: 'left',
  animIn: 'to_left',
  animOut: 'to_right',
  showDurationWhenChanged: null,
  showArtist: true,
  color: 'white',
  backgroundColor: 'transparent',
  boxShadow: '',
  fontSize: '18pt',
  fontFamily: "'Roboto Condensed', sans-serif",
  textStrokeColor: 'black',
  textStrokeSize: '2px',
  textShadow: '3px 3px 3px black',
  artShadow: '',
  maxWidth: '420px',
  padding: '8px',
  npHeader: true,
  npMessage: 'Current Song',
  npColor: '#FFC96A',
  attributionFrequency: 0,
  adMessage: 'Music by:',
  delay: 0,
  showRequesters: true,
  presentationMode: 'dark',
  presetLayout: 'center_left',
  presetSize: '1080p',
  presetBackground: 'overgame',
};

function isIn<const T extends readonly string[]>(value: string | null, allowed: T): value is T[number] {
  return value !== null && allowed.includes(value);
}

function parseStationId(value: string | null): StationId {
  const parsed = Number.parseInt(value || '', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed as StationId;
  }

  return DEFAULT_CONFIG.sid;
}

function parseBool(value: string | null, fallback: boolean): boolean {
  if (value === null || value === '') {
    return fallback;
  }

  return value === 'true' || value === 'yes' || value === '1';
}

function parseNumber(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return fallback;
}

function parseOptionalNumber(value: string | null): number | null {
  if (value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTextAlign(value: string | null): TextAlign {
  if (value === 'centre') {
    return 'center';
  }
  if (isIn(value, TEXT_ALIGNS)) {
    return value;
  }

  return DEFAULT_CONFIG.textAlign;
}

function defaultsForPresentationMode(mode: PresentationMode): Pick<
  WidgetConfig,
  'color' | 'textStrokeColor' | 'textStrokeSize' | 'textShadow' | 'npColor'
> {
  if (mode === 'light') {
    return {
      color: '#151515',
      textStrokeColor: 'rgba(255, 255, 255, 0.75)',
      textStrokeSize: '1px',
      textShadow: '1px 1px 2px rgba(255, 255, 255, 0.85)',
      npColor: '#A94E00',
    };
  }

  return {
    color: DEFAULT_CONFIG.color,
    textStrokeColor: DEFAULT_CONFIG.textStrokeColor,
    textStrokeSize: DEFAULT_CONFIG.textStrokeSize,
    textShadow: DEFAULT_CONFIG.textShadow,
    npColor: DEFAULT_CONFIG.npColor,
  };
}

function transitionForPresetLayout(layout: PresetLayout): Pick<WidgetConfig, 'animIn' | 'animOut'> {
  if (layout.endsWith('_left')) {
    return { animIn: 'to_left', animOut: 'to_right' };
  }
  if (layout.endsWith('_right')) {
    return { animIn: 'to_right', animOut: 'to_left' };
  }
  if (layout.startsWith('top_')) {
    return { animIn: 'to_top', animOut: 'to_bottom' };
  }
  if (layout.startsWith('bottom_')) {
    return { animIn: 'to_bottom', animOut: 'to_top' };
  }

  return { animIn: DEFAULT_CONFIG.animIn, animOut: DEFAULT_CONFIG.animOut };
}

function parseConfig(search: string | URLSearchParams): WidgetConfig {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const requestedPresentationMode = params.get('presentation_mode');
  const presentationMode: PresentationMode = isIn(requestedPresentationMode, PRESENTATION_MODES)
    ? requestedPresentationMode
    : DEFAULT_CONFIG.presentationMode;
  const presentationDefaults = defaultsForPresentationMode(presentationMode);
  const requestedPresetLayout = params.get('preset_layout');
  const presetLayout: PresetLayout = isIn(requestedPresetLayout, PRESET_LAYOUTS)
    ? requestedPresetLayout
    : DEFAULT_CONFIG.presetLayout;
  const transitionDefaults = transitionForPresetLayout(presetLayout);
  const requestedLayout = params.get('layout');
  const requestedAnimIn = params.get('anim_in');
  const requestedAnimOut = params.get('anim_out');
  const requestedPresetSize = params.get('preset_size');
  const requestedPresetBackground = params.get('preset_background');

  return {
    sid: parseStationId(params.get('sid')),
    layout: isIn(requestedLayout, LAYOUTS) ? requestedLayout : DEFAULT_CONFIG.layout,
    artSize: params.get('art_size') || DEFAULT_CONFIG.artSize,
    textAlign: normalizeTextAlign(params.get('text_align')),
    animIn: isIn(requestedAnimIn, ANIMATIONS) ? requestedAnimIn : transitionDefaults.animIn,
    animOut: isIn(requestedAnimOut, ANIMATIONS) ? requestedAnimOut : transitionDefaults.animOut,
    showDurationWhenChanged: parseOptionalNumber(params.get('show_duration_when_changed')),
    showArtist: parseBool(params.get('show_artist'), DEFAULT_CONFIG.showArtist),
    color: params.get('color') || presentationDefaults.color,
    backgroundColor: params.get('background_color') || DEFAULT_CONFIG.backgroundColor,
    boxShadow: params.get('box_shadow') || DEFAULT_CONFIG.boxShadow,
    fontSize: params.get('font_size') || DEFAULT_CONFIG.fontSize,
    fontFamily: params.get('font_family') || DEFAULT_CONFIG.fontFamily,
    textStrokeColor: params.get('text_stroke_color') || presentationDefaults.textStrokeColor,
    textStrokeSize: params.get('text_stroke_size') || presentationDefaults.textStrokeSize,
    textShadow: params.get('text_shadow') || presentationDefaults.textShadow,
    artShadow: params.get('art_shadow') || DEFAULT_CONFIG.artShadow,
    maxWidth: params.get('max_width') || params.get('width') || DEFAULT_CONFIG.maxWidth,
    padding: params.get('padding') || DEFAULT_CONFIG.padding,
    npHeader: parseBool(params.get('np_header'), DEFAULT_CONFIG.npHeader),
    npMessage: params.get('np_message') || DEFAULT_CONFIG.npMessage,
    npColor: params.get('np_color') || presentationDefaults.npColor,
    attributionFrequency: Math.max(0, parseNumber(params.get('ad'), DEFAULT_CONFIG.attributionFrequency)),
    adMessage: params.get('ad_message') || DEFAULT_CONFIG.adMessage,
    delay: Math.max(0, parseNumber(params.get('delay'), DEFAULT_CONFIG.delay)),
    showRequesters: parseBool(params.get('show_requesters'), DEFAULT_CONFIG.showRequesters),
    presentationMode,
    presetLayout,
    presetSize: isIn(requestedPresetSize, PRESET_SIZES)
      ? requestedPresetSize
      : DEFAULT_CONFIG.presetSize,
    presetBackground: isIn(requestedPresetBackground, PRESET_BACKGROUNDS)
      ? requestedPresetBackground
      : DEFAULT_CONFIG.presetBackground,
  };
}

function serializeConfig(config: WidgetConfig): URLSearchParams {
  const params = new URLSearchParams();
  params.set('overlay', 'true');
  params.set('sid', String(config.sid));
  params.set('layout', config.layout);
  params.set('art_size', config.artSize);
  params.set('text_align', config.textAlign);
  params.set('anim_in', config.animIn);
  params.set('anim_out', config.animOut);
  params.set('show_duration_when_changed', config.showDurationWhenChanged?.toString() || '');
  params.set('show_artist', String(config.showArtist));
  params.set('color', config.color);
  params.set('background_color', config.backgroundColor);
  params.set('box_shadow', config.boxShadow);
  params.set('font_size', config.fontSize);
  params.set('font_family', config.fontFamily);
  params.set('text_stroke_color', config.textStrokeColor);
  params.set('text_stroke_size', config.textStrokeSize);
  params.set('text_shadow', config.textShadow);
  params.set('art_shadow', config.artShadow);
  params.set('max_width', config.maxWidth);
  params.set('padding', config.padding);
  params.set('np_header', config.npHeader ? 'yes' : 'no');
  params.set('np_message', config.npMessage);
  params.set('np_color', config.npColor);
  params.set('ad', String(config.attributionFrequency));
  params.set('ad_message', config.adMessage);
  params.set('delay', String(config.delay));
  params.set('show_requesters', String(config.showRequesters));
  params.set('presentation_mode', config.presentationMode);
  params.set('preset_layout', config.presetLayout);
  params.set('preset_size', config.presetSize);
  params.set('preset_background', config.presetBackground);

  return params;
}

function widgetScale(config: Pick<WidgetConfig, 'presetSize'>): number {
  return SIZE_SCALE[config.presetSize];
}

function hasWidgetParams(params: URLSearchParams): boolean {
  return (
    params.get('overlay') === 'true' ||
    params.has('sid') ||
    params.has('layout') ||
    params.has('preset_layout') ||
    params.has('preset_size')
  );
}

export {
  ANIMATIONS,
  DEFAULT_CONFIG,
  LAYOUTS,
  PRESET_BACKGROUNDS,
  PRESET_LAYOUTS,
  PRESET_SIZES,
  PRESENTATION_MODES,
  SIZE_SCALE,
  TEXT_ALIGNS,
  hasWidgetParams,
  parseConfig,
  serializeConfig,
  transitionForPresetLayout,
  widgetScale,
};

export type { Animation, Layout, PresetBackground, PresetLayout, PresetSize };
