import type {
  BackButtonLayer,
  ButtonLayer,
  ButtonStyle,
  CommonLayoutHeight,
  CommonStyle,
  IconStyle,
  ImageStyle,
  LayerKind,
  StackLayer,
  TextLayer,
  TextStyle,
  WidthValue,
} from '@getrheo/contracts/layers';
import {
  DEFAULT_LOADER_CIRCULAR_SIZE_PX,
  DEFAULT_LOADER_LINEAR_HEIGHT_PX,
  DEFAULT_LOADER_STROKE_WIDTH_PX,
  DEFAULT_PROGRESS_LINEAR_HEIGHT_PX,
  defaultGapForLayerKind,
} from '../layout/scalarLayoutDefaults';
import type { StyleBreakpointKey } from './breakpoints';
import { getActiveStyleBreakpointChain } from './breakpoints';
import { mergeResponsivePartial, mergeResponsivePartialUpToBucket } from './merge';

/**
 * Effective child spacing (px) for a layer, falling back to the per-kind
 * default and finally `0`. Single runtime source of truth so renderers stop
 * hard-coding `?? 8` / `?? 0`.
 */
export const resolveLayerGap = (kind: LayerKind, gap: number | undefined): number =>
  gap ?? defaultGapForLayerKind(kind) ?? 0;

/** Effective bar thickness (px) for a linear progress bar. */
export const resolveProgressLinearHeightPx = (
  height: CommonLayoutHeight | undefined,
): number => (typeof height === 'number' ? height : DEFAULT_PROGRESS_LINEAR_HEIGHT_PX);

/** Effective bar thickness (px) for a linear loader. */
export const resolveLoaderLinearHeightPx = (
  height: CommonLayoutHeight | undefined,
): number => (typeof height === 'number' ? height : DEFAULT_LOADER_LINEAR_HEIGHT_PX);

/** Effective diameter (px) for a circular loader (sized via `style.width`). */
export const resolveLoaderCircularSizePx = (width: WidthValue | undefined): number =>
  typeof width === 'number' ? width : DEFAULT_LOADER_CIRCULAR_SIZE_PX;

/** Effective ring thickness (px) for a circular loader. */
export const resolveLoaderStrokeWidthPx = (strokeWidth: number | undefined): number =>
  strokeWidth ?? DEFAULT_LOADER_STROKE_WIDTH_PX;

export type StackLayoutBreakpointPatch = {
  gap?: number;
  direction?: 'vertical' | 'horizontal';
};

export type ButtonLayoutBreakpointPatch = {
  gap?: number;
  direction?: 'vertical' | 'horizontal';
};

export const resolveCommonStyleAtWidth = (
  base: CommonStyle | undefined,
  breakpoints:
    | Partial<Record<StyleBreakpointKey, Partial<CommonStyle>>>
    | undefined,
  widthPx: number,
): CommonStyle | undefined =>
  mergeResponsivePartial(
    base as Record<string, unknown> | undefined,
    breakpoints as Partial<Record<StyleBreakpointKey, Partial<Record<string, unknown>>>> | undefined,
    widthPx,
  ) as CommonStyle | undefined;

export const resolveTextStyleAtWidth = (
  base: TextStyle | undefined,
  breakpoints:
    | Partial<Record<StyleBreakpointKey, Partial<TextStyle>>>
    | undefined,
  widthPx: number,
): TextStyle | undefined =>
  mergeResponsivePartial(
    base as Record<string, unknown> | undefined,
    breakpoints as Partial<Record<StyleBreakpointKey, Partial<Record<string, unknown>>>> | undefined,
    widthPx,
  ) as TextStyle | undefined;

export const resolveImageStyleAtWidth = (
  base: ImageStyle | undefined,
  breakpoints:
    | Partial<Record<StyleBreakpointKey, Partial<ImageStyle>>>
    | undefined,
  widthPx: number,
): ImageStyle | undefined =>
  mergeResponsivePartial(
    base as Record<string, unknown> | undefined,
    breakpoints as Partial<Record<StyleBreakpointKey, Partial<Record<string, unknown>>>> | undefined,
    widthPx,
  ) as ImageStyle | undefined;

