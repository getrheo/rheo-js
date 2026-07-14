import { describe, expect, it } from 'vitest';
import { multiplyColorAlpha, resolveCommonBackgroundOpacity, resolveCommonLayerOpacity } from './colorAlpha';

describe('multiplyColorAlpha', () => {
  it('returns undefined for undefined color', () => {
    expect(multiplyColorAlpha(undefined, 0.5)).toBeUndefined();
  });

  it('returns original when factor is omitted or 1', () => {
    expect(multiplyColorAlpha('#ff0000', undefined)).toBe('#ff0000');
    expect(multiplyColorAlpha('#ff0000', 1)).toBe('#ff0000');
  });

  it('converts 6-digit hex to rgba', () => {
    expect(multiplyColorAlpha('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)');
  });

  it('expands 3-digit hex', () => {
    expect(multiplyColorAlpha('#f00', 0.5)).toBe('rgba(255,0,0,0.5)');
  });

  it('multiplies existing alpha in 8-digit hex', () => {
    const out = multiplyColorAlpha('#ff000080', 0.5)!;
    const m = out.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
    expect(m).toBeTruthy();
    expect(Number(m![4])).toBeCloseTo((128 / 255) * 0.5, 10);
  });

  it('handles rgba input', () => {
    expect(multiplyColorAlpha('rgba(10, 20, 30, 0.8)', 0.5)).toBe('rgba(10,20,30,0.4)');
  });

  it('returns transparent when factor is 0', () => {
    expect(multiplyColorAlpha('#00ff00', 0)).toBe('rgba(0,0,0,0)');
  });
});

describe('resolveCommonBackgroundOpacity', () => {
  it('prefers backgroundOpacity and falls back to legacy opacity with background', () => {
    expect(resolveCommonBackgroundOpacity({ backgroundOpacity: 0.4 })).toBe(0.4);
    expect(resolveCommonBackgroundOpacity({ background: '#fff', opacity: 0.5 })).toBe(0.5);
    expect(resolveCommonBackgroundOpacity({ opacity: 0.5 })).toBeUndefined();
  });
});

describe('resolveCommonLayerOpacity', () => {
  it('skips legacy misfiled background opacity', () => {
    expect(resolveCommonLayerOpacity({ background: '#fff', opacity: 0.5 })).toBeUndefined();
    expect(resolveCommonLayerOpacity({ opacity: 0.5 })).toBe(0.5);
    expect(
      resolveCommonLayerOpacity({ background: '#fff', backgroundOpacity: 0.4, opacity: 0.8 }),
    ).toBe(0.8);
  });
});
