import type { CSSProperties } from 'react';
import type { Branding } from '@getrheo/contracts/branding';
import type {
  Border,
  ButtonStyle,
  CommonStyle,
  ImageStyle,
  Padding,
  TextStyle,
  WidthValue,
} from '@getrheo/contracts/layers';
import type { Theme } from '@getrheo/contracts/manifest';
import { dropShadowToWebStyle, layerRotateCssTransform, multiplyColorAlpha, resolveCommonBackgroundOpacity, resolveCommonLayerOpacity } from '@getrheo/flow-runtime';
import { resolveThemedBackground, resolveThemedColor } from '@getrheo/flow-runtime/layers';
import { resolveWebTextFontFamilyCss } from '@getrheo/renderer-core';

export const containerStyle = (palette: 'light' | 'dark', intrinsicHeight?: boolean): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  ...(intrinsicHeight
    ? {
        height: 'auto',
        // Hug content. `flex: 1` (basis 0%) inside min-height + overflow:hidden
        // chrome pins the shell to the floor and clips extra layers.
        flexGrow: 0,
        flexShrink: 0,
        minHeight: 'inherit',
      }
    : { height: '100%' }),
  width: '100%',
  background: intrinsicHeight
    ? 'transparent'
    : palette === 'dark'
      ? '#0a0a0a'
      : '#ffffff',
  color: palette === 'dark' ? '#fafafa' : '#0a0a0a',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
});

export const padding = (p: Padding | undefined): CSSProperties =>
  p
    ? {
        paddingTop: p.t,
        paddingRight: p.r,
        paddingBottom: p.b,
        paddingLeft: p.l,
      }
    : {};

export const margin = (p: Padding | undefined): CSSProperties =>
  p
    ? {
        marginTop: p.t,
        marginRight: p.r,
        marginBottom: p.b,
        marginLeft: p.l,
      }
    : {};

export const border = (
  b: Border | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
): CSSProperties =>
  b
    ? {
        borderStyle: 'solid',
        borderWidth: b.width,
        borderColor: resolveThemedColor(theme, palette, b.color) as string | undefined,
      }
    : {};

export const widthFor = (w: WidthValue | undefined): CSSProperties['width'] => {
  if (w === undefined) return undefined;
  if (typeof w === 'number') return w;
  switch (w) {
    case 'auto':
      return 'auto';
    case 'full':
      return '100%';
    case '1/2':
      return '50%';
    case '1/3':
      return '33.3333%';
    case '2/3':
      return '66.6667%';
    case '1/4':
      return '25%';
    case '3/4':
      return '75%';
  }
};

export const layoutHeightFor = (h: CommonStyle['height']): CSSProperties['height'] => {
  if (h === undefined) return undefined;
  if (h === 'fill') return '100%';
  return widthFor(h);
};

export const omitUndefinedCssProps = (style: CSSProperties): CSSProperties =>
  Object.fromEntries(
    Object.entries(style).filter(([, v]) => v !== undefined),
  ) as CSSProperties;

/** Default stack cross-axis is stretch; explicit start/center/end must not be overridden on children. */
export const parentAlignUsesCrossAxisStretch = (
  parentAlign: 'start' | 'center' | 'end' | 'stretch' | undefined,
): boolean => parentAlign === 'stretch' || parentAlign === undefined;

export const stripCommonLayoutForInner = (
  s: CommonStyle | undefined,
): CommonStyle | undefined => {
  if (!s) return undefined;
  const wasAbsolute = s.position === 'absolute';
  const out: CommonStyle = { ...s };
  delete out.zIndex;
  delete out.rotate;
  delete out.position;
  delete out.inset;
  if (wasAbsolute) {
    delete out.width;
    delete out.height;
    delete out.minWidth;
    delete out.maxWidth;
    delete out.minHeight;
    delete out.maxHeight;
  }
  return Object.keys(out).length ? out : undefined;
};

