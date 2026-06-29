import { describe, expect, it } from 'vitest';
import type { Branding } from '@getrheo/contracts/branding';
import { buildBrandingFontLoadMap, nativeFontRegistrationNameForStyle } from './index';

describe('renderer-core typography parity', () => {
  it('buildBrandingFontLoadMap keys match native registration names', () => {
    const sid = '00000000-0000-4000-8000-000000000099';
    const branding: Branding = {
      colorPresets: [],
      gradientPresets: [],
      fontFamilies: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Demo',
          styles: [{ id: sid, weight: 400, italic: false, url: 'https://example.com/x.ttf' }],
        },
      ],
    };
    const map = buildBrandingFontLoadMap(branding);
    const reg = nativeFontRegistrationNameForStyle(sid);
    expect(map[reg]).toBe('https://example.com/x.ttf');
  });
});
