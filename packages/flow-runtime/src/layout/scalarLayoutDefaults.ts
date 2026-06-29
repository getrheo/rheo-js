import type { CommonStyle, LayerKind, LoaderLayer } from '@getrheo/contracts/layers';

/** Bar thickness (px) for a linear progress bar when `style.height` is omitted. */
export const DEFAULT_PROGRESS_LINEAR_HEIGHT_PX = 6;
/** Bar thickness (px) for a linear loader when `style.height` is omitted. */
export const DEFAULT_LOADER_LINEAR_HEIGHT_PX = 6;
/** Diameter (px) for a circular loader when `style.width`/`style.height` are omitted. */
export const DEFAULT_LOADER_CIRCULAR_SIZE_PX = 48;
/** Ring thickness (px) for a circular loader when `style.strokeWidth` is omitted. */
export const DEFAULT_LOADER_STROKE_WIDTH_PX = 4;

/**
 * Standard child spacing (px) for kinds that lay out children in a flex
 * container. Mirrors the authoring defaults in `createLayer*` and the
 * historical renderer fallbacks (`?? 8` / `?? 0`). Kinds without a `gap`
 * field, or where spacing does not apply, are absent (→ `null`).
 */
const GAP_BY_KIND: Partial<Record<LayerKind, number>> = {
  stack: 12,
  single_choice: 8,
  multiple_choice: 8,
  oauth_login: 8,
  email_password_auth: 8,
  email_password_submit: 8,
  button: 8,
  back_button: 8,
  oauth_provider: 8,
  hyperlink: 0,
};

export const defaultGapForLayerKind = (kind: LayerKind): number | null =>
  GAP_BY_KIND[kind] ?? null;

/**
 * Explicit scalar dimensions for feedback layers (progress / loader) whose
 * sizing lives directly on `style` as pixel values. Used by ingress
 * normalization to backfill omitted dimensions and by the inspector to show
 * the effective size. Renderers keep their own safety nets via the resolvers
 * in `responsive/layerResolve`.
 */
export const defaultFeedbackStyleScalars = (
  kind: 'progress' | 'loader',
  variant?: LoaderLayer['variant'],
): Partial<CommonStyle> | null => {
  if (kind === 'progress') {
    return { height: DEFAULT_PROGRESS_LINEAR_HEIGHT_PX };
  }
  if (variant === 'circular') {
    return {
      width: DEFAULT_LOADER_CIRCULAR_SIZE_PX,
      height: DEFAULT_LOADER_CIRCULAR_SIZE_PX,
      strokeWidth: DEFAULT_LOADER_STROKE_WIDTH_PX,
    };
  }
  return { height: DEFAULT_LOADER_LINEAR_HEIGHT_PX };
};
