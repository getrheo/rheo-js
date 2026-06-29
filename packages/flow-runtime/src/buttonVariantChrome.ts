import type { ButtonLayerVariant, ButtonStyle, ThemedColor, WidthValue } from '@getrheo/contracts/layers';
import { deepMergeStyle } from '@getrheo/flow-runtime/responsive/merge';

export type ResolvedButtonVariantChrome = {
  bg: string;
  color: string;
  border: string;
};

const FG_LIGHT = '#0a0a0a';
const FG_DARK = '#fafafa';

/** Default fill, label, and outline for a preset — used by web sim and native previews. */
export const buttonVariantChromeForTheme = (
  variant: ButtonLayerVariant,
  theme: 'light' | 'dark',
): ResolvedButtonVariantChrome => {
  const dark = theme === 'dark';
  switch (variant) {
    case 'primary':
      return dark
        ? { bg: FG_DARK, color: FG_LIGHT, border: 'transparent' }
        : { bg: FG_LIGHT, color: FG_DARK, border: 'transparent' };
    case 'secondary':
      return dark
        ? { bg: 'transparent', color: FG_DARK, border: '#27272a' }
        : { bg: 'transparent', color: FG_LIGHT, border: '#e4e4e7' };
    case 'ghost':
      return dark
        ? { bg: 'transparent', color: FG_DARK, border: 'transparent' }
        : { bg: 'transparent', color: FG_LIGHT, border: 'transparent' };
    case 'destructive':
      return dark
        ? { bg: '#ef4444', color: FG_DARK, border: 'transparent' }
        : { bg: '#dc2626', color: FG_DARK, border: 'transparent' };
  }
};

const pairThemedColor = (light: string, dark: string): ThemedColor =>
  light === dark ? light : { light, dark };

/**
 * Full variant chrome for manifests and variant-switch patches: themed fill/label/outline
 * plus layout/type tokens that match web sim `buttonBaseStyle` / native `buttonPalette` rows.
 */
export const buttonVariantAuthoringStyleDefaults = (
  variant: ButtonLayerVariant,
): Partial<ButtonStyle> => {
  const l = buttonVariantChromeForTheme(variant, 'light');
  const d = buttonVariantChromeForTheme(variant, 'dark');
  return {
    /** Matches web sim `buttonBaseStyle` (radius, type scale, width). */
    radius: 10,
    fontSize: 13,
    fontWeight: 600,
    width: 'full' as WidthValue,
    height: 'auto',
    background: pairThemedColor(l.bg, d.bg),
    color: pairThemedColor(l.color, d.color),
    border: {
      width: 1,
      color: pairThemedColor(l.border, d.border),
    },
  };
};

/**
 * Deep-merge variant chrome under an authored `style` so manifests include everything
 * the sim paints by default (padding and other keys from `style` win on conflict).
 */
export const mergeAuthoringButtonStyleWithLayer = (
  variant: ButtonLayerVariant,
  style: ButtonStyle | undefined,
): ButtonStyle =>
  deepMergeStyle(
    buttonVariantAuthoringStyleDefaults(variant) as Record<string, unknown>,
    (style ?? {}) as Record<string, unknown>,
  ) as ButtonStyle;

/** Variant outline fallback when authored style omits `border` (flat iOS alert rows use transparent fill). */
export const buttonPaletteBorderFallback = (
  variant: ButtonLayerVariant,
  theme: 'light' | 'dark',
  authoredStyle: Pick<ButtonStyle, 'border' | 'background'> | undefined,
  resolvedBackground: string | undefined,
): { borderWidth: number; borderColor?: string } => {
  const authoredWidth = authoredStyle?.border?.width;
  if (authoredWidth !== undefined) {
    return { borderWidth: authoredWidth, borderColor: undefined };
  }
  if (resolvedBackground === 'transparent') {
    return { borderWidth: 0, borderColor: undefined };
  }
  const chrome = buttonVariantChromeForTheme(variant, theme);
  return {
    borderWidth: chrome.border === 'transparent' ? 0 : 1,
    borderColor: chrome.border === 'transparent' ? undefined : chrome.border,
  };
};
