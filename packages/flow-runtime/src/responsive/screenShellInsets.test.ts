import { describe, expect, it } from 'vitest';
import { addPadding, resolveEffectiveScreenShellPadding } from './screenShellInsets';

describe('screenShellInsets', () => {
  it('addPadding sums per edge and omits zeros', () => {
    expect(addPadding({ t: 8, l: 12 }, { t: 20, b: 34 })).toEqual({ t: 28, l: 12, b: 34 });
    expect(addPadding(undefined, { t: 10 })).toEqual({ t: 10 });
    expect(addPadding({ t: 0, r: 0, b: 0, l: 0 }, undefined)).toBeUndefined();
  });

  it('resolveEffectiveScreenShellPadding returns manual only when flag is off', () => {
    expect(
      resolveEffectiveScreenShellPadding({
        manual: { t: 16 },
        insetSafeArea: false,
        safeAreaInsets: { t: 59 },
      }),
    ).toEqual({ t: 16 });
  });

  it('resolveEffectiveScreenShellPadding merges when flag is on', () => {
    expect(
      resolveEffectiveScreenShellPadding({
        manual: { t: 8, l: 12 },
        insetSafeArea: true,
        safeAreaInsets: { t: 59, b: 34 },
      }),
    ).toEqual({ t: 67, l: 12, b: 34 });
  });
});
