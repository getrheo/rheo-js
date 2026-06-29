import { describe, expect, it } from 'vitest';
import { buttonPaletteBorderFallback } from './buttonVariantChrome';

describe('buttonPaletteBorderFallback', () => {
  it('skips variant border when authored background is transparent', () => {
    expect(
      buttonPaletteBorderFallback('secondary', 'light', { background: 'transparent' }, 'transparent'),
    ).toEqual({ borderWidth: 0, borderColor: undefined });
  });

  it('keeps secondary variant border when background is not transparent', () => {
    expect(buttonPaletteBorderFallback('secondary', 'light', undefined, undefined)).toEqual({
      borderWidth: 1,
      borderColor: '#e4e4e7',
    });
  });

  it('prefers authored border width', () => {
    expect(
      buttonPaletteBorderFallback('secondary', 'light', { border: { width: 0 } }, undefined),
    ).toEqual({ borderWidth: 0, borderColor: undefined });
  });
});
