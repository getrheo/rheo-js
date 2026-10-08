import { Fragment, type CSSProperties } from 'react';
import type { BackButtonLayer, ButtonLayer } from '@getrheo/contracts/layers';
import { resolveLocalizedText } from '@getrheo/contracts/localized';
import { isEligibleConsumedDraft } from '@getrheo/flow-runtime/stateMachine';
import { buttonVariantChromeForTheme, buttonPaletteBorderFallback } from '@getrheo/flow-runtime/buttonVariantChrome';
import { resolveAndInterpolateLocalizedText } from '@getrheo/flow-runtime/interpolateTemplate';
import { resolveThemedBackground } from '@getrheo/flow-runtime';
import { DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX } from '@getrheo/flow-runtime/responsive/breakpoints';
import {
  resolveButtonLayoutAtWidth,
  resolveButtonStyleAtWidth,
  resolveLayerGap,
  resolveTextStyleAtWidth,
} from '@getrheo/flow-runtime/responsive/layerResolve';
import {
  useCheckboxContinueBlocked,
  useScreenCheckboxAck,
  useScreenInputDraft,
  useScreenInputValidity,
} from '@getrheo/flow-ui-state';
import {
  buttonCss,
  buttonChromeLayoutStyle,
  buttonFillOuterStyle,
  buttonLabelCss,
  mergeButtonInlineLabelCss,
  mergeDefinedCss,
  stripFlowAxesForFlexChild,
  textCss,
} from '../LayerRendererStyle';
import { SelectableWrap, type Ctx, type RenderLayer } from '../LayerRendererShared';
import { useMediaPlayback } from '../mediaPlayback';
import { useCarouselControl } from '../carouselControl';

export const buttonBaseStyle = (
  variant: ButtonLayer['variant'],
  theme: 'light' | 'dark',
  options?: { omitLabelTypographyDefaults?: boolean },
): CSSProperties => {
  const chrome = buttonVariantChromeForTheme(variant, theme);
  return {
    paddingTop: 10,
    paddingRight: 14,
    paddingBottom: 10,
    paddingLeft: 14,
    borderRadius: 10,
    ...(options?.omitLabelTypographyDefaults
      ? {}
      : { fontSize: 13, fontWeight: 600, textAlign: 'center' as const }),
    background: chrome.bg,
    color: chrome.color,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: chrome.border,
    cursor: 'pointer',
  };
};

const justifyMap: Record<NonNullable<ButtonLayer['distribution']>, CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

