/**
 * Shared Dynamic Type multiplier table for Rheo mobile SDKs.
 * Maps iOS `UIContentSizeCategory` labels and RN `fontScale` to the same scale.
 * Default (medium / fontScale 1) = 1.0 — authored manifest `fontSize` is unchanged.
 */
export const DEFAULT_DYNAMIC_TYPE_FONT_SCALE = 1;

/** iOS `UIContentSizeCategory` string → multiplier (also used to validate RN fontScale bands). */
export const DYNAMIC_TYPE_SCALE_BY_IOS_CATEGORY: Readonly<Record<string, number>> = {
  xSmall: 0.82,
  small: 0.88,
  medium: 1,
  large: 1.12,
  xLarge: 1.23,
  xxLarge: 1.35,
  xxxLarge: 1.48,
  accessibilityMedium: 1.64,
  accessibilityLarge: 1.76,
  accessibilityXLarge: 1.88,
  accessibilityXXLarge: 2,
  accessibilityXXXLarge: 2.12,
};

/** Scale authored manifest `fontSize` by the system text-size multiplier. */
export const scaleAuthoredFontSize = (
  basePx: number | undefined,
  fontScale = DEFAULT_DYNAMIC_TYPE_FONT_SCALE,
): number | undefined => {
  if (basePx == null || !Number.isFinite(basePx)) return undefined;
  const scaled = basePx * fontScale;
  return Math.round(scaled * 100) / 100;
};

/** Resolve multiplier from an iOS content-size category label. */
export const fontScaleFromContentSizeCategory = (category: string): number =>
  DYNAMIC_TYPE_SCALE_BY_IOS_CATEGORY[category] ?? DEFAULT_DYNAMIC_TYPE_FONT_SCALE;
