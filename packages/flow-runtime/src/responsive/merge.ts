import {
  STYLE_BREAKPOINT_MERGE_ORDER,
  getActiveStyleBreakpointChain,
} from './breakpoints';
import type { StyleBreakpointKey } from './breakpoints';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Deep-merge style-like objects: nested plain objects merge per-key; scalars
 * and arrays replace. Suitable for padding/margin/border/shadow objects.
 */
export const deepMergeStyle = <T extends Record<string, unknown>>(
  base: T | undefined,
  ...overrides: (Partial<T> | undefined)[]
): T | undefined => {
  let acc: T | undefined = base ? ({ ...base } as T) : undefined;
  for (const o of overrides) {
    if (!o) continue;
    acc = acc ?? ({} as T);
    for (const [k, v] of Object.entries(o) as [keyof T, T[keyof T] | undefined][]) {
      if (v === undefined) continue;
      const prev = acc[k as keyof T] as unknown;
      if (isPlainObject(v) && isPlainObject(prev)) {
        const merged = deepMergeStyle(prev as Record<string, unknown>, v as Partial<T>);
        if (merged !== undefined) (acc as Record<string, unknown>)[k as string] = merged;
      } else {
        (acc as Record<string, unknown>)[k as string] = v as unknown;
      }
    }
  }
  return acc;
};

/**
 * Mobile-first merge: `base` applies below `sm`; each breakpoint partial stacks
 * from `sm` through the bucket implied by `widthPx`.
 */
export const mergeResponsivePartial = <T extends Record<string, unknown>>(
  base: Partial<T> | undefined,
  breakpoints: Partial<Record<StyleBreakpointKey, Partial<T>>> | undefined,
  widthPx: number,
): Partial<T> | undefined => {
  const chain = getActiveStyleBreakpointChain(widthPx);
  if (chain.length === 0) return base ? { ...base } : undefined;
  let acc = base ? ({ ...base } as Partial<T>) : undefined;
  for (const key of chain) {
    const patch = breakpoints?.[key];
    if (!patch) continue;
    acc = deepMergeStyle(acc as Record<string, unknown> | undefined, patch as Partial<T>) as
      | Partial<T>
      | undefined;
  }
  return acc;
};

/**
 * Merge breakpoint partials up to and including `bucket` (not using viewport width).
 * Use when editing a specific bucket's effective preview.
 */
export const mergeResponsivePartialUpToBucket = <T extends Record<string, unknown>>(
  base: Partial<T> | undefined,
  breakpoints: Partial<Record<StyleBreakpointKey, Partial<T>>> | undefined,
  bucket: StyleBreakpointKey | 'default',
): Partial<T> | undefined => {
  if (bucket === 'default') return base ? { ...base } : undefined;
  const end = STYLE_BREAKPOINT_MERGE_ORDER.indexOf(bucket);
  if (end < 0) return base ? { ...base } : undefined;
  let acc = base ? ({ ...base } as Partial<T>) : undefined;
  for (let i = 0; i <= end; i++) {
    const key = STYLE_BREAKPOINT_MERGE_ORDER[i]!;
    const patch = breakpoints?.[key];
    if (!patch) continue;
    acc = deepMergeStyle(acc as Record<string, unknown> | undefined, patch as Partial<T>) as
      | Partial<T>
      | undefined;
  }
  return acc;
};
