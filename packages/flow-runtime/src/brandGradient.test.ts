import { describe, expect, it } from 'vitest';
import type { BrandGradient, Branding } from '@getrheo/contracts/branding';
import {
  BRAND_GRADIENT_PREFIX,
  brandGradientNativeLinear,
  brandGradientToCss,
  buildLinearGradientCss,
  buildTwoStopLinearGradientCss,
  parseLinearGradientCss,
  parseTwoStopLinearGradientCss,
  nativeLinearFromAngleAndStops,
  resolveBrandGradientToken,
} from './brandGradient';
import { nativeBrandBackgroundFromThemedColor, resolveThemedBackground } from './layers';

const preset: BrandGradient = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'G1',
  type: 'linear',
  angle: 90,
  stops: [
    { color: '#ff0000', offset: 0 },
    { color: '#0000ff', offset: 1 },
  ],
};

const branding: Branding = {
  gradientPresets: [preset],
  colorPresets: [],
  fontFamilies: [],
};

describe('resolveBrandGradientToken', () => {
  it('resolves known preset to CSS', () => {
    const token = `${BRAND_GRADIENT_PREFIX}${preset.id}`;
    expect(resolveBrandGradientToken(branding, token)).toBe(brandGradientToCss(preset));
  });

  it('returns undefined for unknown id', () => {
    const token = `${BRAND_GRADIENT_PREFIX}22222222-2222-4222-8222-222222222222`;
    expect(resolveBrandGradientToken(branding, token)).toBeUndefined();
  });
});

describe('brandGradientNativeLinear', () => {
  it('maps 180deg to top-to-bottom', () => {
    const g: BrandGradient = { ...preset, angle: 180 };
    const lin = brandGradientNativeLinear(g);
    expect(lin).not.toBeNull();
    expect(lin!.start.x).toBeCloseTo(0.5);
    expect(lin!.start.y).toBeCloseTo(0);
    expect(lin!.end.x).toBeCloseTo(0.5);
    expect(lin!.end.y).toBeCloseTo(1);
  });

  it('returns null for radial presets', () => {
    const radial: BrandGradient = {
      id: preset.id,
      name: 'R1',
      type: 'radial',
      stops: preset.stops,
    };
    expect(brandGradientNativeLinear(radial)).toBeNull();
  });
});

describe('resolveThemedBackground', () => {
  const theme = { primary: '#abcdef' } as const;

  it('resolves $brandGradient when branding matches', () => {
    const token = `${BRAND_GRADIENT_PREFIX}${preset.id}`;
    expect(resolveThemedBackground(theme, branding, 'light', token)).toContain('linear-gradient');
  });

  it('returns undefined for unknown gradient id', () => {
    const token = `${BRAND_GRADIENT_PREFIX}22222222-2222-4222-8222-222222222222`;
    expect(resolveThemedBackground(theme, branding, 'light', token)).toBeUndefined();
  });
});

describe('nativeBrandBackgroundFromThemedColor', () => {
  const theme = {} as const;

  it('returns linear props for linear preset', () => {
    const token = `${BRAND_GRADIENT_PREFIX}${preset.id}`;
    const nb = nativeBrandBackgroundFromThemedColor(theme, branding, 'light', token);
    expect(nb.linear?.colors).toEqual(['#ff0000', '#0000ff']);
    expect(nb.solid).toBeUndefined();
  });

  it('returns solid fallback for radial preset', () => {
    const radial: BrandGradient = {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Radial',
      type: 'radial',
      stops: [
        { color: '#aabbcc', offset: 0 },
        { color: '#ddeeff', offset: 1 },
      ],
    };
    const b: Branding = { ...branding, gradientPresets: [radial] };
    const token = `${BRAND_GRADIENT_PREFIX}${radial.id}`;
    const nb = nativeBrandBackgroundFromThemedColor(theme, b, 'light', token);
    expect(nb.linear).toBeUndefined();
    expect(nb.solid).toBe('#aabbcc');
  });

  it('parses canonical two-stop linear-gradient CSS for native', () => {
    const css = buildTwoStopLinearGradientCss(90, '#f00', '#00f');
    const nb = nativeBrandBackgroundFromThemedColor(theme, undefined, 'light', css);
    expect(nb.linear?.colors).toEqual(['#ff0000', '#0000ff']);
    expect(nb.solid).toBeUndefined();
  });

  it('parses multi-stop linear-gradient CSS for native', () => {
    const css = buildLinearGradientCss(0, [
      { color: '#ff0000', offsetPct: 0 },
      { color: '#00ff00', offsetPct: 50 },
      { color: '#0000ff', offsetPct: 100 },
    ]);
    const nb = nativeBrandBackgroundFromThemedColor(theme, undefined, 'light', css);
    expect(nb.linear?.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    expect(nb.linear?.locations).toEqual([0, 0.5, 1]);
    expect(nb.solid).toBeUndefined();
  });
});

describe('buildTwoStopLinearGradientCss / parseTwoStopLinearGradientCss', () => {
  it('round-trips', () => {
    const css = buildTwoStopLinearGradientCss(135, '#abc', '#def');
    const p = parseTwoStopLinearGradientCss(css);
    expect(p).not.toBeNull();
    expect(p!.angleDeg).toBe(135);
    expect(p!.color0).toBe('#aabbcc');
    expect(p!.color1).toBe('#ddeeff');
  });
});

describe('parseLinearGradientCss / buildLinearGradientCss', () => {
  it('round-trips three stops', () => {
    const css = buildLinearGradientCss(90, [
      { color: '#111111', offsetPct: 0 },
      { color: '#222222', offsetPct: 33 },
      { color: '#333333', offsetPct: 100 },
    ]);
    const p = parseLinearGradientCss(css);
    expect(p).not.toBeNull();
    expect(p!.angleDeg).toBe(90);
    expect(p!.stops).toHaveLength(3);
    const mid = p!.stops[1];
    expect(mid).toBeDefined();
    expect(mid!.offsetPct).toBe(33);
    expect(nativeLinearFromAngleAndStops(p!.angleDeg, p!.stops).colors).toEqual(['#111111', '#222222', '#333333']);
  });

  it('rejects non-hex stops', () => {
    expect(parseLinearGradientCss('linear-gradient(0deg, rgb(1,2,3) 0%, #000 100%)')).toBeNull();
  });
});
