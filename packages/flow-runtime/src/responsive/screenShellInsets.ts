import type { Padding } from '@getrheo/contracts';

const edge = (a: number | undefined, b: number | undefined): number | undefined => {
  const sum = (a ?? 0) + (b ?? 0);
  return sum === 0 ? undefined : sum;
};

/** Per-edge sum of two padding objects; omits zero edges. */
export const addPadding = (a?: Padding, b?: Padding): Padding | undefined => {
  if (!a && !b) return undefined;
  const out: Padding = {
    t: edge(a?.t, b?.t),
    r: edge(a?.r, b?.r),
    b: edge(a?.b, b?.b),
    l: edge(a?.l, b?.l),
  };
  const cleaned = Object.fromEntries(
    Object.entries(out).filter(([, v]) => v !== undefined),
  ) as Padding;
  return Object.keys(cleaned).length === 0 ? undefined : cleaned;
};

export const resolveEffectiveScreenShellPadding = (opts: {
  manual?: Padding;
  insetSafeArea?: boolean;
  safeAreaInsets: Padding;
}): Padding | undefined => {
  if (!opts.insetSafeArea) return opts.manual;
  return addPadding(opts.manual, opts.safeAreaInsets);
};
