import { describe, expect, it } from 'vitest';
import {
  resolveLayerGap,
  resolveLoaderCircularSizePx,
  resolveLoaderLinearHeightPx,
  resolveLoaderStrokeWidthPx,
  resolveProgressLinearHeightPx,
} from './layerResolve';

describe('resolveLayerGap', () => {
  it('prefers the authored gap', () => {
    expect(resolveLayerGap('stack', 20)).toBe(20);
  });

  it('falls back to the per-kind default', () => {
    expect(resolveLayerGap('stack', undefined)).toBe(12);
    expect(resolveLayerGap('single_choice', undefined)).toBe(8);
    expect(resolveLayerGap('hyperlink', undefined)).toBe(0);
  });

  it('falls back to 0 for kinds without a gap default', () => {
    expect(resolveLayerGap('text', undefined)).toBe(0);
  });
});

describe('feedback dimension resolvers', () => {
  it('resolves progress and loader linear heights', () => {
    expect(resolveProgressLinearHeightPx(10)).toBe(10);
    expect(resolveProgressLinearHeightPx(undefined)).toBe(6);
    expect(resolveProgressLinearHeightPx('fill')).toBe(6);
    expect(resolveLoaderLinearHeightPx(undefined)).toBe(6);
  });

  it('resolves circular loader size and stroke', () => {
    expect(resolveLoaderCircularSizePx(64)).toBe(64);
    expect(resolveLoaderCircularSizePx(undefined)).toBe(48);
    expect(resolveLoaderCircularSizePx('full')).toBe(48);
    expect(resolveLoaderStrokeWidthPx(2)).toBe(2);
    expect(resolveLoaderStrokeWidthPx(undefined)).toBe(4);
  });
});