const alignMap: Record<NonNullable<ButtonLayer['align']>, CSSProperties['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

export const ButtonView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: ButtonLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const layout = resolveButtonLayoutAtWidth(layer, w);
  const btnStyle = resolveButtonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  // As a flex child the wrapping shell owns the flow axes; strip authored
  // width/height before the chrome CSS so they don't land on the button element
  // (mirrors RN). The inner `width:100%`/height-fill still comes from buttonChromeLayoutStyle.
  const flexBtnStyle = stripFlowAxesForFlexChild(btnStyle, ctx.parentStackDirection) as typeof btnStyle;
  // When the button fills height, the `SelectableWrap` between the flow shell and
  // the `<button>` must carry the fill bridge so the chain isn't broken.
  const fillOuterStyle = buttonFillOuterStyle(btnStyle);
  const isVertical = layout.direction === 'vertical';
  const draftCtx = useScreenInputDraft();
  const validity = useScreenInputValidity();
  const checkboxAck = useScreenCheckboxAck();
  const checkboxGate = useCheckboxContinueBlocked();
  const mediaPlayback = useMediaPlayback();
  const carouselControl = useCarouselControl();
  const isNone = layer.action.kind === 'none';
  const isContinue = layer.action.kind === 'continue';
  const isGoBack = layer.action.kind === 'go_back_one_screen';
  const canGoBack = ctx.interpolationContext?.canGoBack === true;
  const fallbackId =
    isGoBack && layer.action.kind === 'go_back_one_screen' ? layer.action.fallbackScreenId : undefined;
  const hasGoBackFallback = !!fallbackId;
  const simButtonDisabled =
    ctx.interactive &&
    ((isContinue && !validity.valid) ||
      (isContinue && checkboxGate) ||
      (isGoBack && !canGoBack && !hasGoBackFallback));
  const nativeDisabled =
    isNone || (!ctx.interactive && !ctx.onSelectLayer) || simButtonDisabled;
  const resolvedBg = resolveThemedBackground(
    ctx.manifest.theme,
    ctx.branding,
    ctx.theme,
    btnStyle?.background,
  );
  const borderFallback = buttonPaletteBorderFallback(
    layer.variant,
    ctx.theme,
    btnStyle,
    resolvedBg,
  );
  const hasTextChild = layer.children.some((c) => c.kind === 'text');
  const chromeBase = buttonBaseStyle(layer.variant, ctx.theme, {
    omitLabelTypographyDefaults: hasTextChild,
  });
  const style: CSSProperties = {
    ...mergeDefinedCss(
      {
        ...chromeBase,
        borderWidth: borderFallback.borderWidth,
        borderColor: borderFallback.borderColor ?? chromeBase.borderColor,
      },
      buttonCss(flexBtnStyle, ctx.manifest.theme, ctx.theme, ctx.branding),
    ),
    display: 'flex',
    flexDirection: isVertical ? 'column' : 'row',
    gap: resolveLayerGap(layer.kind, layout.gap),
    alignItems: layer.align ? alignMap[layer.align] : 'center',
    justifyContent: layer.distribution ? justifyMap[layer.distribution] : 'center',
    opacity: simButtonDisabled && ctx.interactive ? 0.5 : undefined,
    ...buttonChromeLayoutStyle(btnStyle, ctx.parentStackDirection),
    boxSizing: 'border-box',
  };
  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={fillOuterStyle}>
      <button
        type="button"
        disabled={nativeDisabled}
        onClick={(e) => {
          if (!ctx.interactive) return;
          e.stopPropagation();
          if (simButtonDisabled) return;
          if (
            layer.action.kind === 'request_os_permission' ||
            layer.action.kind === 'request_app_review'
          ) {
            ctx.onAction?.(layer.action, { layerId: layer.id });
            return;
          }
          ctx.onAction?.(layer.action, { layerId: layer.id });
          if (layer.action.kind === 'play_media') {
            mediaPlayback?.playMedia(layer.action.targetLayerIds);
            return;
          }
          if (layer.action.kind === 'advance_carousel') {
            carouselControl?.advanceCarousel(layer.action.targetLayerId, layer.action.onLast);
            return;
          }
          if (layer.action.kind === 'none') return;
          if (layer.action.kind === 'continue') {
            const primary = draftCtx?.toResponse() ?? { kind: 'cta', action: 'primary' };
            const snap = checkboxAck?.snapshotValues() ?? {};
            if (Object.keys(snap).length > 0) {
              ctx.onRespond?.({ kind: 'screen_commit', primary, checkboxValues: snap });
            } else {
              ctx.onRespond?.(primary);
            }
          } else if (layer.action.kind === 'skip') {
            ctx.onRespond?.({ kind: 'skip' });
          } else if (layer.action.kind === 'end_flow') {
            const drafted = draftCtx?.toResponse() ?? null;
            ctx.onRespond?.(
              drafted && isEligibleConsumedDraft(drafted)
                ? { kind: 'end_flow', consumedDraft: drafted }
                : { kind: 'end_flow' },
            );
          } else if (layer.action.kind === 'go_to_step') {
            ctx.onRespond?.({ kind: 'go_to_screen', screenId: layer.action.screenId });
          } else if (layer.action.kind === 'go_back_one_screen') {
            ctx.onRespond?.({
              kind: 'go_back',
              ...(layer.action.fallbackScreenId ? { fallbackScreenId: layer.action.fallbackScreenId } : {}),
            });
          }
        }}
        style={style}
      >
        {layer.children.map((c) => {
          if (c.kind === 'text') {
            const display = ctx.interpolationContext
              ? resolveAndInterpolateLocalizedText(c.text, {
                  manifest: ctx.manifest,
                  locale: ctx.locale,
                  responses: ctx.interpolationContext.responses,
                  customProperties: ctx.interpolationContext.customProperties,
                })
              : resolveLocalizedText(c.text, ctx.locale);
            const childResolved = resolveTextStyleAtWidth(c.style, c.styleBreakpoints, w);
            const labelFromButton = buttonLabelCss(btnStyle, ctx.manifest.theme, ctx.theme);
            const mergedText = mergeButtonInlineLabelCss(
              { color: chromeBase.color, ...labelFromButton },
              textCss(childResolved, ctx.manifest.theme, ctx.theme, ctx.branding),
            );
            return (
              <SelectableWrap key={c.id} layer={c} ctx={ctx} outerStyle={{}}>
                <div style={mergedText}>{display}</div>
              </SelectableWrap>
            );
          }
          return <Fragment key={c.id}>{renderLayer(c, ctx)}</Fragment>;
        })}
      </button>
    </SelectableWrap>
  );
};

