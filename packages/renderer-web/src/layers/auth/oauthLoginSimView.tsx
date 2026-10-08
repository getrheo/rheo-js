import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { Fragment, useState } from 'react';
import * as IoIcons from 'react-icons/io5';
import type {
  CommonStyle,
  CommonStyleBreakpoints,
  OAuthLoginLayer,
  OAuthLoginPreset,
  OAuthProviderCustomLayer,
} from '@getrheo/contracts/layers';
import {
  oauthLoginManifestProviderFromLayer,
  oauthPresetEffectiveLabel,
} from '@getrheo/contracts/layers';
import { resolveLocalizedText } from '@getrheo/contracts/localized';
import {
  rendererOAuthLoginAlignAxis,
  rendererOAuthPresetBrandModel,
  rendererOAuthRowInteractionModel,
} from '@getrheo/renderer-core';
import { resolveAndInterpolateLocalizedText } from '@getrheo/flow-runtime/interpolateTemplate';
import { DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX } from '@getrheo/flow-runtime/responsive/breakpoints';
import {
  resolveAuthLayoutAtWidth,
  resolveButtonLayoutAtWidth,
  resolveButtonStyleAtWidth,
  resolveCommonStyleAtWidth,
  resolveLayerGap,
  resolveTextStyleAtWidth,
} from '@getrheo/flow-runtime/responsive/layerResolve';
import {
  buttonCss,
  buttonChromeLayoutStyle,
  buttonLabelCss,
  commonCss,
  layoutHeightFor,
  margin,
  mergeButtonInlineLabelCss,
  mergeDefinedCss,
  omitUndefinedCssProps,
  padding,
  stripCommonLayoutForInner,
  stripFlowAxesForFlexChild,
  textCss,
  widthFor,
} from '../../LayerRendererStyle.js';
import {
  isStaticLayerPicker,
  SelectableWrap,
  type Ctx,
  type RenderLayer,
} from '../../LayerRendererShared.js';
import { buttonBaseStyle } from '../actionLayers.js';

const oauthPresetBrandSimStyle = (
  preset: OAuthLoginPreset,
  theme: 'light' | 'dark',
): CSSProperties => {
  const brand = rendererOAuthPresetBrandModel(preset, theme);
  return omitUndefinedCssProps({
    backgroundColor: brand.backgroundColor,
    color: brand.labelColor,
    border:
      brand.borderWidth > 0 ? `${brand.borderWidth}px solid ${brand.borderColor}` : undefined,
    fontFamily: brand.fontFamily,
    fontWeight: brand.fontWeight,
    fontSize: brand.fontSize,
    lineHeight: brand.lineHeight,
    boxShadow: brand.webBoxShadow,
  });
};

const OAUTH_PRESET_SIM_IO: Record<OAuthLoginPreset, keyof typeof IoIcons> = {
  google: 'IoLogoGoogle',
  github: 'IoLogoGithub',
  apple: 'IoLogoApple',
};

const oauthPresetGlyphSim = (preset: OAuthLoginPreset, theme: 'light' | 'dark'): ReactNode => {
  const exportName = OAUTH_PRESET_SIM_IO[preset];
  const Cmp = (IoIcons as Record<string, ComponentType<{ size?: string | number; color?: string; style?: CSSProperties }>>)[exportName];
  const color = rendererOAuthPresetBrandModel(preset, theme).iconColor;
  return Cmp ? (
    <Cmp size={22} color={color} style={{ flexShrink: 0 }} aria-hidden />
  ) : null;
};

const oauthAlignToCss = (
  axis: ReturnType<typeof rendererOAuthLoginAlignAxis>,
): CSSProperties['alignItems'] => {
  if (axis === 'center') return 'center';
  if (axis === 'end') return 'flex-end';
  if (axis === 'stretch') return 'stretch';
  return 'flex-start';
};

