import type { Branding } from '@getrheo/contracts/branding';
import type { Theme } from '@getrheo/contracts/manifest';

/** Stored on {@link TextStyle.fontFamily} to force the document system stack (ignores `theme.fontFamily`). */
export const TEXT_FONT_FAMILY_SYSTEM_UI = '__rheo_system_ui__';

/** Web sim / builder root stack when no `theme.fontFamily` is set (matches `LayerRenderer` container). */
export const WEB_DOCUMENT_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const quoteCssFamilyName = (name: string): string => {
  const t = name.trim();
  if (!t) return '';
  const safe = /^[-_a-zA-Z0-9]+$/.test(t);
  return safe ? t : JSON.stringify(t);
};

const fontStackWithPrimary = (primary: string | undefined): string =>
  primary ? `${primary}, ${WEB_DOCUMENT_FONT_STACK}` : WEB_DOCUMENT_FONT_STACK;

/**
 * CSS `font-family` for the flow shell so `text` layers with no `fontFamily` inherit the theme body font.
 */
export const resolveWebRootFontFamilyCss = (theme: Theme | undefined): string | undefined => {
  const raw = theme?.fontFamily?.trim();
  if (!raw) return undefined;
  if (raw.includes(',')) return raw;
  return fontStackWithPrimary(quoteCssFamilyName(raw));
};

/**
 * CSS `font-family` for a text layer `div` (undefined layer value → inherit shell).
 */
export const resolveWebTextFontFamilyCss = (layerFont: string | undefined): string | undefined => {
  if (layerFont === TEXT_FONT_FAMILY_SYSTEM_UI) return WEB_DOCUMENT_FONT_STACK;
  const raw = layerFont?.trim();
  if (!raw) return undefined;
  if (raw.includes(',')) return raw;
  return fontStackWithPrimary(quoteCssFamilyName(raw));
};

/**
 * Inline `@font-face` rules for uploaded branding fonts (web / sim only).
 */
export const brandingWebFontFacesCss = (branding: Branding | undefined): string => {
  if (!branding?.fontFamilies?.length) return '';
  const blocks: string[] = [];
  for (const fam of branding.fontFamilies) {
    const famCss = quoteCssFamilyName(fam.name);
    for (const st of fam.styles) {
      if (!st.url?.trim()) continue;
      const url = JSON.stringify(st.url);
      blocks.push(
        `@font-face{font-family:${famCss};src:url(${url});font-weight:${st.weight};font-style:${st.italic ? 'italic' : 'normal'};font-display:swap;}`,
      );
    }
  }
  return blocks.join('');
};

/**
 * Expo / RN registration name for a single uploaded style row (see {@link buildBrandingFontLoadMap}).
 */
export const nativeFontRegistrationNameForStyle = (styleId: string): string => `RheoFont__${styleId}`;

/**
 * Map of **native font registration name → font file URL** for every branding style that has a `url`.
 * Pass the result to your host runtime’s font loader (e.g. `expo-font`’s `loadAsync`, a bare-RN native
 * module, or pre-linked assets). Keys match {@link resolveNativeTextFontFamilyName} after fonts are registered.
 */
export const buildBrandingFontLoadMap = (
  branding: Branding | null | undefined,
): Record<string, string> => {
  const map: Record<string, string> = {};
  if (!branding?.fontFamilies?.length) return map;
  for (const fam of branding.fontFamilies) {
    for (const st of fam.styles) {
      const u = st.url?.trim();
      if (!u) continue;
      map[nativeFontRegistrationNameForStyle(st.id)] = u;
    }
  }
  return map;
};

/**
 * Resolves the RN `fontFamily` string for a logical family name, preferring a loaded branding file
 * that matches weight (and falls back to nearest uploaded style with a URL).
 */
export const resolveNativeTextFontFamilyName = (
  branding: Branding | undefined,
  logicalFamily: string | undefined,
  fontWeight: number | undefined,
): string | undefined => {
  if (!logicalFamily?.trim()) return undefined;
  if (logicalFamily === TEXT_FONT_FAMILY_SYSTEM_UI) return undefined;
  const fam = branding?.fontFamilies.find((f) => f.name === logicalFamily);
  if (!fam) return logicalFamily;
  const w = fontWeight ?? 400;
  const withUrl = fam.styles.filter((s) => !!s.url?.trim());
  if (withUrl.length === 0) return logicalFamily;
  const exact = withUrl.find((s) => s.weight === w && !s.italic);
  const st = exact ?? withUrl.find((s) => s.weight === w) ?? withUrl[0];
  if (!st) return logicalFamily;
  return nativeFontRegistrationNameForStyle(st.id);
};
