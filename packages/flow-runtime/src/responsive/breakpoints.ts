/**
 * Tailwind CSS default `screens` min-width values (px). Single source of truth
 * for preview buckets, manifest breakpoints, and runtime style resolution.
 *
 * @see https://tailwindcss.com/docs/screens
 */
export const TAILWIND_DEFAULT_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/** Viewport classification used by preview UI and editing scope. */
export type ScreenSizeBucket = 'default' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Ordered keys stored on layers (`styleBreakpoints`) and merged mobile-first. */
export const STYLE_BREAKPOINT_MERGE_ORDER = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
export type StyleBreakpointKey = (typeof STYLE_BREAKPOINT_MERGE_ORDER)[number];

export const SCREEN_SIZE_BUCKET_ORDER: readonly ScreenSizeBucket[] = [
  'default',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
] as const;

/** Buckets shown in the flow builder inspector (full Tailwind screen set). */
export const BUILDER_INSPECTOR_BUCKET_ORDER: readonly ScreenSizeBucket[] = SCREEN_SIZE_BUCKET_ORDER;

/** Human-readable bucket titles; ranges lie between consecutive breakpoints. */
export const SCREEN_SIZE_BUCKET_LABEL: Record<ScreenSizeBucket, string> = {
  default: 'Default (< 640px)',
  sm: 'sm (640–767px)',
  md: 'md (768–1023px)',
  lg: 'lg (1024–1279px)',
  xl: 'xl (1280–1535px)',
  '2xl': '2xl (1536px+)',
};

/** Fallback viewport width when no `previewWidthPx` is passed (simulator / static previews). */
export const DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX = 390;

/** Maps viewport width (CSS px) to the Tailwind viewport bucket. */
export const getScreenSizeBucketForWidth = (width: number): ScreenSizeBucket => {
  const { sm, md, lg, xl, '2xl': xxl } = TAILWIND_DEFAULT_BREAKPOINTS;
  if (width < sm) return 'default';
  if (width < md) return 'sm';
  if (width < lg) return 'md';
  if (width < xl) return 'lg';
  if (width < xxl) return 'xl';
  return '2xl';
};

/**
 * Breakpoint keys whose partials apply at this width (mobile-first), e.g.
 * width 800 → `['sm','md']`.
 */
export const getActiveStyleBreakpointChain = (widthPx: number): StyleBreakpointKey[] => {
  const bucket = getScreenSizeBucketForWidth(widthPx);
  if (bucket === 'default') return [];
  const idx = STYLE_BREAKPOINT_MERGE_ORDER.indexOf(bucket as StyleBreakpointKey);
  if (idx < 0) return [];
  return STYLE_BREAKPOINT_MERGE_ORDER.slice(0, idx + 1) as StyleBreakpointKey[];
};
