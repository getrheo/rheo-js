/**
 * Multiply the alpha of a resolved CSS color by `factor` (0–1).
 * Used so text layers can dim only the background fill without applying `opacity` to the whole node.
 * Supports #RGB, #RRGGBB, #RRGGBBAA, rgb(), rgba(). Unrecognized strings are returned as-is (no alpha change).
 */
export const multiplyColorAlpha = (
  color: string | undefined,
  factor: number | undefined,
): string | undefined => {
  if (color === undefined) return undefined;
  if (factor === undefined || factor >= 1 - 1e-6) return color;
  if (factor <= 1e-6) return 'rgba(0,0,0,0)';

  const hex8 = /^#([0-9a-fA-F]{8})$/;
  const hex6 = /^#([0-9a-fA-F]{6})$/;
  const hex3 = /^#([0-9a-fA-F]{3})$/;
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/;

  let r: number;
  let g: number;
  let b: number;
  let a = 1;

  const m8 = color.match(hex8);
  const m6 = color.match(hex6);
  const m3 = color.match(hex3);
  const mr = color.match(rgba);

  if (m8) {
    const h = m8[1]!;
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
    a = parseInt(h.slice(6, 8), 16) / 255;
  } else if (m6) {
    const h = m6[1]!;
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else if (m3) {
    const h = m3[1]!;
    r = parseInt(h[0]! + h[0]!, 16);
    g = parseInt(h[1]! + h[1]!, 16);
    b = parseInt(h[2]! + h[2]!, 16);
  } else if (mr) {
    r = Number(mr[1]);
    g = Number(mr[2]);
    b = Number(mr[3]);
    if (mr[4] !== undefined) a = Number(mr[4]);
  } else {
    return color;
  }

  const outA = Math.min(1, Math.max(0, a * factor));
  return `rgba(${r},${g},${b},${outA})`;
};

type CommonStyleOpacityInput = {
  background?: unknown;
  opacity?: number;
  backgroundOpacity?: number;
};

/** Background fill opacity only (does not dim child content). */
export const resolveCommonBackgroundOpacity = (
  s: CommonStyleOpacityInput | undefined,
): number | undefined => {
  if (!s) return undefined;
  if (s.backgroundOpacity !== undefined) return s.backgroundOpacity;
  // Legacy: stack background editor stored fill opacity as `opacity`.
  if (s.background !== undefined && s.opacity !== undefined) return s.opacity;
  return undefined;
};

/**
 * Whole-layer opacity (fades the layer and its descendants).
 * Excludes legacy misfiled background-only opacity when `background` is set.
 */
export const resolveCommonLayerOpacity = (
  s: CommonStyleOpacityInput | undefined,
): number | undefined => {
  if (s?.opacity === undefined) return undefined;
  if (
    s.backgroundOpacity === undefined &&
    s.background !== undefined &&
    s.opacity !== undefined
  ) {
    return undefined;
  }
  return s.opacity;
};
