import { describe, expect, it } from 'vitest';
import { getActiveStyleBreakpointChain, getScreenSizeBucketForWidth } from './breakpoints';
import { deepMergeStyle, mergeResponsivePartial } from './merge';
import type { CommonStyle } from '@getrheo/contracts/layers';

describe('responsive breakpoints', () => {
  it('classifies width into buckets', () => {
    expect(getScreenSizeBucketForWidth(375)).toBe('default');
    expect(getScreenSizeBucketForWidth(640)).toBe('sm');
    expect(getScreenSizeBucketForWidth(800)).toBe('md');
    expect(getScreenSizeBucketForWidth(1100)).toBe('lg');
  });

  it('returns breakpoint chain for merge order', () => {
    expect(getActiveStyleBreakpointChain(375)).toEqual([]);
    expect(getActiveStyleBreakpointChain(640)).toEqual(['sm']);
    expect(getActiveStyleBreakpointChain(900)).toEqual(['sm', 'md']);
  });
});

describe('mergeResponsivePartial', () => {
  it('deep-merges padding per side', () => {
    const base: Partial<CommonStyle> = {
      padding: { t: 4, r: 4, b: 4, l: 4 },
    };
    const breakpoints = {
      md: { padding: { t: 16 } },
    };
    const out = mergeResponsivePartial(
      base as Record<string, unknown>,
      breakpoints as Record<string, unknown>,
      900,
    ) as CommonStyle;
    expect(out.padding).toEqual({ t: 16, r: 4, b: 4, l: 4 });
  });

  it('merges mobile-first through chain', () => {
    const base = { fontSize: 14 };
    const breakpoints = {
      sm: { fontSize: 16 },
      md: { fontSize: 18 },
    };
    const atSm = mergeResponsivePartial(base, breakpoints, 700) as { fontSize?: number };
    expect(atSm.fontSize).toBe(16);
    const atMd = mergeResponsivePartial(base, breakpoints, 900) as { fontSize?: number };
    expect(atMd.fontSize).toBe(18);
  });
});

describe('deepMergeStyle', () => {
  it('replaces scalars', () => {
    const a = { opacity: 0.5 };
    const b = { opacity: 1 };
    expect(deepMergeStyle(a, b)).toEqual({ opacity: 1 });
  });
});