export const BackButtonView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: BackButtonLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const layout = resolveButtonLayoutAtWidth(layer, w);
  const btnStyle = resolveButtonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const flexBtnStyle = stripFlowAxesForFlexChild(btnStyle, ctx.parentStackDirection) as typeof btnStyle;
  const fillOuterStyle = buttonFillOuterStyle(btnStyle);
  const isVertical = layout.direction === 'vertical';
  const canGoBack = ctx.interpolationContext?.canGoBack === true;
  const hasFallback = !!layer.fallbackScreenId;
  const simBackDisabled = ctx.interactive && !canGoBack && !hasFallback;
  const nativeDisabled = (!ctx.interactive && !ctx.onSelectLayer) || simBackDisabled;
  const resolvedBg = resolveThemedBackground(
    ctx.manifest.theme,
    ctx.branding,
    ctx.theme,
    btnStyle?.background,
  );
  const borderFallback = buttonPaletteBorderFallback(
    layer.variant,
    ctx.theme,
    btnStyle,
    resolvedBg,
  );
  const hasTextChild = layer.children.some((c) => c.kind === 'text');
  const base = buttonBaseStyle(layer.variant, ctx.theme, {
    omitLabelTypographyDefaults: hasTextChild,
  });
  const style: CSSProperties = {
    ...mergeDefinedCss(
      {
        ...base,
        borderWidth: borderFallback.borderWidth,
        borderColor: borderFallback.borderColor ?? base.borderColor,
      },
      buttonCss(flexBtnStyle, ctx.manifest.theme, ctx.theme, ctx.branding),
    ),
    display: 'flex',
    flexDirection: isVertical ? 'column' : 'row',
    gap: resolveLayerGap(layer.kind, layout.gap),
    alignItems: layer.align ? alignMap[layer.align] : 'center',
    justifyContent: layer.distribution ? justifyMap[layer.distribution] : 'center',
    opacity: simBackDisabled && ctx.interactive ? 0.5 : undefined,
    ...buttonChromeLayoutStyle(btnStyle, ctx.parentStackDirection),
    boxSizing: 'border-box',
  };
  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={fillOuterStyle}>
      <button
        type="button"
        disabled={nativeDisabled}
        onClick={(e) => {
          if (!ctx.interactive) return;
          e.stopPropagation();
          if (simBackDisabled) return;
          ctx.onRespond?.({
            kind: 'go_back',
            ...(layer.fallbackScreenId ? { fallbackScreenId: layer.fallbackScreenId } : {}),
          });
        }}
        style={style}
      >
        {layer.children.map((c) => (
          <Fragment key={c.id}>{renderLayer(c, ctx)}</Fragment>
        ))}
      </button>
    </SelectableWrap>
  );
};

export const optionPressDefaultsCss = (ctx: Ctx): CSSProperties =>
  ctx.thumbnailChrome
    ? ctx.theme === 'dark'
      ? {
          padding: '10px 12px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          background: 'rgba(255,255,255,0.06)',
          color: '#fafafa',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'default',
          width: '100%',
          boxSizing: 'border-box',
          textAlign: 'left',
        }
      : {
          padding: '10px 12px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          background: 'rgba(255,255,255,0.65)',
          color: '#0a0a0a',
          border: '1px solid rgba(24,24,27,0.12)',
          cursor: 'default',
          width: '100%',
          boxSizing: 'border-box',
          textAlign: 'left',
        }
    : buttonBaseStyle('secondary', ctx.theme);
