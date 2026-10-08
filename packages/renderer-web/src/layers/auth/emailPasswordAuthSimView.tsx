import type { ChangeEvent, CSSProperties, ReactNode } from 'react';
import { Fragment, useCallback, useState } from 'react';
import type {
  EmailPasswordAuthLayer,
  EmailPasswordFieldLayer,
  EmailPasswordSlot,
  EmailPasswordSubmitLayer,
} from '@getrheo/contracts/layers';


import { resolveLocalizedText } from '@getrheo/contracts/localized';
import {
  rendererEmailPasswordAuthModel,
  rendererEmailPasswordFieldInputType,
  rendererEmailPasswordSimInputColors,
  rendererFormErrorChrome,
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
  mergeButtonInlineLabelCss,
  mergeDefinedCss,
  stripCommonLayoutForInner,
  stripFlowAxesForFlexChild,
  textCss,
  widthFor,
} from '../../LayerRendererStyle.js';
import {
  SelectableWrap,
  type Ctx,
  type RenderLayer,
} from '../../LayerRendererShared.js';
import { buttonBaseStyle } from '../actionLayers.js';
export const EmailPasswordAuthSimView = ({ layer, ctx, renderLayer }: { layer: EmailPasswordAuthLayer; ctx: Ctx; renderLayer: RenderLayer }) => {
  const [values, setValues] = useState({ email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<EmailPasswordSlot, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<EmailPasswordSlot, boolean>>>({});
  const setSlot = useCallback(
    (slot: EmailPasswordSlot) => (e: ChangeEvent<HTMLInputElement>) => {
      const t = e.target.value;
      setError(null);
      setFieldErrors((prev) => {
        if (!prev[slot]) return prev;
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      setValues((prev) => ({ ...prev, [slot]: t }));
    },
    [],
  );
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedOuter = resolveCommonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const authLayout = resolveAuthLayoutAtWidth(layer, w);
  const gap = resolveLayerGap(layer.kind, authLayout.gap);
  const simInputColors = rendererEmailPasswordSimInputColors(ctx.theme);
  const errorChrome = rendererFormErrorChrome(ctx.theme);
  const authAlignMap: Record<
    NonNullable<EmailPasswordAuthLayer['align']>,
    CSSProperties['alignItems']
  > = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  };

  const inputStyleBase: CSSProperties = {
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 13,
    background: simInputColors.background,
    color: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const submit = (): void => {
    setError(null);
    const model = rendererEmailPasswordAuthModel(layer, values);
    setTouched({ email: true, password: true, confirm: true });
    if (!model.canSubmit) {
      setFieldErrors(model.fieldErrors);
      // Field-level messages already cover client validation; keep banner for host errors only.
      return;
    }
    setFieldErrors({});
    ctx.onRespond?.({
      kind: 'email_password_auth_resolve',
      layerId: layer.id,
      fieldKey: layer.fieldKey,
      mode: model.mode,
      email: values.email.trim(),
      password: values.password,
      confirmPassword: model.mode === 'sign_up' ? values.confirm : undefined,
      success: true,
    });
  };

  const renderFieldSim = (ch: EmailPasswordFieldLayer): ReactNode => {
    const ph = ch.placeholder ? resolveLocalizedText(ch.placeholder, ctx.locale) : '';
    const v = values[ch.slot];
    const inputType = rendererEmailPasswordFieldInputType(ch.slot);
    const resolvedField = resolveCommonStyleAtWidth(ch.style, ch.styleBreakpoints, w);
    const slotError = touched[ch.slot] ? fieldErrors[ch.slot] : undefined;
    const autoComplete =
      ch.slot === 'email'
        ? 'email'
        : ch.slot === 'password'
          ? layer.mode === 'sign_up'
            ? 'new-password'
            : 'current-password'
          : 'new-password';

    return (
      <SelectableWrap
        key={ch.id}
        layer={ch}
        ctx={ctx}
        outerStyle={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: resolvedField?.position === 'absolute' ? undefined : '100%',
          alignSelf: authLayout.align === 'stretch' ? 'stretch' : undefined,
          ...commonCss(
            stripCommonLayoutForInner(
              stripFlowAxesForFlexChild(ch.style, ctx.parentStackDirection),
            ),
            ctx.manifest.theme,
            ctx.theme,
            ctx.branding,
          ),
        }}
      >
        {ch.children?.map((c) => (
          <Fragment key={c.id}>{renderLayer(c, ctx)}</Fragment>
        ))}
        <input
          type={inputType}
          autoComplete={autoComplete}
          autoCapitalize={ch.slot === 'email' ? 'none' : undefined}
          spellCheck={ch.slot === 'email' ? false : undefined}
          placeholder={ph}
          disabled={!ctx.interactive && !ctx.onSelectLayer}
          readOnly={!ctx.interactive}
          value={v}
          aria-invalid={slotError ? true : undefined}
          onClick={(e) => {
            if (ctx.interactive) e.stopPropagation();
          }}
          onBlur={() => setTouched((prev) => ({ ...prev, [ch.slot]: true }))}
          onChange={setSlot(ch.slot)}
          style={{
            ...inputStyleBase,
            border: `1px solid ${slotError ? errorChrome.fieldBorderColor : simInputColors.border}`,
          }}
        />
        {slotError ? (
          <div role="alert" style={{ fontSize: 12, lineHeight: 1.35, color: errorChrome.textColor }}>
            {slotError}
          </div>
        ) : null}
      </SelectableWrap>
    );
  };

  const renderSubmitSim = (ch: EmailPasswordSubmitLayer): ReactNode => {
    const layout = resolveButtonLayoutAtWidth(ch, w);
    const btnStyle = resolveButtonStyleAtWidth(ch.style, ch.styleBreakpoints, w);
    const flexBtnStyle = stripFlowAxesForFlexChild(btnStyle, ctx.parentStackDirection) as typeof btnStyle;
    const isVertical = layout.direction === 'vertical';
    const justifyMap: Record<
      NonNullable<EmailPasswordSubmitLayer['distribution']>,
      CSSProperties['justifyContent']
    > = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
    };
    const alignMap: Record<
      NonNullable<EmailPasswordSubmitLayer['align']>,
      CSSProperties['alignItems']
    > = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch',
    };
    const hasTextChild = ch.children.some((c) => c.kind === 'text');
    const chromeBase = buttonBaseStyle(ch.buttonVariant, ctx.theme, {
      omitLabelTypographyDefaults: hasTextChild,
    });
    const btnChrome: CSSProperties = {
      ...mergeDefinedCss(
        chromeBase,
        buttonCss(flexBtnStyle, ctx.manifest.theme, ctx.theme, ctx.branding),
      ),
      display: 'flex',
      flexDirection: isVertical ? 'column' : 'row',
      gap: resolveLayerGap(ch.kind, layout.gap),
      alignItems: ch.align ? alignMap[ch.align] : 'center',
      justifyContent: ch.distribution ? justifyMap[ch.distribution] : 'center',
      cursor: ctx.interactive ? 'pointer' : 'default',
      ...buttonChromeLayoutStyle(btnStyle),
      boxSizing: 'border-box',
    };

    return (
      <SelectableWrap
        key={ch.id}
        layer={ch}
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
        <button type="button" style={btnChrome}
          onClick={(e) => {
            if (!ctx.interactive) return;
            e.stopPropagation();
            submit();
          }}
        >
          {ch.children.map((c) => {
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

  const errorBannerStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.35,
    fontWeight: 500,
    color: errorChrome.textColor,
    background: errorChrome.backgroundColor,
    border: `1px solid ${errorChrome.borderColor}`,
  };

  const fieldChildren = layer.children.filter(
    (ch): ch is EmailPasswordFieldLayer => ch.kind === 'email_password_field',
  );
  const submitChildren = layer.children.filter(
    (ch): ch is EmailPasswordSubmitLayer => ch.kind === 'email_password_submit',
  );

  return (
    <SelectableWrap
      layer={layer}
      ctx={ctx}
      outerStyle={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        alignItems: authLayout.align ? authAlignMap[authLayout.align] : 'stretch',
        width: resolvedOuter?.position === 'absolute' ? undefined : '100%',
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
      {fieldChildren.map((ch) => renderFieldSim(ch))}
      {error ? (
        <div role="alert" style={errorBannerStyle}>
          {error}
        </div>
      ) : null}
      {submitChildren.map((ch) => renderSubmitSim(ch))}
    </SelectableWrap>
  );
};
