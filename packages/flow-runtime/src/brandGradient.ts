import type { BrandGradient, Branding } from '@getrheo/contracts/branding';
import type { ThemedColor } from '@getrheo/contracts/layers';

export const BRAND_GRADIENT_PREFIX = '$brandGradient:' as const;

/** Serialize a branding gradient preset to a CSS `background` value. */
export const brandGradientToCss = (g: BrandGradient): string => {
  const stops = g.stops.map((s) => `${s.color} ${(s.offset * 100).toFixed(0)}%`).join(', ');
  if (g.type === 'linear') {
    const angle = g.angle ?? 180;
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  return `radial-gradient(circle, ${stops})`;
};

export const isBrandGradientToken = (s: string): boolean => s.startsWith(BRAND_GRADIENT_PREFIX);

/**
 * Resolve `$brandGradient:<uuid>` using app branding presets.
 * Unknown or missing preset id → `undefined`.
 */
export const resolveBrandGradientToken = (
  branding: Branding | undefined,
  token: string,
): string | undefined => {
  if (!isBrandGradientToken(token)) return undefined;
  const id = token.slice(BRAND_GRADIENT_PREFIX.length);
  const preset = branding?.gradientPresets.find((x) => x.id === id);
  return preset ? brandGradientToCss(preset) : undefined;
};

const rawThemedString = (
  palette: 'light' | 'dark',
  value: ThemedColor | undefined,
): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  return palette === 'dark' ? (value.dark ?? value.light) : (value.light ?? value.dark);
};

/** Resolve a manifest themed color to a branding gradient preset if it references `$brandGradient:`. */
export const brandGradientFromThemedColor = (
  branding: Branding | undefined,
  palette: 'light' | 'dark',
  value: ThemedColor | undefined,
): BrandGradient | undefined => {
  const raw = rawThemedString(palette, value);
  if (raw === undefined || !isBrandGradientToken(raw)) return undefined;
  const id = raw.slice(BRAND_GRADIENT_PREFIX.length);
  return branding?.gradientPresets.find((x) => x.id === id);
};

/** Native `LinearGradient` props for linear brand presets; `null` for radial (use solid fallback). */
export type BrandGradientNativeLinear = {
  colors: string[];
  locations: number[];
  start: { x: number; y: number };
  end: { x: number; y: number };
};

export const brandGradientNativeLinear = (g: BrandGradient): BrandGradientNativeLinear | null => {
  if (g.type !== 'linear') return null;
  const angleDeg = g.angle ?? 180;
  const θ = (angleDeg * Math.PI) / 180;
  const ux = Math.sin(θ);
  const uy = -Math.cos(θ);
  return {
    colors: g.stops.map((s) => s.color),
    locations: g.stops.map((s) => s.offset),
    start: { x: 0.5 - ux * 0.5, y: 0.5 - uy * 0.5 },
    end: { x: 0.5 + ux * 0.5, y: 0.5 + uy * 0.5 },
  };
};

export const brandGradientSolidFallback = (g: BrandGradient): string => g.stops[0]?.color ?? '#808080';

