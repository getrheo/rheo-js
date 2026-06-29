import type { ScaleInputLabelStyle, ScaleInputLayer, ThemedColor } from '@getrheo/contracts/layers';
import type { Theme } from '@getrheo/contracts/manifest';
import { resolveThemedColor } from './layers';

export type ResolvedScaleInputTextStyle = {
  fontFamily: string | undefined;
  fontSizePx: number;
  fontWeight: number | undefined;
  color: string;
  textAlign: ScaleInputLabelStyle['align'];
  lineHeight: number | undefined;
  opacity: number;
};

export type ResolvedScaleInputSliderStyle = {
  showLabels: boolean;
  showValue: boolean;
  trackHeightPx: number;
  trackColor: string;
  fillColor: string;
  thumbSizePx: number;
  thumbColor: string;
  label: ResolvedScaleInputTextStyle;
  value: ResolvedScaleInputTextStyle;
};

/** @deprecated Use {@link ResolvedScaleInputTextStyle}. */
export type ResolvedScaleInputLabelStyle = ResolvedScaleInputTextStyle;

const defaultTrackColor = (palette: 'light' | 'dark'): string =>
  palette === 'dark' ? '#3f3f46' : '#e4e4e7';

const defaultFillColor = (
  theme: Theme | undefined,
  palette: 'light' | 'dark',
): string => {
  const fromTheme = theme?.primary
    ? (resolveThemedColor(theme, palette, theme.primary) as string | undefined)
    : undefined;
  return fromTheme ?? (palette === 'dark' ? '#fafafa' : '#0a0a0a');
};

const defaultLabelColor = (palette: 'light' | 'dark'): string =>
  palette === 'dark' ? '#a1a1aa' : '#52525b';

const defaultValueColor = (palette: 'light' | 'dark'): string =>
  palette === 'dark' ? '#fafafa' : '#0a0a0a';

/**
 * Merge author patches into stored scale-input text style (inspector).
 * `undefined` values in `patch` remove that key so defaults apply at render time.
 */
export const mergeScaleInputLabelStyle = (
  prev: ScaleInputLabelStyle | undefined,
  patch: Partial<ScaleInputLabelStyle>,
): ScaleInputLabelStyle | undefined => {
  const out: ScaleInputLabelStyle = { ...(prev ?? {}) };
  for (const key of Object.keys(patch) as (keyof ScaleInputLabelStyle)[]) {
    const v = patch[key];
    if (v === undefined) delete (out as Record<string, unknown>)[key];
    else (out as Record<string, unknown>)[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/** Alias for {@link mergeScaleInputLabelStyle} — same shape for label and value typography. */
export const mergeScaleInputValueStyle = mergeScaleInputLabelStyle;

const resolveColor = (
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  color: ThemedColor | undefined,
  fallback: string,
): string =>
  (resolveThemedColor(theme, palette, color) as string | undefined) ?? fallback;

const resolveTextStyle = (
  style: ScaleInputLabelStyle | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  defaults: {
    fontSizePx: number;
    fontWeight?: number;
    color: string;
    opacity: number;
    textAlign?: ScaleInputLabelStyle['align'];
  },
): ResolvedScaleInputTextStyle => ({
  fontFamily: style?.fontFamily,
  fontSizePx: style?.fontSize ?? defaults.fontSizePx,
  fontWeight: style?.fontWeight ?? defaults.fontWeight,
  color: resolveColor(theme, palette, style?.color, defaults.color),
  textAlign: style?.align ?? defaults.textAlign,
  lineHeight: style?.lineHeight,
  opacity: style?.opacity ?? defaults.opacity,
});

export const resolveScaleInputSliderForRender = (
  layer: Pick<
    ScaleInputLayer,
    | 'labelStyle'
    | 'valueStyle'
    | 'showLabels'
    | 'showValue'
    | 'trackHeight'
    | 'trackColor'
    | 'fillColor'
    | 'thumbSize'
    | 'thumbColor'
  >,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
): ResolvedScaleInputSliderStyle => {
  const trackFallback = defaultTrackColor(palette);
  const fillFallback = defaultFillColor(theme, palette);
  return {
    showLabels: layer.showLabels !== false,
    showValue: layer.showValue !== false,
    trackHeightPx: layer.trackHeight ?? 4,
    trackColor: resolveColor(theme, palette, layer.trackColor, trackFallback),
    fillColor: resolveColor(theme, palette, layer.fillColor, fillFallback),
    thumbSizePx: layer.thumbSize ?? 16,
    thumbColor: resolveColor(theme, palette, layer.thumbColor, fillFallback),
    label: resolveTextStyle(layer.labelStyle, theme, palette, {
      fontSizePx: 11,
      color: defaultLabelColor(palette),
      opacity: 0.75,
    }),
    value: resolveTextStyle(layer.valueStyle, theme, palette, {
      fontSizePx: 14,
      fontWeight: 600,
      color: defaultValueColor(palette),
      opacity: 1,
      textAlign: 'center',
    }),
  };
};