export const OAuthLoginSimView = ({ layer, ctx, renderLayer }: { layer: OAuthLoginLayer; ctx: Ctx; renderLayer: RenderLayer }) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const authLayout = resolveAuthLayoutAtWidth(layer, w);
  const gap = resolveLayerGap(layer.kind, authLayout.gap);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const alignAxis = rendererOAuthLoginAlignAxis(authLayout.align);
  return (
    <SelectableWrap
      layer={layer}
      ctx={ctx}
      outerStyle={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: oauthAlignToCss(alignAxis),
        gap,
        ...commonCss(
          stripCommonLayoutForInner(
            stripFlowAxesForFlexChild(layer.style, ctx.parentStackDirection),
          ),
          ctx.manifest.theme,
          ctx.theme,
          ctx.branding,
        ),
      }}
    >
      {layer.children.map((ch) => {
        const rowKey = ch.id;
        const provPayload = oauthLoginManifestProviderFromLayer(ch);
        const { disabled } = rendererOAuthRowInteractionModel({
          interactive: ctx.interactive,
          pendingRowKey: busyRow,
          rowKey,
          staticPicker: isStaticLayerPicker(ctx),
        });
        if (ch.variant === 'preset') {
          const resolvedChrome = resolveCommonStyleAtWidth(
            ch.style as CommonStyle | undefined,
            ch.styleBreakpoints as CommonStyleBreakpoints | undefined,
            w,
          );
          const brand = oauthPresetBrandSimStyle(ch.provider, ctx.theme);
          const rw = widthFor(resolvedChrome?.width);
          return (
            <SelectableWrap
              key={rowKey}
              layer={ch}
              ctx={ctx}
              outerStyle={omitUndefinedCssProps({
                width: authLayout.align === 'stretch' ? '100%' : rw,
                alignSelf: authLayout.align === 'stretch' ? 'stretch' : undefined,
                ...margin(resolvedChrome?.margin),
              })}
            >
              <button
                type="button"
                disabled={disabled}
                style={omitUndefinedCssProps({
                  ...brand,
                  cursor: ctx.interactive ? 'pointer' : 'default',
                  borderRadius: resolvedChrome?.radius ?? 10,
                  ...padding(resolvedChrome?.padding ?? { t: 10, r: 12, b: 10, l: 12 }),
                  opacity: disabled && ctx.interactive ? 0.55 : undefined,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                })}
                onClick={(e) => {
                  if (!ctx.interactive) return;
                  e.stopPropagation();
                  setBusyRow(rowKey);
                  ctx.onRespond?.({
                    kind: 'oauth_login_resolve',
                    layerId: layer.id,
                    provider: provPayload,
                    success: true,
                  });
                  setBusyRow(null);
                }}
              >
                {oauthPresetGlyphSim(ch.provider, ctx.theme)}
                <span>
                  {ctx.interpolationContext
                    ? resolveAndInterpolateLocalizedText(
                        oauthPresetEffectiveLabel(ch.provider, ch.label),
                        {
                          manifest: ctx.manifest,
                          locale: ctx.locale,
                          responses: ctx.interpolationContext.responses,
                          customProperties: ctx.interpolationContext.customProperties,
                        },
                      )
                    : resolveLocalizedText(
                        oauthPresetEffectiveLabel(ch.provider, ch.label),
                        ctx.locale,
                      )}
                </span>
              </button>
            </SelectableWrap>
          );
        }
        const custom = ch as OAuthProviderCustomLayer;
        const layout = resolveButtonLayoutAtWidth(custom, w);
        const btnStyle = resolveButtonStyleAtWidth(custom.style, custom.styleBreakpoints, w);
        const flexBtnStyle = stripFlowAxesForFlexChild(btnStyle, ctx.parentStackDirection) as typeof btnStyle;
        const isVertical = layout.direction === 'vertical';
        const justifyMap: Record<NonNullable<OAuthProviderCustomLayer['distribution']>, CSSProperties['justifyContent']> = {
          start: 'flex-start',
          center: 'center',
          end: 'flex-end',
          between: 'space-between',
          around: 'space-around',
        };
        const alignMap: Record<NonNullable<OAuthProviderCustomLayer['align']>, CSSProperties['alignItems']> = {
          start: 'flex-start',
          center: 'center',
          end: 'flex-end',
          stretch: 'stretch',
        };
        const hasTextChild = custom.children.some((c) => c.kind === 'text');
        const chromeBase = buttonBaseStyle(custom.buttonVariant, ctx.theme, {
          omitLabelTypographyDefaults: hasTextChild,
        });
        const btnChrome: CSSProperties = {
          ...mergeDefinedCss(
            chromeBase,
            buttonCss(flexBtnStyle, ctx.manifest.theme, ctx.theme, ctx.branding),
          ),
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          gap: resolveLayerGap(custom.kind, layout.gap),
          alignItems: custom.align ? alignMap[custom.align] : 'center',
          justifyContent: custom.distribution ? justifyMap[custom.distribution] : 'center',
          cursor: ctx.interactive ? 'pointer' : 'default',
          opacity: disabled && ctx.interactive ? 0.55 : undefined,
          ...buttonChromeLayoutStyle(btnStyle),
          boxSizing: 'border-box',
        };
        return (
          <SelectableWrap
            key={rowKey}
            layer={custom}
            ctx={ctx}
            outerStyle={{
              ...(btnStyle?.position !== 'absolute'
                ? {
                    width: widthFor(btnStyle?.width) ?? '100%',
                    height: layoutHeightFor(btnStyle?.height),
                  }
                : {}),
              alignSelf: 'stretch',
            }}
          >
            <button
              type="button"
              disabled={disabled}
              style={btnChrome}
              onClick={(e) => {
                if (!ctx.interactive) return;
                e.stopPropagation();
                setBusyRow(rowKey);
                ctx.onRespond?.({
                  kind: 'oauth_login_resolve',
                  layerId: layer.id,
                  provider: provPayload,
                  success: true,
                });
                setBusyRow(null);
              }}
            >
              {custom.children.map((c) => {
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
      })}
    </SelectableWrap>
  );
};

