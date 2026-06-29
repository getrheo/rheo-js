import type { ScreenBackgroundFill, ScreenBackgroundFillPatch, ScreenContainerStyle, ScreenContainerStyleBreakpoints } from '@getrheo/contracts';
import type { StyleBreakpointKey } from './breakpoints';
import { getActiveStyleBreakpointChain, STYLE_BREAKPOINT_MERGE_ORDER } from './breakpoints';
import { deepMergeStyle } from './merge';

const mergeBackgroundFillPatch = (
  fill: ScreenBackgroundFill,
  patch: ScreenBackgroundFillPatch,
): ScreenBackgroundFill => {
  if (fill.kind === 'color') {
    return {
      ...fill,
      kind: 'color',
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {}),
    };
  }
  const scrim =
    patch.scrim !== undefined
      ? deepMergeStyle(fill.scrim as Record<string, unknown> | undefined, patch.scrim)
      : fill.scrim;
  const shared = {
    ...fill,
    ...(patch.fit !== undefined ? { fit: patch.fit } : {}),
    ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {}),
    ...(scrim !== undefined ? { scrim } : {}),
  };
  if (fill.kind === 'image') {
    return shared as ScreenBackgroundFill;
  }
  return {
    ...shared,
    ...(patch.loop !== undefined ? { loop: patch.loop } : {}),
    ...(patch.autoPlay !== undefined ? { autoPlay: patch.autoPlay } : {}),
    ...(patch.triggerLayerId !== undefined ? { triggerLayerId: patch.triggerLayerId } : {}),
    ...(patch.onComplete !== undefined ? { onComplete: patch.onComplete } : {}),
    ...(patch.audioEnabled !== undefined ? { audioEnabled: patch.audioEnabled } : {}),
  } as ScreenBackgroundFill;
};

export const resolveScreenContainerStyleAtWidth = (
  base: ScreenContainerStyle | undefined,
  breakpoints: ScreenContainerStyleBreakpoints | undefined,
  widthPx: number,
): ScreenContainerStyle | undefined => {
  const chain = getActiveStyleBreakpointChain(widthPx);
  let acc: ScreenContainerStyle | undefined = base ? { ...base } : undefined;
  for (const key of chain) {
    const patch = breakpoints?.[key as StyleBreakpointKey];
    if (!patch) continue;
    acc = acc ?? {};
    if (patch.padding !== undefined) acc = { ...acc, padding: patch.padding };
    if (patch.margin !== undefined) acc = { ...acc, margin: patch.margin };
    if (patch.insetSafeArea !== undefined) acc = { ...acc, insetSafeArea: patch.insetSafeArea };
    if (patch.backgroundFillPatch && acc.backgroundFill) {
      acc = {
        ...acc,
        backgroundFill: mergeBackgroundFillPatch(acc.backgroundFill, patch.backgroundFillPatch),
      };
    }
  }
  return acc;
};

export const screenBackgroundFillUsesMedia = (
  fill: ScreenBackgroundFill | undefined,
): fill is Extract<ScreenBackgroundFill, { kind: 'image' | 'video' }> =>
  fill?.kind === 'image' || fill?.kind === 'video';

/** Effective shell style for builder inspector at a specific breakpoint bucket. */
export const resolveScreenContainerForEditBucket = (
  base: ScreenContainerStyle | undefined,
  breakpoints: ScreenContainerStyleBreakpoints | undefined,
  bucket: StyleBreakpointKey | 'default',
): ScreenContainerStyle | undefined => {
  if (bucket === 'default') return base ? { ...base } : undefined;
  const end = STYLE_BREAKPOINT_MERGE_ORDER.indexOf(bucket);
  if (end < 0) return base ? { ...base } : undefined;
  let acc: ScreenContainerStyle | undefined = base ? { ...base } : {};
  for (let i = 0; i <= end; i++) {
    const patch = breakpoints?.[STYLE_BREAKPOINT_MERGE_ORDER[i]!];
    if (!patch) continue;
    acc = acc ?? {};
    if (patch.padding !== undefined) acc = { ...acc, padding: patch.padding };
    if (patch.margin !== undefined) acc = { ...acc, margin: patch.margin };
    if (patch.insetSafeArea !== undefined) acc = { ...acc, insetSafeArea: patch.insetSafeArea };
    if (patch.backgroundFillPatch && acc.backgroundFill) {
      acc = {
        ...acc,
        backgroundFill: mergeBackgroundFillPatch(acc.backgroundFill, patch.backgroundFillPatch),
      };
    }
  }
  const hasKeys =
    acc &&
    (acc.padding !== undefined ||
      acc.margin !== undefined ||
      acc.insetSafeArea !== undefined ||
      acc.backgroundFill !== undefined);
  return hasKeys ? acc : undefined;
};
