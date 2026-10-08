import { Fragment, type CSSProperties } from 'react';
import type { HyperlinkLayer, Layer, StackLayer, TextLayer } from '@getrheo/contracts/layers';
import { layerHasAbsolutePositionAuthored, layerSubtreeContainsAbsolutePosition } from '@getrheo/contracts/layers';
import { resolveLocalizedText } from '@getrheo/contracts/localized';
import { resolveAndInterpolateLocalizedText } from '@getrheo/flow-runtime/interpolateTemplate';
import { resolveHyperlinkPreviewLabel } from '@getrheo/flow-runtime/hyperlinkLabel';
import { DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX } from '@getrheo/flow-runtime/responsive/breakpoints';
import {
  resolveCommonStyleAtWidth,
  resolveHyperlinkLayoutAtWidth,
  resolveLayerGap,
  resolveStackLayoutAtWidth,
  resolveTextStyleAtWidth,
} from '@getrheo/flow-runtime/responsive/layerResolve';
import { stackMainAxisFillHeight } from '@getrheo/flow-runtime';
import {
  commonCss,
  padding,
  stackFillOuterStyle,
  textCss,
  widthFor,
  stripCommonLayoutForInner,
  stripFlowAxesForFlexChild,
} from '../LayerRendererStyle';
import { SelectableWrap, type Ctx, type RenderLayer } from '../LayerRendererShared';

const resolvedLayerZIndex = (layer: Layer, viewportW: number): number => {
  if (!('style' in layer)) return 0;
  const resolved = resolveCommonStyleAtWidth(
    layer.style,
    'styleBreakpoints' in layer ? layer.styleBreakpoints : undefined,
    viewportW,
  );
  return resolved?.zIndex ?? 0;
};

const stripPaddingFromCommonStyle = (
  style: ReturnType<typeof stripCommonLayoutForInner>,
): ReturnType<typeof stripCommonLayoutForInner> => {
  if (!style) return undefined;
  const { padding: _padding, ...rest } = style;
  return Object.keys(rest).length ? rest : undefined;
};

