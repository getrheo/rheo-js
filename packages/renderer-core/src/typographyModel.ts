import type { Branding } from '@getrheo/contracts/branding';
import type { TextStyle, ThemedColor } from '@getrheo/contracts/layers';
import type { Theme } from '@getrheo/contracts/manifest';
import {
  resolveNativeTextFontFamilyName,
  resolveThemedColor,
  resolveWebTextFontFamilyCss,
} from '@getrheo/flow-runtime';

export type RendererPalette = 'light' | 'dark';

export type RendererTypographyModel = {
  fontFamily: string | undefined;
  webFontFamily: string | undefined;
  nativeFontFamily: string | undefined;
  fontSize: number | undefined;
  fontWeight: number | undefined;
  color: string | undefined;
  align: TextStyle['align'];
  lineHeight: number | undefined;
};

export const rendererTypographyModel = ({
  style,
  theme,
  palette,
  branding,
  fallbackColor,
}: {
  style: Pick<
    TextStyle,
    'fontFamily' | 'fontSize' | 'fontWeight' | 'color' | 'align' | 'lineHeight'
  > | undefined;
  theme: Theme | undefined;
  palette: RendererPalette;
  branding?: Branding;
  fallbackColor?: ThemedColor;
}): RendererTypographyModel => {
  const color = resolveThemedColor(theme, palette, style?.color ?? fallbackColor);
  return {
    fontFamily: style?.fontFamily,
    webFontFamily: resolveWebTextFontFamilyCss(style?.fontFamily),
    nativeFontFamily: resolveNativeTextFontFamilyName(branding, style?.fontFamily, style?.fontWeight),
    fontSize: style?.fontSize,
    fontWeight: style?.fontWeight,
    color,
    align: style?.align,
    lineHeight: style?.lineHeight,
  };
};
