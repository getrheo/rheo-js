import { describe, expect, it } from 'vitest';
import { stackMainAxisFillHeight } from './stackFlexGrow';

describe('stackMainAxisFillHeight', () => {
  it('is true only for fill/full presets', () => {
    expect(stackMainAxisFillHeight('fill')).toBe(true);
    expect(stackMainAxisFillHeight('full')).toBe(true);
    expect(stackMainAxisFillHeight('auto')).toBe(false);
    expect(stackMainAxisFillHeight(undefined)).toBe(false);
    expect(stackMainAxisFillHeight(120)).toBe(false);
  });
});
