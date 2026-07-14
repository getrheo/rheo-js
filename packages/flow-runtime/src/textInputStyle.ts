import type { CommonStyle, Padding, TextInputLayer } from '@getrheo/contracts/layers';
import type { Theme } from '@getrheo/contracts/manifest';
import {
  mergeScaleInputLabelStyle,
  resolveInputTypographyStyle,
  type ResolvedScaleInputTextStyle,
} from './scaleInputStyle';

export type ResolvedTextInputFieldStyle = ResolvedScaleInputTextStyle;

/** @deprecated Use {@link ResolvedTextInputFieldStyle}. */
export type ResolvedTextInputLabelStyle = ResolvedTextInputFieldStyle;

const defaultFieldColor = (palette: 'light' | 'dark'): string =>
  palette === 'dark' ? '#fafafa' : '#0a0a0a';

/** Default native-field chrome when layer `style` omits a property (sim + SDKs). */
export const textInputDefaultChromeColors = (
  palette: 'light' | 'dark',
): { background: string; border: string; placeholder: string } =>
  palette === 'dark'
    ? { background: '#18181b', border: '#27272a', placeholder: '#71717a' }
    : { background: '#fafafa', border: '#e4e4e7', placeholder: '#a1a1aa' };

const defaultPadding = (): Required<Pick<Padding, 't' | 'r' | 'b' | 'l'>> => ({
  t: 10,
  r: 12,
  b: 10,
  l: 12,
});

/**
 * Merge author patches into stored text-input field typography (inspector).
 * `undefined` values in `patch` remove that key so defaults apply at render time.
 */
export const mergeTextInputFieldStyle = mergeScaleInputLabelStyle;

export const resolveTextInputFieldForRender = (
  layer: Pick<TextInputLayer, 'fieldStyle'>,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
): ResolvedTextInputFieldStyle =>
  resolveInputTypographyStyle(layer.fieldStyle, theme, palette, {
    fontSizePx: 14,
    color: defaultFieldColor(palette),
    opacity: 1,
    textAlign: 'left',
  });

/**
 * Field chrome for the native input shell. Authorable via layer `style`
 * (padding / radius / background / border / shadow / backgroundOpacity);
 * missing keys fall back to sim defaults. Layout axes stay on the outer column.
 */
export const resolveTextInputFieldChromeStyle = (
  style: CommonStyle | undefined,
  palette: 'light' | 'dark',
): CommonStyle => {
  const defaults = textInputDefaultChromeColors(palette);
  const pad = defaultPadding();
  return {
    padding: {
      t: style?.padding?.t ?? pad.t,
      r: style?.padding?.r ?? pad.r,
      b: style?.padding?.b ?? pad.b,
      l: style?.padding?.l ?? pad.l,
    },
    radius: style?.radius ?? 10,
    background: style?.background ?? defaults.background,
    border: {
      width: style?.border?.width ?? 1,
      color: style?.border?.color ?? defaults.border,
    },
    ...(style?.shadow !== undefined ? { shadow: style.shadow } : {}),
    ...(style?.backgroundOpacity !== undefined
      ? { backgroundOpacity: style.backgroundOpacity }
      : {}),
  };
};

/** Drop field-chrome keys so the outer column only keeps layout / margin / opacity. */
export const stripTextInputFieldChromeFromStyle = (
  style: CommonStyle | undefined,
): CommonStyle | undefined => {
  if (!style) return undefined;
  const out: CommonStyle = { ...style };
  delete out.padding;
  delete out.radius;
  delete out.background;
  delete out.border;
  delete out.shadow;
  delete out.backgroundOpacity;
  return Object.keys(out).length ? out : undefined;
};
