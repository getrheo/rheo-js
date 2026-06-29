import { describe, expect, it } from 'vitest';
import {
  TEXT_FONT_FAMILY_SYSTEM_UI,
  WEB_DOCUMENT_FONT_STACK,
  brandingWebFontFacesCss,
  buildBrandingFontLoadMap,
  resolveWebRootFontFamilyCss,
  resolveWebTextFontFamilyCss,
  resolveNativeTextFontFamilyName,
  nativeFontRegistrationNameForStyle,
} from './layerTypography';
import type { Branding } from '@getrheo/contracts/branding';

describe('layerTypography', () => {
  it('forces system stack for system token', () => {
    expect(resolveWebTextFontFamilyCss(TEXT_FONT_FAMILY_SYSTEM_UI)).toBe(
      WEB_DOCUMENT_FONT_STACK,
    );
  });

  it('inherits for empty layer font', () => {
    expect(resolveWebTextFontFamilyCss(undefined)).toBeUndefined();
  });

  it('quotes custom web family with fallback', () => {
    expect(resolveWebTextFontFamilyCss('My Font')).toBe(
      `"My Font", ${WEB_DOCUMENT_FONT_STACK}`,
    );
  });

  it('root theme uses stack when single token', () => {
    expect(resolveWebRootFontFamilyCss({ fontFamily: 'Inter' })).toBe(
      `Inter, ${WEB_DOCUMENT_FONT_STACK}`,
    );
  });

  it('root passes through comma stacks', () => {
    expect(resolveWebRootFontFamilyCss({ fontFamily: 'Georgia, serif' })).toBe('Georgia, serif');
  });

  it('emits @font-face for branding urls', () => {
    const branding: Branding = {
      colorPresets: [],
      gradientPresets: [],
      fontFamilies: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Demo',
          styles: [
            {
              id: '00000000-0000-4000-8000-000000000002',
              weight: 400,
              italic: false,
              url: 'https://example.com/f.woff2',
            },
          ],
        },
      ],
    };
    const css = brandingWebFontFacesCss(branding);
    expect(css).toContain('@font-face');
    expect(css).toContain('https://example.com/f.woff2');
    expect(css).toContain('font-weight:400');
  });

  it('native maps branded family to registration name', () => {
    const sid = '00000000-0000-4000-8000-000000000099';
    const branding: Branding = {
      colorPresets: [],
      gradientPresets: [],
      fontFamilies: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Demo',
          styles: [{ id: sid, weight: 600, italic: false, url: 'https://example.com/x.ttf' }],
        },
      ],
    };
    expect(resolveNativeTextFontFamilyName(branding, 'Demo', 600)).toBe(nativeFontRegistrationNameForStyle(sid));
    expect(resolveNativeTextFontFamilyName(branding, TEXT_FONT_FAMILY_SYSTEM_UI, 400)).toBeUndefined();
    expect(resolveNativeTextFontFamilyName(undefined, 'Helvetica', 400)).toBe('Helvetica');
  });

  it('buildBrandingFontLoadMap collects urls', () => {
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
    expect(buildBrandingFontLoadMap(branding)).toEqual({
      [nativeFontRegistrationNameForStyle(sid)]: 'https://example.com/x.ttf',
    });
    expect(buildBrandingFontLoadMap(null)).toEqual({});
  });
});