export const wrapperLayoutCssFromResolvedCommon = (
  resolved: CommonStyle | undefined,
): CSSProperties => {
  if (!resolved) return {};
  const out: CSSProperties = {};
  if (resolved.zIndex !== undefined) out.zIndex = resolved.zIndex;
  const rotate = layerRotateCssTransform(resolved.rotate);
  if (rotate !== undefined) out.transform = rotate;
  if (resolved.position === 'absolute') {
    out.position = 'absolute';
    const ins = resolved.inset;
    if (ins?.t !== undefined) out.top = ins.t;
    if (ins?.r !== undefined) out.right = ins.r;
    if (ins?.b !== undefined) out.bottom = ins.b;
    if (ins?.l !== undefined) out.left = ins.l;
    const wf = widthFor(resolved.width);
    if (wf !== undefined) out.width = wf;
    const hf = layoutHeightFor(resolved.height);
    if (hf !== undefined) out.height = hf;
    if (resolved.minWidth !== undefined) out.minWidth = resolved.minWidth;
    if (resolved.maxWidth !== undefined) out.maxWidth = resolved.maxWidth;
    if (resolved.minHeight !== undefined) out.minHeight = resolved.minHeight;
    if (resolved.maxHeight !== undefined) out.maxHeight = resolved.maxHeight;
  }
  return out;
};

/**
 * Web port of RN `stripFlowAxesForFlexChild`. Removes `width`/`height` (and
 * size clamps) from the inner chrome when a layer is a flex-flow child of a
 * parent stack (in which case the wrapping flex-shell owns those axes via
 * {@link flowChildLayoutCss}).
 */
export const stripFlowAxesForFlexChild = (
  s: CommonStyle | undefined,
  parentStackDirection: 'vertical' | 'horizontal' | undefined,
): CommonStyle | undefined => {
  if (!s || !parentStackDirection || s.position === 'absolute') return s;
  const out: CommonStyle = { ...s };
  delete out.width;
  delete out.height;
  delete out.minWidth;
  delete out.maxWidth;
  delete out.minHeight;
  delete out.maxHeight;
  return Object.keys(out).length ? out : undefined;
};

/**
 * Web port of RN `flowChildLayoutViewStyle`. Returns CSS for the outer
 * flex-shell that wraps a layer inside a parent stack. Mirrors the RN model:
 * `width: full` in a horizontal stack becomes `flex: 1; min-width: 0`; in a
 * vertical stack it becomes `width: 100%; align-self: stretch`. Fractional
 * widths and pixel widths translate to direct CSS values. `height: fill` (or
 * legacy `full`) becomes `flex: 1; min-height: 0; height: 100%` so a flex
 * child can stretch within a vertical stack.
 */
export const flowChildLayoutCss = (
  resolved: CommonStyle | undefined,
  parentStackDirection: 'vertical' | 'horizontal' | undefined,
  parentStackAlign?: 'start' | 'center' | 'end' | 'stretch',
): CSSProperties => {
  if (!resolved || resolved.position === 'absolute') return {};
  const out: CSSProperties = {};
  const heightFill = resolved.height === 'fill' || resolved.height === 'full';
  const widthAuto = resolved.width === 'auto';
  const crossStretch = parentAlignUsesCrossAxisStretch(parentStackAlign);
  if (heightFill) {
    if (parentStackDirection === 'horizontal') {
      // Cross-axis stretch in a row — must not flex-grow on width (main axis).
      Object.assign(out, {
        alignSelf: 'stretch',
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      });
    } else {
      // Main-axis grow in a column, or fill the region column when unattached.
      Object.assign(out, {
        flexGrow: widthAuto ? 0 : 1,
        flexShrink: widthAuto ? 0 : 1,
        flexBasis: 0,
        minHeight: 0,
        alignSelf: 'stretch',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      });
    }
  }
  const applySizeClamps = () => {
    if (resolved.minWidth !== undefined) out.minWidth = resolved.minWidth;
    if (resolved.maxWidth !== undefined) out.maxWidth = resolved.maxWidth;
    if (resolved.minHeight !== undefined) out.minHeight = resolved.minHeight;
    if (resolved.maxHeight !== undefined) out.maxHeight = resolved.maxHeight;
  };
  if (!parentStackDirection) {
    applySizeClamps();
    return out;
  }
  const w = resolved.width;
  if (w === 'full') {
    if (parentStackDirection === 'horizontal') {
      // Main-axis grow only — cross-axis follows parent `alignItems`.
      Object.assign(out, {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minWidth: 0,
      });
    } else {
      Object.assign(out, {
        width: '100%',
        ...(crossStretch ? { alignSelf: 'stretch' as const } : {}),
      });
    }
  } else if (w !== undefined && w !== 'auto') {
    out.width = widthFor(w);
  }
  const h = resolved.height;
  if (typeof h === 'number') {
    out.height = h;
  } else if (h !== undefined && h !== 'auto' && h !== 'fill' && h !== 'full') {
    out.height = layoutHeightFor(h);
  }
  // Authored clamps override flex defaults such as `minWidth: 0` / `minHeight: 0`.
  applySizeClamps();
  return out;
};

