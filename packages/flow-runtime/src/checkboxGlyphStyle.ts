import type { CheckboxGlyphStyle, Border, DropShadow } from '@getrheo/contracts/layers';
import type { Theme } from '@getrheo/contracts/manifest';
import type { Branding } from '@getrheo/contracts/branding';
import type { BrandGradientNativeLinear } from './brandGradient';
import {
  nativeBrandBackgroundFromThemedColor,
  resolveThemedColor,
  resolveThemedBackground,
} from './layers';

const DEFAULT_UNCHECKED: CheckboxGlyphStyle = {
  size: 18,
  radius: 4,
  border: { width: 2, color: { light: '#71717a', dark: '#a1a1aa' } },
  background: 'transparent',
  opacity: 1,
};

const DEFAULT_CHECKED_OVERLAY: CheckboxGlyphStyle = {
  background: { light: '#18181b', dark: '#e4e4e7' },
  checkColor: { light: '#ffffff', dark: '#18181b' },
};

const mergeBorder = (a: Border | undefined, b: Border | undefined): Border | undefined => {
  if (!a && !b) return undefined;
  return { ...a, ...b };
};

const mergeGlyph = (a: CheckboxGlyphStyle, b?: CheckboxGlyphStyle): CheckboxGlyphStyle => {
  if (!b) return { ...a };
  const out: CheckboxGlyphStyle = { ...a };
  (Object.keys(b) as (keyof CheckboxGlyphStyle)[]).forEach((k) => {
    const v = b[k];
    if (v === undefined) return;
    if (k === 'border') {
      const merged = mergeBorder(out.border, v as Border);
      if (merged && Object.values(merged).some((x) => x !== undefined)) out.border = merged;
      else delete out.border;
      return;
    }
    if (k === 'shadow') {
      out.shadow = v as DropShadow;
      return;
    }
    (out as Record<string, unknown>)[k] = v;
  });
  return out;
};

/**
 * Merge author patches into stored checkbox glyph style (inspector).
 * `undefined` values in `patch` remove that key so defaults apply at render time.
 */
export const mergeCheckboxGlyphStyle = (
  prev: CheckboxGlyphStyle | undefined,
  patch: Partial<CheckboxGlyphStyle>,
): CheckboxGlyphStyle | undefined => {
  const out: CheckboxGlyphStyle = { ...(prev ?? {}) };
  for (const key of Object.keys(patch) as (keyof CheckboxGlyphStyle)[]) {
    const v = patch[key];
    if (key === 'border') {
      if (v === undefined) delete out.border;
      else out.border = mergeBorder(out.border, v as Border);
      if (out.border && !Object.values(out.border).some((x) => x !== undefined)) delete out.border;
      continue;
    }
    if (key === 'shadow') {
      if (v === undefined) delete out.shadow;
      else out.shadow = v as DropShadow;
      continue;
    }
    if (v === undefined) delete (out as Record<string, unknown>)[key];
    else (out as Record<string, unknown>)[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

export type ResolvedCheckboxGlyph = {
  sizePx: number;
  radiusPx: number;
  /** CSS `background` (solid or gradient string). Web sim applies this directly. */
  background: string | undefined;
  /** Solid fill for native, or underlay when {@link nativeLinearGradient} is null. */
  nativeBackgroundColor: string | undefined;
  /** Brand linear gradient for native; radial presets use solid fallback only. */
  nativeLinearGradient: BrandGradientNativeLinear | null;
  borderWidth: number | undefined;
  borderColor: string | undefined;
  opacity: number;
  checkColor: string | undefined;
  shadow: CheckboxGlyphStyle['shadow'];
};

/**
 * Resolved colors and numbers for painting the checkbox square (web or native).
 */
export const resolveCheckboxGlyphForRender = (
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  unchecked: CheckboxGlyphStyle | undefined,
  checkedOverlay: CheckboxGlyphStyle | undefined,
  isChecked: boolean,
  branding?: Branding,
): ResolvedCheckboxGlyph => {
  const base = mergeGlyph(DEFAULT_UNCHECKED, unchecked);
  const merged = isChecked ? mergeGlyph(mergeGlyph(base, DEFAULT_CHECKED_OVERLAY), checkedOverlay) : base;

  const sizePx = merged.size ?? 18;
  const radiusPx = merged.radius ?? 4;
  const borderWidth = merged.border?.width;
  const borderColor = resolveThemedColor(theme, palette, merged.border?.color);
  const background = resolveThemedBackground(theme, branding, palette, merged.background);
  const nb = nativeBrandBackgroundFromThemedColor(theme, branding, palette, merged.background);
  const opacity = merged.opacity ?? 1;
  const checkColor = isChecked
    ? resolveThemedColor(theme, palette, merged.checkColor)
    : undefined;

  return {
    sizePx,
    radiusPx,
    background,
    nativeBackgroundColor: nb.solid,
    nativeLinearGradient: nb.linear ?? null,
    borderWidth,
    borderColor,
    opacity,
    checkColor,
    shadow: merged.shadow,
  };
};
