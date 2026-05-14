import {
  ANIMATIONS,
  DEFAULT_CONFIG,
  LAYOUTS,
  PRESET_BACKGROUNDS,
  PRESET_LAYOUTS,
  PRESET_SIZES,
  PRESENTATION_MODES,
  TEXT_ALIGNS,
  parseConfig,
  serializeConfig,
  transitionForPresetLayout,
} from './config';
import { FALLBACK_STATIONS, fetchStations } from './stations';
import { OverlayRenderer } from './overlay';

import type { Station, TimelineEntry, WidgetConfig } from './types';

const SAMPLE_ENTRY = {
  id: 1,
  end: 0,
  length: 180,
  name: null,
  sid: 5,
  songs: [
    {
      id: 1,
      title: 'Sample Track With A Long Stream-Friendly Title',
      albums: [{ id: 1, name: 'Sample Album', art: null, fave: false, rating: 0, rating_user: 0 }],
      artists: [{ id: 1, name: 'Rainwave Artist', order: 0 }],
      cool: false,
      elec_blocked: false,
      elec_blocked_by: null,
      elec_request_user_id: null,
      elec_request_username: 'Streamer',
      entry_id: 1,
      entry_position: 0,
      entry_type: 2,
      entry_votes: 0,
      fave: false,
      groups: [],
      origin_sid: 5,
      rating: 0,
      rating_allowed: false,
      rating_count: 0,
      rating_user: 0,
      request_count: 0,
      sid: 5,
    },
  ],
  start: 0,
  start_actual: 0,
  type: 'Election',
  url: null,
  used: true,
  voting_allowed: false,
} as unknown as TimelineEntry;

function labelize(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function selectField<T extends string>(
  label: string,
  value: T,
  options: readonly T[],
  onChange: (value: T) => void,
): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'builder-field';
  wrapper.appendChild(document.createTextNode(label));
  const select = document.createElement('select');
  options.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = labelize(option);
    opt.selected = option === value;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    onChange(select.value as T);
  });
  wrapper.appendChild(select);

  return wrapper;
}

function inputField(
  label: string,
  value: string | number,
  onChange: (value: string) => void,
  type = 'text',
): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'builder-field';
  wrapper.appendChild(document.createTextNode(label));
  const input = document.createElement('input');
  input.type = type;
  input.value = String(value);
  input.addEventListener('input', () => {
    onChange(input.value);
  });
  wrapper.appendChild(input);

  return wrapper;
}

function checkboxField(label: string, value: boolean, onChange: (value: boolean) => void): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'builder-field builder-check';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = value;
  input.addEventListener('change', () => {
    onChange(input.checked);
  });
  wrapper.append(input, document.createTextNode(label));

  return wrapper;
}

function stationField(
  stations: Station[],
  value: WidgetConfig['sid'],
  onChange: (value: WidgetConfig['sid']) => void,
): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'builder-field';
  wrapper.appendChild(document.createTextNode('Station'));
  const select = document.createElement('select');
  stations.forEach((station) => {
    const opt = document.createElement('option');
    opt.value = String(station.id);
    opt.textContent = station.name;
    opt.selected = station.id === value;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    onChange(Number.parseInt(select.value, 10) as WidgetConfig['sid']);
  });
  wrapper.appendChild(select);

  return wrapper;
}

function setConfig<K extends keyof WidgetConfig>(
  config: WidgetConfig,
  key: K,
  value: WidgetConfig[K],
): WidgetConfig {
  const next = { ...config, [key]: value };
  if (key === 'presetLayout') {
    return { ...next, ...transitionForPresetLayout(value as WidgetConfig['presetLayout']) };
  }

  return next;
}

async function initBuilder(root: HTMLElement): Promise<void> {
  let config = parseConfig(window.location.search);
  let stations = FALLBACK_STATIONS;
  try {
    stations = await fetchStations();
  } catch (_error) {
    stations = FALLBACK_STATIONS;
  }

  function render(): void {
    root.className = 'builder';
    root.textContent = '';
    const title = document.createElement('h1');
    title.textContent = 'Rainwave Stream Widget';
    root.appendChild(title);

    const layout = document.createElement('div');
    layout.className = 'builder-layout';
    const form = document.createElement('form');
    form.className = 'builder-form';
    form.addEventListener('submit', (event) => {
      event.preventDefault();
    });

    const update = <K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]): void => {
      config = setConfig(config, key, value);
      render();
    };

    form.append(
      stationField(stations, config.sid, (value) => update('sid', value)),
      selectField('Presentation', config.presentationMode, PRESENTATION_MODES, (value) =>
        update('presentationMode', value),
      ),
      selectField('Widget sizing', config.presetSize, PRESET_SIZES, (value) =>
        update('presetSize', value),
      ),
      selectField('Intended placement', config.presetLayout, PRESET_LAYOUTS, (value) =>
        update('presetLayout', value),
      ),
      selectField('Background target', config.presetBackground, PRESET_BACKGROUNDS, (value) =>
        update('presetBackground', value),
      ),
      selectField('Art layout', config.layout, LAYOUTS, (value) => update('layout', value)),
      inputField('Art size', config.artSize, (value) => update('artSize', value)),
      selectField('Text align', config.textAlign, TEXT_ALIGNS, (value) => update('textAlign', value)),
      selectField('Animate in', config.animIn, ANIMATIONS, (value) => update('animIn', value)),
      selectField('Animate out', config.animOut, ANIMATIONS, (value) => update('animOut', value)),
      checkboxField('Show artist', config.showArtist, (value) => update('showArtist', value)),
      checkboxField('Show header', config.npHeader, (value) => update('npHeader', value)),
      inputField('Header text', config.npMessage, (value) => update('npMessage', value)),
      inputField('Text color', config.color, (value) => update('color', value)),
      inputField('Background color', config.backgroundColor, (value) => update('backgroundColor', value)),
      inputField('Font size', config.fontSize, (value) => update('fontSize', value)),
      inputField('Width', config.maxWidth, (value) => update('maxWidth', value)),
      inputField('Padding', config.padding, (value) => update('padding', value)),
      inputField('Display delay seconds', config.delay, (value) => update('delay', Number.parseInt(value, 10) || 0), 'number'),
      inputField('Attribution every N songs', config.attributionFrequency, (value) =>
        update('attributionFrequency', Number.parseInt(value, 10) || 0),
        'number',
      ),
    );

    const output = document.createElement('textarea');
    output.className = 'builder-url';
    output.readOnly = true;
    output.value = `${window.location.origin}${window.location.pathname}?${serializeConfig(config).toString()}`;

    const preview = document.createElement('div');
    preview.className = 'builder-preview';
    const previewRoot = document.createElement('div');
    preview.appendChild(previewRoot);
    const renderer = new OverlayRenderer(previewRoot, config);
    renderer.showSchedule(SAMPLE_ENTRY);

    layout.append(form, preview);
    root.append(layout, output);
  }

  render();
}

export { initBuilder };
