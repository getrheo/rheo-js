import { describe, expect, it } from 'vitest';
import {
  mergeTextInputFieldStyle,
  resolveTextInputFieldChromeStyle,
  resolveTextInputFieldForRender,
  stripTextInputFieldChromeFromStyle,
  textInputDefaultChromeColors,
} from './textInputStyle';

describe('textInputStyle', () => {
  it('merges field style patches and clears undefined keys', () => {
    expect(
      mergeTextInputFieldStyle({ fontSize: 12, opacity: 0.5 }, { fontSize: 16, opacity: undefined }),
    ).toEqual({ fontSize: 16 });
    expect(mergeTextInputFieldStyle({ fontSize: 12 }, { fontSize: undefined })).toBeUndefined();
  });

  it('resolves field typography defaults and authored overrides', () => {
    const resolved = resolveTextInputFieldForRender(
      {
        fieldStyle: {
          fontSize: 18,
          fontWeight: 600,
          color: '#ff0000',
          opacity: 0.9,
          align: 'center',
        },
      },
      undefined,
      'light',
    );
    expect(resolved).toMatchObject({
      fontSizePx: 18,
      fontWeight: 600,
      color: '#ff0000',
      opacity: 0.9,
      textAlign: 'center',
    });
  });

  it('uses palette defaults when fieldStyle is omitted', () => {
    expect(resolveTextInputFieldForRender({}, undefined, 'dark')).toMatchObject({
      fontSizePx: 14,
      color: '#fafafa',
      opacity: 1,
      textAlign: 'left',
    });
  });

  it('resolves field chrome from style with sim defaults', () => {
    expect(resolveTextInputFieldChromeStyle(undefined, 'light')).toEqual({
      padding: { t: 10, r: 12, b: 10, l: 12 },
      radius: 10,
      background: '#fafafa',
      border: { width: 1, color: '#e4e4e7' },
    });
    expect(resolveTextInputFieldChromeStyle({ background: '#fff', border: { width: 2, color: '#000' }, radius: 24 }, 'dark')).toMatchObject({
      background: '#fff',
      border: { width: 2, color: '#000' },
      radius: 24,
      padding: { t: 10, r: 12, b: 10, l: 12 },
    });
  });

  it('strips field chrome keys from outer style', () => {
    expect(
      stripTextInputFieldChromeFromStyle({
        background: '#fff',
        border: { width: 1 },
        radius: 8,
        padding: { t: 4 },
        shadow: { blur: 4 },
        backgroundOpacity: 0.5,
        width: 'full',
        margin: { t: 8 },
        opacity: 0.9,
      }),
    ).toEqual({ width: 'full', margin: { t: 8 }, opacity: 0.9 });
    expect(stripTextInputFieldChromeFromStyle({ background: '#fff' })).toBeUndefined();
  });

  it('exposes default chrome colors for placeholders', () => {
    expect(textInputDefaultChromeColors('light').placeholder).toBe('#a1a1aa');
    expect(textInputDefaultChromeColors('dark').placeholder).toBe('#71717a');
  });
});
