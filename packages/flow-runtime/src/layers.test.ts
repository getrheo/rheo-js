import { describe, expect, it } from 'vitest';
import { nextUniqueFieldKey, resolveThemedColor } from './layers';

describe('nextUniqueFieldKey', () => {
  it('returns base when unused', () => {
    expect(nextUniqueFieldKey('text', [])).toBe('text');
    expect(nextUniqueFieldKey('text', new Set(['other']))).toBe('text');
  });

  it('suffixes with _2, _3 when base is taken', () => {
    expect(nextUniqueFieldKey('text', ['text'])).toBe('text_2');
    expect(nextUniqueFieldKey('text', ['text', 'text_2'])).toBe('text_3');
  });

  it('accepts Set or iterable', () => {
    expect(nextUniqueFieldKey('choice', new Set(['choice', 'choice_2']))).toBe('choice_3');
  });
});

describe('resolveThemedColor', () => {
  const theme = { foreground: '#112233' } as const;

  it('returns undefined for undefined input', () => {
    expect(resolveThemedColor(theme, 'light', undefined)).toBeUndefined();
  });

  it('resolves legacy string the same for both palettes', () => {
    expect(resolveThemedColor(theme, 'light', '#ff0000')).toBe('#ff0000');
    expect(resolveThemedColor(theme, 'dark', '#ff0000')).toBe('#ff0000');
  });

  it('resolves $tokens from theme', () => {
    expect(resolveThemedColor(theme, 'dark', '$foreground')).toBe('#112233');
  });

  it('picks light vs dark branch with fallback', () => {
    expect(
      resolveThemedColor(undefined, 'light', { light: '#aaa', dark: '#bbb' }),
    ).toBe('#aaa');
    expect(
      resolveThemedColor(undefined, 'dark', { light: '#aaa', dark: '#bbb' }),
    ).toBe('#bbb');
    expect(resolveThemedColor(undefined, 'dark', { light: '#only' })).toBe('#only');
    expect(resolveThemedColor(undefined, 'light', { dark: '#only' })).toBe('#only');
  });

  it('collapses token resolution after branch pick', () => {
    expect(resolveThemedColor(theme, 'light', { light: '$foreground' })).toBe('#112233');
  });
});