export const resolveIconStyleAtWidth = (
  base: IconStyle | undefined,
  breakpoints:
    | Partial<Record<StyleBreakpointKey, Partial<IconStyle>>>
    | undefined,
  widthPx: number,
): IconStyle | undefined =>
  mergeResponsivePartial(
    base as Record<string, unknown> | undefined,
    breakpoints as Partial<Record<StyleBreakpointKey, Partial<Record<string, unknown>>>> | undefined,
    widthPx,
  ) as IconStyle | undefined;

export const resolveButtonStyleAtWidth = (
  base: ButtonStyle | undefined,
  breakpoints:
    | Partial<Record<StyleBreakpointKey, Partial<ButtonStyle>>>
    | undefined,
  widthPx: number,
): ButtonStyle | undefined =>
  mergeResponsivePartial(
    base as Record<string, unknown> | undefined,
    breakpoints as Partial<Record<StyleBreakpointKey, Partial<Record<string, unknown>>>> | undefined,
    widthPx,
  ) as ButtonStyle | undefined;

const mergeLayoutScalars = <T extends Record<string, unknown>>(
  base: T,
  breakpoints: Partial<Record<StyleBreakpointKey, Partial<T>>> | undefined,
  widthPx: number,
): T => {
  const chain = getActiveStyleBreakpointChain(widthPx);
  let acc = { ...base };
  for (const key of chain) {
    const p = breakpoints?.[key];
    if (!p) continue;
    acc = { ...acc, ...p };
  }
  return acc;
};

export const resolveStackLayoutAtWidth = (
  layer: Pick<
    StackLayer,
    'gap' | 'direction' | 'stackLayoutBreakpoints'
  >,
  widthPx: number,
): { gap: number | undefined; direction: StackLayer['direction'] } => {
  const base = {
    gap: layer.gap,
    direction: layer.direction,
  };
  const merged = mergeLayoutScalars(
    base,
    layer.stackLayoutBreakpoints as
      | Partial<Record<StyleBreakpointKey, Partial<{ gap?: number; direction?: StackLayer['direction'] }>>>
      | undefined,
    widthPx,
  );
  return {
    gap: merged.gap,
    direction: merged.direction ?? layer.direction,
  };
};

export const resolveButtonLayoutAtWidth = (
  layer: Pick<ButtonLayer | BackButtonLayer, 'gap' | 'direction' | 'buttonLayoutBreakpoints'>,
  widthPx: number,
): { gap: number | undefined; direction: ButtonLayer['direction'] | undefined } => {
  const merged = mergeLayoutScalars(
    { gap: layer.gap, direction: layer.direction },
    layer.buttonLayoutBreakpoints as
      | Partial<
          Record<
            StyleBreakpointKey,
            Partial<{ gap?: number; direction?: ButtonLayer['direction'] }>
          >
        >
      | undefined,
    widthPx,
  );
  return { gap: merged.gap, direction: merged.direction };
};

/** Effective styles for editor preview at the bucket implied by device width. */
export const resolveTextStyleForEditBucket = (
  base: TextStyle | undefined,
  breakpoints: TextLayer['styleBreakpoints'],
  bucket: StyleBreakpointKey | 'default',
): TextStyle | undefined =>
  mergeResponsivePartialUpToBucket(
    base as Record<string, unknown> | undefined,
    breakpoints as Partial<Record<StyleBreakpointKey, Partial<Record<string, unknown>>>> | undefined,
    bucket,
  ) as TextStyle | undefined;

export const resolveCommonStyleForEditBucket = (
  base: CommonStyle | undefined,
  breakpoints: StackLayer['styleBreakpoints'],
  bucket: StyleBreakpointKey | 'default',
): CommonStyle | undefined =>
  mergeResponsivePartialUpToBucket(
    base as Record<string, unknown> | undefined,
    breakpoints as Partial<Record<StyleBreakpointKey, Partial<Record<string, unknown>>>> | undefined,
    bucket,
  ) as CommonStyle | undefined;