/**
 * Inner button pressable sizing. Width follows the flex-shell wrapper; height hugs
 * content unless the author sets `height: fill` (SwiftUI / RN parity).
 */
export const buttonChromeLayoutStyle = (
  resolved: ButtonStyle | undefined,
  parentStackDirection?: 'vertical' | 'horizontal',
): CSSProperties => {
  const heightFill = resolved?.height === 'fill' || resolved?.height === 'full';
  // In a horizontal stack a button hugs its content on the main axis unless it
  // authors an explicit width (full/fraction/px) — mirrors RN.
  const hugMainAxis =
    parentStackDirection === 'horizontal' &&
    (resolved?.width === undefined || resolved?.width === 'auto');
  return omitUndefinedCssProps({
    ...(hugMainAxis ? {} : { width: '100%' }),
    ...(heightFill
      ? {
          alignSelf: 'stretch',
          flexGrow: resolved?.width === 'auto' ? 0 : 1,
          flexShrink: resolved?.width === 'auto' ? 0 : 1,
          minHeight: 0,
          height: '100%',
        }
      : {}),
    ...(typeof resolved?.height === 'number' ? { height: resolved.height } : {}),
  });
};

/** Fill-aware `SelectableWrap` outer style between the flow shell and inner content. */
export const fillOuterStyleForHeight = (
  height: CommonStyle['height'] | undefined,
): CSSProperties | undefined => {
  const heightFill = height === 'fill' || height === 'full';
  if (!heightFill) return undefined;
  return {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    display: 'flex',
  };
};

/** Fill-aware `SelectableWrap` outer style when the button authors `height: fill`. */
export const buttonFillOuterStyle = (resolved: ButtonStyle | undefined): CSSProperties | undefined =>
  fillOuterStyleForHeight(resolved?.height);

/** Fill-aware `SelectableWrap` outer style when a stack authors `height: fill`. */
export const stackFillOuterStyle = (resolved: CommonStyle | undefined): CSSProperties | undefined =>
  fillOuterStyleForHeight(resolved?.height);

export const commonCss = (
  s: CommonStyle | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  branding?: Branding,
): CSSProperties => {
  if (!s) return {};
  const bgResolved = resolveThemedBackground(theme, branding, palette, s.background) as
    | string
    | undefined;
  const bg = multiplyColorAlpha(bgResolved, resolveCommonBackgroundOpacity(s));
  return omitUndefinedCssProps({
    ...padding(s.padding),
    ...margin(s.margin),
    borderRadius: s.radius,
    background: bg,
    opacity: resolveCommonLayerOpacity(s),
    width: widthFor(s.width),
    height: layoutHeightFor(s.height),
    minWidth: s.minWidth,
    maxWidth: s.maxWidth,
    minHeight: s.minHeight,
    maxHeight: s.maxHeight,
    ...border(s.border, theme, palette),
    ...dropShadowToWebStyle(s.shadow, theme, palette),
  });
};

export const textCss = (
  s: TextStyle | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  branding?: Branding,
): CSSProperties => {
  const newlineCss = { whiteSpace: 'pre-wrap' as const };
  if (!s) return newlineCss;
  const inner = stripCommonLayoutForInner(s);
  const bgResolved = resolveThemedBackground(
    theme,
    branding,
    palette,
    inner?.background ?? s.background,
  ) as string | undefined;
  const bg = multiplyColorAlpha(bgResolved, resolveCommonBackgroundOpacity(s));
  const chromeOnly: CommonStyle | undefined = inner
    ? (() => {
        const { background: _b, backgroundOpacity: _bo, ...rest } = inner as TextStyle;
        return rest as CommonStyle;
      })()
    : undefined;
  return omitUndefinedCssProps({
    ...commonCss(chromeOnly, theme, palette, branding),
    ...(bg !== undefined ? { background: bg } : {}),
    fontFamily: resolveWebTextFontFamilyCss(s.fontFamily),
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    color: resolveThemedColor(theme, palette, s.color) as string | undefined,
    textAlign: s.align,
    lineHeight: s.lineHeight,
    letterSpacing:
      s.letterSpacing !== undefined ? `${s.letterSpacing}em` : undefined,
    ...newlineCss,
  });
};

export const buttonCss = (
  s: ButtonStyle | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  branding?: Branding,
): CSSProperties => {
  if (!s) return {};
  const inner = stripCommonLayoutForInner(s);
  return omitUndefinedCssProps({
    ...commonCss(inner, theme, palette, branding),
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    color: resolveThemedColor(theme, palette, s.color) as string | undefined,
    textAlign: s.align,
  });
};

