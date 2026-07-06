import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DYNAMIC_TYPE_FONT_SCALE,
  DYNAMIC_TYPE_SCALE_BY_IOS_CATEGORY,
  fontScaleFromContentSizeCategory,
  scaleAuthoredFontSize,
} from './dynamicTypeScale';

describe('dynamicTypeScale', () => {
  it('returns undefined for missing base size', () => {
    expect(scaleAuthoredFontSize(undefined)).toBeUndefined();
  });

  it('leaves authored size at default scale', () => {
    expect(scaleAuthoredFontSize(16, DEFAULT_DYNAMIC_TYPE_FONT_SCALE)).toBe(16);
  });

  it('scales large accessibility sizes', () => {
    expect(scaleAuthoredFontSize(16, DYNAMIC_TYPE_SCALE_BY_IOS_CATEGORY.accessibilityXXXLarge!)).toBe(
      33.92,
    );
  });

  it('maps known iOS categories', () => {
    expect(fontScaleFromContentSizeCategory('large')).toBe(1.12);
    expect(fontScaleFromContentSizeCategory('accessibilityMedium')).toBe(1.64);
  });

  it('falls back to 1 for unknown categories', () => {
    expect(fontScaleFromContentSizeCategory('unknown')).toBe(1);
  });
});
