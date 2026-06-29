import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOADER_CIRCULAR_SIZE_PX,
  DEFAULT_LOADER_LINEAR_HEIGHT_PX,
  DEFAULT_LOADER_STROKE_WIDTH_PX,
  DEFAULT_PROGRESS_LINEAR_HEIGHT_PX,
  defaultFeedbackStyleScalars,
  defaultGapForLayerKind,
} from './scalarLayoutDefaults';

describe('defaultGapForLayerKind', () => {
  it('returns 12 for stacks', () => {
    expect(defaultGapForLayerKind('stack')).toBe(12);
  });

  it('returns 8 for choice, auth, and button containers', () => {
    expect(defaultGapForLayerKind('single_choice')).toBe(8);
    expect(defaultGapForLayerKind('multiple_choice')).toBe(8);
    expect(defaultGapForLayerKind('oauth_login')).toBe(8);
    expect(defaultGapForLayerKind('email_password_auth')).toBe(8);
    expect(defaultGapForLayerKind('email_password_submit')).toBe(8);
    expect(defaultGapForLayerKind('button')).toBe(8);
    expect(defaultGapForLayerKind('oauth_provider')).toBe(8);
  });

  it('returns 0 for hyperlink rows', () => {
    expect(defaultGapForLayerKind('hyperlink')).toBe(0);
  });

  it('returns null for kinds without child spacing', () => {
    expect(defaultGapForLayerKind('text')).toBeNull();
    expect(defaultGapForLayerKind('carousel')).toBeNull();
    expect(defaultGapForLayerKind('progress')).toBeNull();
  });
});

describe('defaultFeedbackStyleScalars', () => {
  it('gives a progress bar its linear thickness', () => {
    expect(defaultFeedbackStyleScalars('progress')).toEqual({
      height: DEFAULT_PROGRESS_LINEAR_HEIGHT_PX,
    });
  });

  it('defaults a loader to its linear thickness', () => {
    expect(defaultFeedbackStyleScalars('loader')).toEqual({
      height: DEFAULT_LOADER_LINEAR_HEIGHT_PX,
    });
    expect(defaultFeedbackStyleScalars('loader', 'linear')).toEqual({
      height: DEFAULT_LOADER_LINEAR_HEIGHT_PX,
    });
  });

  it('sizes a circular loader as a square ring', () => {
    expect(defaultFeedbackStyleScalars('loader', 'circular')).toEqual({
      width: DEFAULT_LOADER_CIRCULAR_SIZE_PX,
      height: DEFAULT_LOADER_CIRCULAR_SIZE_PX,
      strokeWidth: DEFAULT_LOADER_STROKE_WIDTH_PX,
    });
  });
});