export const buttonLabelCss = (
  s: ButtonStyle | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
): CSSProperties => {
  if (!s) return {};
  return omitUndefinedCssProps({
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    color: resolveThemedColor(theme, palette, s.color) as string | undefined,
    textAlign: s.align,
  });
};

export const mergeDefinedCss = (base: CSSProperties, override: CSSProperties): CSSProperties => {
  const out: CSSProperties = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
};

/** Button chrome typography/color fills sparse labels; explicit text-child props win. */
export const mergeButtonInlineLabelCss = (
  buttonLabel: CSSProperties,
  childText: CSSProperties,
): CSSProperties => mergeDefinedCss(buttonLabel, childText);

export const imageCss = (
  s: ImageStyle | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  branding?: Branding,
): CSSProperties => {
  if (!s) return {};
  const inner = stripCommonLayoutForInner(s);
  return omitUndefinedCssProps({
    ...commonCss(inner, theme, palette, branding),
    height: layoutHeightFor(s.height),
    aspectRatio: s.aspectRatio ? String(s.aspectRatio) : undefined,
    objectFit: s.fit,
  });
};

/**
 * Outer box for image/lottie/video layers. The shell wrapper now owns
 * wrapper layout (position/inset/rotate/zIndex) and flex-flow axes; this
 * helper only applies chrome (background/border/radius/etc) plus
 * width/height when the layer is *not* inside a parent stack (the shell
 * handles flow children).
 */
export const mediaLayerOuterLayoutCss = (
  resolved: ImageStyle | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  branding?: Branding,
  parentStackDirection?: 'vertical' | 'horizontal',
): CSSProperties => {
  const stripped = stripCommonLayoutForInner(
    stripFlowAxesForFlexChild(resolved, parentStackDirection),
  );
  const common = commonCss(stripped, theme, palette, branding);
  const { width: _cw, height: _ch, ...commonNoAxes } = common;
  const isAbsolute = resolved?.position === 'absolute';
  const inFlex = parentStackDirection !== undefined;
  const directWidth =
    isAbsolute || inFlex ? undefined : widthFor(resolved?.width);
  const directHeight =
    isAbsolute || inFlex ? undefined : layoutHeightFor(resolved?.height);
  return omitUndefinedCssProps({
    ...commonNoAxes,
    width: directWidth,
    height: directHeight,
    boxSizing: 'border-box',
    minWidth: 0,
    aspectRatio: resolved?.aspectRatio ? String(resolved.aspectRatio) : undefined,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  });
};

/** Inner media surface fills the outer chrome box. No implicit min-height. */
export const mediaLayerInnerFillCss = (resolved: ImageStyle | undefined): CSSProperties => {
  const rawH = resolved?.height;
  const fillsHeight =
    rawH === 'fill' || rawH === 'full' || typeof rawH === 'number';
  return omitUndefinedCssProps({
    flex: 1,
    width: '100%',
    minWidth: 0,
    minHeight: 0,
    ...(fillsHeight ? { height: '100%' } : {}),
  });
};

/**
 * Media chrome should stretch to the flex-shell when the authored box has an
 * explicit size or fill axis — otherwise the shell has dimensions but the
 * inner chrome collapses to 0×0 (web img/lottie fill their shell via CSS).
 */
export const mediaChromeFillsMotionShell = (
  resolved: ImageStyle | undefined,
  parentStackDirection: 'vertical' | 'horizontal' | undefined,
): CSSProperties => {
  if (!parentStackDirection || !resolved) return {};
  const hugWidth = resolved.width === 'auto' || resolved.width === undefined;
  const hugHeight = resolved.height === 'auto' || resolved.height === undefined;
  if (hugWidth && hugHeight) return {};
  const pixelHeight = typeof resolved.height === 'number' ? resolved.height : undefined;
  const pixelWidth = typeof resolved.width === 'number' ? resolved.width : undefined;
  // Pixel boxes must not `flex: 1` / `width: 100%` — those belong on the layer
  // shell (`flowChildLayoutCss`). Stretching here collapses auto-height banners
  // and lets the media paint outside the screen fill.
  if (pixelHeight != null || pixelWidth != null) {
    return omitUndefinedCssProps({
      width: pixelWidth,
      height: pixelHeight,
      minWidth: pixelWidth,
      minHeight: pixelHeight,
      flexShrink: 0,
    });
  }
  return {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    minWidth: 0,
  };
};
