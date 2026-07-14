import { describe, expect, it } from 'vitest';
import { dropShadowToBoxShadow, dropShadowToNativeStyle } from './dropShadow';

describe('dropShadowToNativeStyle', () => {
  it('approximates spread by inflating shadowRadius and elevation', () => {
    const baseShadow = { blur: 8, offsetY: 2, spread: 0 };
    const spreadShadow = { blur: 8, offsetY: 2, spread: 4 };
    const base = dropShadowToNativeStyle(baseShadow, undefined, 'light');
    const withSpread = dropShadowToNativeStyle(spreadShadow, undefined, 'light');
    expect(withSpread.shadowRadius).toBeGreaterThan(base.shadowRadius!);
    expect(withSpread.shadowRadius).toBe(12);
    expect(withSpread.elevation).toBe(
      Math.min(24, Math.max(0, Math.round((8 + 4) / 2 + 2))),
    );
  });

  it('leaves web boxShadow spread unchanged', () => {
    const shadow = { blur: 8, offsetY: 2, spread: 4 };
    expect(dropShadowToBoxShadow(shadow, undefined, 'light')).toContain('4px');
  });
});
