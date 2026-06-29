import { describe, expect, it } from 'vitest';
import { resolveCheckboxGlyphForRender } from './index';

describe('renderer-core checkbox glyph parity', () => {
  it('re-export matches flow-runtime checkboxGlyphStyle', async () => {
    const direct = await import('@getrheo/flow-runtime/checkboxGlyphStyle');
    expect(resolveCheckboxGlyphForRender).toBe(direct.resolveCheckboxGlyphForRender);
  });

  it('resolveCheckboxGlyphForRender applies defaults when unchecked', () => {
    const r = resolveCheckboxGlyphForRender(undefined, 'light', undefined, undefined, false, undefined);
    expect(r.sizePx).toBe(18);
    expect(r.radiusPx).toBe(4);
    expect(r.opacity).toBe(1);
    expect(r.checkColor).toBeUndefined();
  });

  it('resolveCheckboxGlyphForRender exposes check color when checked', () => {
    const r = resolveCheckboxGlyphForRender(undefined, 'light', undefined, undefined, true, undefined);
    expect(r.checkColor).toBeDefined();
  });
});
