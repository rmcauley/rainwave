import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CONFIG,
  parseConfig,
  serializeConfig,
  transitionForPresetLayout,
  widgetScale,
} from './config';

describe('widget config', () => {
  it('defaults legacy-compatible values', () => {
    const config = parseConfig('');

    expect(config.sid).toBe(5);
    expect(config.presentationMode).toBe('dark');
    expect(config.color).toBe('white');
    expect(config.npHeader).toBe(true);
    expect(config.showDurationWhenChanged).toBeNull();
  });

  it('applies light presentation defaults without overriding explicit CSS values', () => {
    const light = parseConfig('presentation_mode=light');
    const explicit = parseConfig('presentation_mode=light&color=hotpink&text_shadow=none');

    expect(light.color).toBe('#151515');
    expect(light.textStrokeSize).toBe('1px');
    expect(explicit.color).toBe('hotpink');
    expect(explicit.textShadow).toBe('none');
  });

  it('keeps ad as the serialized attribution frequency URL parameter', () => {
    const config = { ...DEFAULT_CONFIG, attributionFrequency: 4 };
    const params = serializeConfig(config);

    expect(params.get('ad')).toBe('4');
    expect(params.has('attributionFrequency')).toBe(false);
  });

  it('maps intended placement to transition direction', () => {
    expect(transitionForPresetLayout('center_left')).toEqual({
      animIn: 'to_left',
      animOut: 'to_right',
    });
    expect(transitionForPresetLayout('top_center')).toEqual({
      animIn: 'to_top',
      animOut: 'to_bottom',
    });
  });

  it('maps legacy preset size to widget scale', () => {
    expect(widgetScale({ presetSize: '1080p' })).toBe(1);
    expect(widgetScale({ presetSize: '2160p' })).toBeGreaterThan(1);
  });
});
