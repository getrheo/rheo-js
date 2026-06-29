import { describe, expect, it } from 'vitest';
import type { ScaleInputLayer } from '@getrheo/contracts/layers';
import {
  mergeScaleInputLabelStyle,
  mergeScaleInputValueStyle,
  resolveScaleInputSliderForRender,
} from './scaleInputStyle';

describe('scaleInputStyle', () => {
  it('merges label style patches and clears undefined keys', () => {
    expect(
      mergeScaleInputLabelStyle({ fontSize: 12, opacity: 0.5 }, { fontSize: 14, opacity: undefined }),
    ).toEqual({ fontSize: 14 });
    expect(mergeScaleInputLabelStyle({ fontSize: 12 }, { fontSize: undefined })).toBeUndefined();
    expect(mergeScaleInputValueStyle({ fontWeight: 600 }, { fontWeight: 700 })).toEqual({
      fontWeight: 700,
    });
  });

  it('resolves slider defaults, visibility flags, and authored colors', () => {
    const layer: Pick<
      ScaleInputLayer,
      | 'labelStyle'
      | 'valueStyle'
      | 'showLabels'
      | 'showValue'
      | 'trackHeight'
      | 'trackColor'
      | 'fillColor'
      | 'thumbSize'
      | 'thumbColor'
    > = {
      showLabels: false,
      showValue: true,
      trackHeight: 6,
      trackColor: '#111111',
      fillColor: '#22c55e',
      thumbSize: 20,
      thumbColor: '#22c55e',
      labelStyle: { fontSize: 13, fontWeight: 600, color: '#ffffff', opacity: 1 },
      valueStyle: { fontSize: 18, fontWeight: 700, color: '#000000', opacity: 1 },
    };
    const resolved = resolveScaleInputSliderForRender(layer, undefined, 'dark');
    expect(resolved).toMatchObject({
      showLabels: false,
      showValue: true,
      trackHeightPx: 6,
      trackColor: '#111111',
      fillColor: '#22c55e',
      thumbSizePx: 20,
      thumbColor: '#22c55e',
      label: {
        fontSizePx: 13,
        fontWeight: 600,
        color: '#ffffff',
        opacity: 1,
      },
      value: {
        fontSizePx: 18,
        fontWeight: 700,
        color: '#000000',
        opacity: 1,
        textAlign: 'center',
      },
    });
  });

  it('shows labels and value by default when flags are omitted', () => {
    const resolved = resolveScaleInputSliderForRender({}, undefined, 'light');
    expect(resolved.showLabels).toBe(true);
    expect(resolved.showValue).toBe(true);
  });
});