export const StackView = ({ layer, ctx, renderLayer }: { layer: StackLayer; ctx: Ctx; renderLayer: RenderLayer }) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const layout = resolveStackLayoutAtWidth(layer, w);
  const isVertical = layout.direction === 'vertical';
  const justifyMap: Record<NonNullable<StackLayer['distribution']>, CSSProperties['justifyContent']> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
  };
  const alignMap: Record<NonNullable<StackLayer['align']>, CSSProperties['alignItems']> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  };
  const justifyContent = layer.distribution ? justifyMap[layer.distribution] : undefined;
  const resolvedStyle = resolveCommonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const subtreeAbs = layerSubtreeContainsAbsolutePosition(layer);
  const stripped = stripCommonLayoutForInner(
    stripFlowAxesForFlexChild(resolvedStyle, ctx.parentStackDirection),
  );
  const containerStripped = subtreeAbs ? stripPaddingFromCommonStyle(stripped) : stripped;
  const commonRaw = commonCss(containerStripped, ctx.manifest.theme, ctx.theme, ctx.branding);
  const isRoot = ctx.isRegionRoot === true;
  const intrinsicRoot = isRoot && ctx.intrinsicRegionLayout === true;
  // `height: full/fill` → CSS `100%`. Inside an auto-height banner that percentage
  // resolves against the chrome min-height and overflow:hidden then clips extra layers.
  const common =
    intrinsicRoot && (commonRaw.height === '100%' || commonRaw.height === 'fill')
      ? (() => {
          const { height: _height, ...rest } = commonRaw;
          return rest;
        })()
      : commonRaw;
  const flowWidth =
    resolvedStyle?.position === 'absolute' || ctx.parentStackDirection !== undefined
      ? undefined
      : (widthFor(resolvedStyle?.width) ?? '100%');
  const rootFillsRegionHeight =
    isRoot && ctx.regionKind === 'body' && !intrinsicRoot;
  const mainAxisFill =
    isRoot || (layer.distribution !== undefined && layer.distribution !== 'start');
  const childCtx: Ctx = {
    ...ctx,
    isRegionRoot: false,
    regionKind: undefined,
    parentStackDirection: layout.direction,
    parentStackAlign: layer.align,
  };
  const sizeStyle: CSSProperties = {
    ...(flowWidth !== undefined ? { width: flowWidth } : {}),
    ...(rootFillsRegionHeight
      ? { flex: 1, width: '100%', alignSelf: 'stretch' }
      : isRoot
        ? intrinsicRoot
          ? { flex: 'none', alignSelf: 'stretch' }
          : { flex: 1, alignSelf: 'stretch' }
        : mainAxisFill && isVertical
          ? { height: '100%' }
          : {}),
    ...(intrinsicRoot ? {} : { minHeight: 0 }),
    minWidth: 0,
  };
  const flowLayoutStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isVertical ? 'column' : 'row',
    gap: resolveLayerGap('stack', layout.gap),
    alignItems: layer.align ? alignMap[layer.align] : undefined,
    justifyContent,
    flexWrap: layer.wrap ? 'wrap' : undefined,
    boxSizing: 'border-box',
  };
  const outerStyle: CSSProperties = subtreeAbs
    ? {
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'visible',
        ...common,
        ...sizeStyle,
      }
    : {
        ...flowLayoutStyle,
        ...common,
        ...sizeStyle,
      };
  // Absolute split: a single real flex flow container fills the positioning
  // context (outer) so flow children keep a flex parent and the `stackMainAxisFillHeight`
  // gate only decides whether the flow container lets its children grow on the main axis.
  const heightFillsMainAxis = stackMainAxisFillHeight(resolvedStyle?.height);
  const flowFillsMainAxis = !intrinsicRoot && heightFillsMainAxis;
  const fillOuterStyle =
    intrinsicRoot && heightFillsMainAxis
      ? { alignSelf: 'stretch', width: '100%' }
      : stackFillOuterStyle(resolvedStyle);
  const flowContainerStyle: CSSProperties = {
    ...flowLayoutStyle,
    position: 'relative',
    width: '100%',
    height: flowFillsMainAxis ? '100%' : undefined,
    ...padding(resolvedStyle?.padding),
    zIndex: 0,
  };
  const flowChildren = layer.children.filter((c) => !layerHasAbsolutePositionAuthored(c));
  const absoluteChildren = layer.children
    .filter(layerHasAbsolutePositionAuthored)
    .sort((a, b) => resolvedLayerZIndex(a, w) - resolvedLayerZIndex(b, w));
  const wrapStyle: CSSProperties = fillOuterStyle ? { ...outerStyle, ...fillOuterStyle } : outerStyle;

  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={wrapStyle}>
      {subtreeAbs ? (
        <>
          <div style={flowContainerStyle}>
            {flowChildren.map((c) => (
              <Fragment key={c.id}>{renderLayer(c, childCtx)}</Fragment>
            ))}
          </div>
          {absoluteChildren.map((c) => (
            <Fragment key={c.id}>{renderLayer(c, childCtx)}</Fragment>
          ))}
        </>
      ) : (
        layer.children.map((c) => (
          <Fragment key={c.id}>{renderLayer(c, childCtx)}</Fragment>
        ))
      )}
    </SelectableWrap>
  );
};

