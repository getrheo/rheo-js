import type { DropShadow } from '@getrheo/contracts/layers';
import type { Theme } from '@getrheo/contracts/manifest';
import { resolveThemedColor } from './layers';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const hexToRgba = (hex: string, alpha: number): string => {
  const raw = hex.trim().replace(/^#/, '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return `rgba(0,0,0,${clamp01(alpha)})`;
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp01(alpha)})`;
};

const colorWithOpacity = (resolved: string | undefined, opacity: number): string => {
  const o = clamp01(opacity);
  if (!resolved) return `rgba(0,0,0,${o})`;
  const t = resolved.trim();
  if (t.startsWith('#')) return hexToRgba(t, o);
  const m = t.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${o})`;
  return t;
};

const shadowHasAnyField = (sh: DropShadow | undefined): boolean =>
  sh !== undefined && Object.values(sh).some((v) => v !== undefined);

/**
 * CSS `boxShadow` string from structured shadow. Returns `undefined` when
 * `shadow` is absent or empty so callers can omit the property.
 */
export const dropShadowToBoxShadow = (
  sh: DropShadow | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
): string | undefined => {
  if (!shadowHasAnyField(sh)) return undefined;
  const ox = sh!.offsetX ?? 0;
  const oy = sh!.offsetY ?? 2;
  const blur = sh!.blur ?? 8;
  const spread = sh!.spread ?? 0;
  const opacity = sh!.opacity ?? 0.25;
  const base = resolveThemedColor(theme, palette, sh!.color);
  const color = colorWithOpacity(base, opacity);
  return `${ox}px ${oy}px ${blur}px ${spread}px ${color}`;
};

/** Web `CSSProperties` fragment for `boxShadow`. */
export const dropShadowToWebStyle = (
  sh: DropShadow | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
): { boxShadow?: string } => {
  const boxShadow = dropShadowToBoxShadow(sh, theme, palette);
  return boxShadow ? { boxShadow } : {};
};

/** React Native–compatible shadow props (no `react-native` import here). */
export type NativeDropShadowStyle = {
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  shadowColor?: string;
  elevation?: number;
};

export const dropShadowToNativeStyle = (
  sh: DropShadow | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
): NativeDropShadowStyle => {
  if (!shadowHasAnyField(sh)) return {};
  const ox = sh!.offsetX ?? 0;
  const oy = sh!.offsetY ?? 2;
  const blur = sh!.blur ?? 8;
  const opacity = sh!.opacity ?? 0.25;
  const base = resolveThemedColor(theme, palette, sh!.color);
  const color = colorWithOpacity(base, opacity);
  return {
    shadowOffset: { width: ox, height: oy },
    shadowOpacity: 1,
    shadowRadius: blur,
    shadowColor: color,
    elevation: Math.min(24, Math.max(0, Math.round(blur / 2 + Math.abs(oy)))),
  };
};