const HEX_FOR_GRADIENT = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Normalize hex for stored CSS gradients (3 → 6 chars; strip alpha channel for 8-char hex). */
export const normalizeHexForGradient = (hex: string): string => {
  const t = hex.trim();
  if (!HEX_FOR_GRADIENT.test(t)) return t;
  if (t.length === 4) {
    const [, r, g, b] = t;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (t.length === 9) return t.slice(0, 7).toLowerCase();
  return t.toLowerCase();
};

/** One color stop in a dashboard-authored `linear-gradient(...)` (percent along the axis). */
export type LinearGradientStopModel = { color: string; offsetPct: number };

const clampPct = (n: number): number => Math.min(100, Math.max(0, n));

/** Build canonical `linear-gradient(<deg>deg, #hex <pct>%, ...)` with at least two stops. */
export const buildLinearGradientCss = (angleDeg: number, stops: LinearGradientStopModel[]): string => {
  const a = Number.isFinite(angleDeg) ? angleDeg : 180;
  const sorted = [...stops]
    .map((s) => ({
      offsetPct: clampPct(Number.isFinite(s.offsetPct) ? s.offsetPct : 0),
      color: normalizeHexForGradient(s.color),
    }))
    .sort((x, y) => x.offsetPct - y.offsetPct);
  if (sorted.length < 2) {
    throw new Error('linear gradient requires at least 2 color stops');
  }
  for (const s of sorted) {
    if (!HEX_FOR_GRADIENT.test(s.color)) {
      throw new Error(`invalid gradient stop color: ${s.color}`);
    }
  }
  const body = sorted.map((s) => `${s.color} ${s.offsetPct.toFixed(0)}%`).join(', ');
  return `linear-gradient(${a}deg, ${body})`;
};

export const buildTwoStopLinearGradientCss = (
  angleDeg: number,
  color0: string,
  color1: string,
): string =>
  buildLinearGradientCss(angleDeg, [
    { color: color0, offsetPct: 0 },
    { color: color1, offsetPct: 100 },
  ]);

export const isStoredLinearGradientCss = (s: string): boolean =>
  /^\s*linear-gradient\s*\(/i.test(s.trim());

/** Parse dashboard-authored linear gradients with hex stops and explicit `%` positions. */
export const parseLinearGradientCss = (s: string): { angleDeg: number; stops: LinearGradientStopModel[] } | null => {
  const t = s.trim();
  const head = t.match(/^\s*linear-gradient\s*\(\s*([-0-9.]+)\s*deg\s*,\s*(.*)\)\s*$/is);
  if (!head) return null;
  const angleStr = head[1];
  const innerRaw = head[2];
  if (angleStr === undefined || innerRaw === undefined) return null;
  const angleDeg = Number(angleStr);
  if (!Number.isFinite(angleDeg)) return null;
  const inner = innerRaw.trim();
  if (!inner) return null;
  const parts = inner.split(/,(?=\s*#)/);
  const stops: LinearGradientStopModel[] = [];
  for (const part of parts) {
    const p = part.trim();
    const m = p.match(/^(#[0-9a-fA-F]{3,8})\s+([-0-9.]+)\s*%$/i);
    if (!m) return null;
    const hex = m[1];
    const offsetStr = m[2];
    if (hex === undefined || offsetStr === undefined) return null;
    const color = normalizeHexForGradient(hex);
    const offsetPct = Number(offsetStr);
    if (!Number.isFinite(offsetPct)) return null;
    if (!HEX_FOR_GRADIENT.test(color)) return null;
    stops.push({ color, offsetPct });
  }
  if (stops.length < 2) return null;
  return { angleDeg, stops };
};

export const parseTwoStopLinearGradientCss = (
  s: string,
): { angleDeg: number; color0: string; color1: string } | null => {
  const p = parseLinearGradientCss(s);
  if (!p || p.stops.length !== 2) return null;
  const sorted = [...p.stops].sort((a, b) => a.offsetPct - b.offsetPct);
  const s0 = sorted[0];
  const s1 = sorted[1];
  if (!s0 || !s1 || s0.offsetPct !== 0 || s1.offsetPct !== 100) return null;
  return { angleDeg: p.angleDeg, color0: s0.color, color1: s1.color };
};

export const nativeLinearFromAngleAndStops = (
  angleDeg: number,
  stops: { color: string; offsetPct: number }[],
): BrandGradientNativeLinear => {
  const sorted = [...stops]
    .map((s) => ({
      color: normalizeHexForGradient(s.color),
      offsetPct: clampPct(Number.isFinite(s.offsetPct) ? s.offsetPct : 0),
    }))
    .sort((a, b) => a.offsetPct - b.offsetPct);
  const θ = (angleDeg * Math.PI) / 180;
  const ux = Math.sin(θ);
  const uy = -Math.cos(θ);
  return {
    colors: sorted.map((s) => s.color),
    locations: sorted.map((s) => s.offsetPct / 100),
    start: { x: 0.5 - ux * 0.5, y: 0.5 - uy * 0.5 },
    end: { x: 0.5 + ux * 0.5, y: 0.5 + uy * 0.5 },
  };
};

export const nativeLinearFromAngleAndTwoColors = (
  angleDeg: number,
  color0: string,
  color1: string,
): BrandGradientNativeLinear =>
  nativeLinearFromAngleAndStops(angleDeg, [
    { color: color0, offsetPct: 0 },
    { color: color1, offsetPct: 100 },
  ]);