export const TextView = ({ layer, ctx }: { layer: TextLayer; ctx: Ctx }) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedStyle = resolveTextStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const display = ctx.interpolationContext
    ? resolveAndInterpolateLocalizedText(layer.text, {
        manifest: ctx.manifest,
        locale: ctx.locale,
        responses: ctx.interpolationContext.responses,
        customProperties: ctx.interpolationContext.customProperties,
      })
    : resolveLocalizedText(layer.text, ctx.locale);
  const innerWidth =
    resolvedStyle?.position !== 'absolute' && ctx.parentStackDirection === undefined
      ? widthFor(resolvedStyle?.width)
      : undefined;
  const innerStyle = stripFlowAxesForFlexChild(resolvedStyle, ctx.parentStackDirection) as
    | typeof resolvedStyle
    | undefined;
  return (
    <SelectableWrap
      layer={layer}
      ctx={ctx}
      outerStyle={innerWidth !== undefined ? { width: innerWidth } : undefined}
    >
      <div style={textCss(innerStyle, ctx.manifest.theme, ctx.theme, ctx.branding)}>{display}</div>
    </SelectableWrap>
  );
};

export const HyperlinkView = ({ layer, ctx, renderLayer }: { layer: HyperlinkLayer; ctx: Ctx; renderLayer: RenderLayer }) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedOuter = resolveCommonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const stripped = stripCommonLayoutForInner(
    stripFlowAxesForFlexChild(resolvedOuter, ctx.parentStackDirection),
  );
  const common = commonCss(stripped, ctx.manifest.theme, ctx.theme, ctx.branding);
  const subtreeAbs = layerSubtreeContainsAbsolutePosition(layer);
  const flowWidth =
    resolvedOuter?.position === 'absolute' || ctx.parentStackDirection !== undefined
      ? undefined
      : widthFor(resolvedOuter?.width);

  const linkLayout = resolveHyperlinkLayoutAtWidth(layer, w);
  const isVertical = (linkLayout.direction ?? 'horizontal') === 'vertical';
  const justifyMap: Record<NonNullable<HyperlinkLayer['distribution']>, CSSProperties['justifyContent']> =
    {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
    };
  const alignMap: Record<NonNullable<HyperlinkLayer['align']>, CSSProperties['alignItems']> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  };

  const href = layer.href.trim();
  const label = resolveHyperlinkPreviewLabel(layer.children, {
    manifest: ctx.manifest,
    locale: ctx.locale,
    interpolationContext: ctx.interpolationContext,
  });
  const showDisclaimer = ctx.onHyperlinkPreview != null;
  const openExternal = ctx.interactive && ctx.onExternalLink != null && !showDisclaimer;
  const handleActivate = (e: { stopPropagation: () => void }) => {
    if (showDisclaimer) {
      e.stopPropagation();
      ctx.onHyperlinkPreview?.({ href, label });
      return;
    }
    if (!openExternal || !href) return;
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
    ctx.onExternalLink?.({ layerId: layer.id, href });
  };

  const childCtx: Ctx = {
    ...ctx,
    parentStackDirection: isVertical ? 'vertical' : 'horizontal',
  };
  return (
    <SelectableWrap
      layer={layer}
      ctx={ctx}
      outerStyle={{
        boxSizing: 'border-box',
        minHeight: 0,
        minWidth: 0,
        ...common,
        ...(subtreeAbs ? { overflow: 'visible' } : {}),
        ...(flowWidth !== undefined ? { width: flowWidth } : {}),
      }}
    >
      <div
        role="link"
        tabIndex={showDisclaimer || openExternal ? 0 : undefined}
        onClick={handleActivate}
        onKeyDown={(e) => {
          if (!showDisclaimer && !openExternal) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleActivate(e);
          }
        }}
        style={{
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          gap: resolveLayerGap('hyperlink', linkLayout.gap),
          alignItems: layer.align ? alignMap[layer.align] : undefined,
          justifyContent: layer.distribution ? justifyMap[layer.distribution] : undefined,
          flexWrap: layer.wrap ? 'wrap' : undefined,
          cursor: showDisclaimer || openExternal ? 'pointer' : 'inherit',
        }}
      >
        {layer.children.map((c) => (
          <Fragment key={c.id}>{renderLayer(c, childCtx)}</Fragment>
        ))}
      </div>
    </SelectableWrap>
  );
};
