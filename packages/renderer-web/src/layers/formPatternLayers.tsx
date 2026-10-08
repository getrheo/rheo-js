import { Fragment, type ChangeEvent, type CSSProperties } from 'react';
import type {
  AddressInputLayer,
  DateTimeInputLayer,
  NumberStepperLayer,
  PhoneInputLayer,
} from '@getrheo/contracts/layers';
import { resolveLocalizedText } from '@getrheo/contracts/localized';
import {
  filterCountryDialEntries,
} from '@getrheo/flow-runtime/countryDialCodes';
import {
  addressVisibleFields,
  emptyAddressValue,
} from '@getrheo/flow-runtime/addressInputValidation';
import {
  defaultPhoneCountryCode,
  filterPhoneNationalInput,
} from '@getrheo/flow-runtime/phoneInputValidation';
import {
  defaultNumberStepperValue,
  numberStepperParts,
  stepNumberStepperValue,
} from '@getrheo/flow-runtime/numberStepperValidation';
import { dateTimeInputMode } from '@getrheo/flow-runtime/dateTimeInputValidation';
import {
  resolveTextInputFieldChromeStyle,
  resolveTextInputFieldForRender,
  stripTextInputFieldChromeFromStyle,
} from '@getrheo/flow-runtime/textInputStyle';
import { DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX } from '@getrheo/flow-runtime/responsive/breakpoints';
import {
  resolveCommonStyleAtWidth,
  resolveLayerGap,
  resolveTextStyleAtWidth,
} from '@getrheo/flow-runtime/responsive/layerResolve';
import { useScreenInputDraft } from '@getrheo/flow-ui-state';
import {
  commonCss,
  omitUndefinedCssProps,
  stripCommonLayoutForInner,
  stripFlowAxesForFlexChild,
  textCss,
  widthFor,
  layoutHeightFor,
} from '../LayerRendererStyle';
import {
  isStaticLayerPicker,
  SelectableWrap,
  type Ctx,
  type RenderLayer,
} from '../LayerRendererShared';
import { scaleInputTextCss } from './scaleRangeControl';

// ---------------------------------------------------------------------------
// Shared chrome helpers
// ---------------------------------------------------------------------------

const outerColumnStyle = (
  layer: { style?: unknown; styleBreakpoints?: unknown },
  ctx: Ctx,
): CSSProperties => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedOuter = resolveCommonStyleAtWidth(
    (layer as { style?: Parameters<typeof resolveCommonStyleAtWidth>[0] }).style,
    (layer as { styleBreakpoints?: Parameters<typeof resolveCommonStyleAtWidth>[1] }).styleBreakpoints,
    w,
  );
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    ...commonCss(
      stripCommonLayoutForInner(
        stripFlowAxesForFlexChild(
          stripTextInputFieldChromeFromStyle(resolvedOuter),
          ctx.parentStackDirection,
        ),
      ),
      ctx.manifest.theme,
      ctx.theme,
      ctx.branding,
    ),
  };
};

const inputStyle = (chrome: CSSProperties): CSSProperties => ({
  ...chrome,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box' as const,
});

const selectStyle = (chrome: CSSProperties): CSSProperties => ({
  ...chrome,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box' as const,
  cursor: 'pointer',
});

// ---------------------------------------------------------------------------
// DateTimeInputView
// ---------------------------------------------------------------------------

export const DateTimeInputView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: DateTimeInputLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const draftCtx = useScreenInputDraft();
  const mode = dateTimeInputMode(layer);
  const value =
    draftCtx?.draft?.kind === 'date_time' ? draftCtx.draft.value : (layer.defaultValue ?? '');
  const placeholder = layer.placeholder
    ? resolveLocalizedText(layer.placeholder, ctx.locale)
    : '';
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedOuter = resolveCommonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const field = resolveTextInputFieldForRender(layer, ctx.manifest.theme, ctx.theme);
  const fieldCss = scaleInputTextCss(field);
  const inputType =
    mode === 'date' ? 'date' : mode === 'time' ? 'time' : 'datetime-local';
  const fieldChrome = resolveTextInputFieldChromeStyle(resolvedOuter, ctx.theme);
  const fieldChromeCss = commonCss(fieldChrome, ctx.manifest.theme, ctx.theme, ctx.branding);

  const decoration = layer.children?.map((c) => (
    <Fragment key={c.id}>{renderLayer(c, ctx)}</Fragment>
  ));

  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={outerColumnStyle(layer, ctx)}>
      {decoration}
      <input
        type={inputType}
        placeholder={placeholder}
        disabled={!ctx.interactive && !ctx.onSelectLayer}
        readOnly={!ctx.interactive}
        value={value}
        min={layer.min}
        max={layer.max}
        onClick={(e) => {
          if (ctx.interactive) e.stopPropagation();
        }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const next = e.target.value;
          draftCtx?.setDraft(next === '' ? null : { kind: 'date_time', value: next });
        }}
        style={inputStyle({ ...fieldChromeCss, ...fieldCss })}
      />
    </SelectableWrap>
  );
};

// ---------------------------------------------------------------------------
// NumberStepperView
// ---------------------------------------------------------------------------

export const NumberStepperView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: NumberStepperLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const draftCtx = useScreenInputDraft();
  const value =
    draftCtx?.draft?.kind === 'number_stepper'
      ? draftCtx.draft.value
      : defaultNumberStepperValue(layer);
  const atMin = value <= layer.min;
  const atMax = value >= layer.max;
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedOuter = resolveCommonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const gap = resolveLayerGap(layer.kind, layer.gap);
  const axis = layer.direction ?? 'horizontal';
  const alignMap: Record<
    NonNullable<NumberStepperLayer['align']>,
    CSSProperties['alignItems']
  > = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  };
  const justifyMap: Record<
    NonNullable<NumberStepperLayer['distribution']>,
    CSSProperties['justifyContent']
  > = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
  };
  const { decrement, increment, value: valueLayer } = numberStepperParts(layer);
  const unitLabel = valueLayer?.unitLabel
    ? resolveLocalizedText(valueLayer.unitLabel, ctx.locale)
    : undefined;
  const valueResolved = valueLayer
    ? resolveTextStyleAtWidth(valueLayer.style, valueLayer.styleBreakpoints, w)
    : undefined;
  const valueCss = valueResolved
    ? textCss(valueResolved, ctx.manifest.theme, ctx.theme, ctx.branding)
    : undefined;
  const defaultButtonBg = ctx.theme === 'dark' ? '#27272a' : '#e4e4e7';

  const renderButton = (
    button: typeof decrement,
    direction: 1 | -1,
    disabled: boolean,
    ariaLabel: string,
  ) => {
    if (!button) return null;
    const btnResolved = resolveCommonStyleAtWidth(button.style, button.styleBreakpoints, w);
    const btnChrome = commonCss(
      stripFlowAxesForFlexChild(btnResolved, axis),
      ctx.manifest.theme,
      ctx.theme,
      ctx.branding,
    );
    const hasContentChildren = (button.children?.length ?? 0) > 0;
    return (
      <SelectableWrap
        key={button.id}
        layer={button}
        ctx={ctx}
        outerStyle={omitUndefinedCssProps({
          flexShrink: 0,
          width: widthFor(btnResolved?.width) ?? 36,
          height: layoutHeightFor(btnResolved?.height) ?? 36,
        })}
      >
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={(!ctx.interactive && !ctx.onSelectLayer) || disabled}
          style={omitUndefinedCssProps({
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            border: 'none',
            cursor: ctx.interactive ? 'pointer' : 'default',
            background: defaultButtonBg,
            opacity: disabled ? 0.4 : 1,
            ...btnChrome,
          })}
          onClick={(e) => {
            if (!ctx.interactive) return;
            e.stopPropagation();
            draftCtx?.setDraft({
              kind: 'number_stepper',
              value: stepNumberStepperValue(layer, value, direction),
            });
          }}
        >
          {hasContentChildren
            ? button.children!.map((c) => (
                <Fragment key={c.id}>{renderLayer(c, ctx)}</Fragment>
              ))
            : direction < 0
              ? '-'
              : '+'}
        </button>
      </SelectableWrap>
    );
  };

  return (
    <SelectableWrap
      layer={layer}
      ctx={ctx}
      outerStyle={omitUndefinedCssProps({
        display: 'flex',
        flexDirection: axis === 'vertical' ? 'column' : 'row',
        alignItems: layer.align ? alignMap[layer.align] : 'center',
        justifyContent: layer.distribution ? justifyMap[layer.distribution] : undefined,
        gap,
        ...commonCss(
          stripCommonLayoutForInner(
            stripFlowAxesForFlexChild(resolvedOuter, ctx.parentStackDirection),
          ),
          ctx.manifest.theme,
          ctx.theme,
          ctx.branding,
        ),
      })}
    >
      {renderButton(decrement, -1, atMin, 'Decrease')}
      {valueLayer ? (
        <SelectableWrap
          key={valueLayer.id}
          layer={valueLayer}
          ctx={ctx}
          outerStyle={omitUndefinedCssProps({
            flex: 1,
            minWidth: axis === 'horizontal' ? 0 : undefined,
            minHeight: axis === 'vertical' ? 0 : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...commonCss(
              stripCommonLayoutForInner(
                stripFlowAxesForFlexChild(
                  resolveCommonStyleAtWidth(
                    valueLayer.style,
                    valueLayer.styleBreakpoints,
                    w,
                  ),
                  axis,
                ),
              ),
              ctx.manifest.theme,
              ctx.theme,
              ctx.branding,
            ),
          })}
        >
          <span
            style={{
              ...valueCss,
              textAlign: 'center',
              width: '100%',
            }}
          >
            {value}
            {unitLabel ? ` ${unitLabel}` : ''}
          </span>
        </SelectableWrap>
      ) : (
        <span style={{ flex: 1, textAlign: 'center' }}>{value}</span>
      )}
      {renderButton(increment, 1, atMax, 'Increase')}
    </SelectableWrap>
  );
};

// ---------------------------------------------------------------------------
// PhoneInputView
// ---------------------------------------------------------------------------

export const PhoneInputView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: PhoneInputLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const draftCtx = useScreenInputDraft();
  const entries = filterCountryDialEntries(layer.allowedCountryCodes);
  const defaultCode = defaultPhoneCountryCode(layer);
  const countryCode =
    draftCtx?.draft?.kind === 'phone'
      ? draftCtx.draft.countryCode
      : defaultCode;
  const nationalNumber =
    draftCtx?.draft?.kind === 'phone' ? draftCtx.draft.nationalNumber : '';
  const placeholder = layer.placeholder
    ? resolveLocalizedText(layer.placeholder, ctx.locale)
    : '';
  const field = resolveTextInputFieldForRender(layer, ctx.manifest.theme, ctx.theme);
  const fieldCss = scaleInputTextCss(field);
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedOuter = resolveCommonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const fieldChrome = resolveTextInputFieldChromeStyle(resolvedOuter, ctx.theme);
  const fieldChromeCss = commonCss(fieldChrome, ctx.manifest.theme, ctx.theme, ctx.branding);
  const decoration = layer.children?.map((c) => (
    <Fragment key={c.id}>{renderLayer(c, ctx)}</Fragment>
  ));

  const handleCountryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (!ctx.interactive) return;
    const next = e.target.value;
    draftCtx?.setDraft({ kind: 'phone', countryCode: next, nationalNumber });
  };

  const handleNationalChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!ctx.interactive) return;
    const next = filterPhoneNationalInput(e.target.value);
    draftCtx?.setDraft(
      next === '' && !nationalNumber
        ? null
        : { kind: 'phone', countryCode, nationalNumber: next },
    );
  };

  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={outerColumnStyle(layer, ctx)}>
      {decoration}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'stretch',
        }}
      >
        <select
          disabled={!ctx.interactive && !ctx.onSelectLayer}
          value={countryCode}
          onClick={(e) => {
            if (ctx.interactive) e.stopPropagation();
          }}
          onChange={handleCountryChange}
          style={{
            ...selectStyle(fieldChromeCss),
            width: undefined,
            flexShrink: 0,
            maxWidth: 120,
            ...fieldCss,
          }}
        >
          {entries.map((e) => (
            <option key={e.code} value={e.code}>
              {e.code} +{e.dial}
            </option>
          ))}
        </select>
        <input
          type="tel"
          placeholder={placeholder}
          disabled={!ctx.interactive && !ctx.onSelectLayer}
          readOnly={!ctx.interactive}
          value={nationalNumber}
          onClick={(e) => {
            if (ctx.interactive) e.stopPropagation();
          }}
          onChange={handleNationalChange}
          style={{ ...inputStyle(fieldChromeCss), flex: 1, ...fieldCss }}
        />
      </div>
    </SelectableWrap>
  );
};

// ---------------------------------------------------------------------------
// AddressInputView
// ---------------------------------------------------------------------------

const ADDRESS_PLACEHOLDERS: Record<
  Parameters<typeof addressVisibleFields>[0] extends { showLine2?: boolean } ? string : string,
  string
> = {
  line1: 'Street address',
  line2: 'Apartment, suite, etc.',
  city: 'City',
  region: 'State / region',
  postalCode: 'Postal code',
  country: 'Country code (e.g. US)',
};

export const AddressInputView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: AddressInputLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const draftCtx = useScreenInputDraft();
  const fields = addressVisibleFields(layer);
  const value =
    draftCtx?.draft?.kind === 'address' ? draftCtx.draft.value : emptyAddressValue(layer);
  const gap = layer.gap ?? 8;
  const field = resolveTextInputFieldForRender(layer, ctx.manifest.theme, ctx.theme);
  const fieldCss = scaleInputTextCss(field);
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedOuter = resolveCommonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const fieldChrome = resolveTextInputFieldChromeStyle(resolvedOuter, ctx.theme);
  const fieldChromeCss = commonCss(fieldChrome, ctx.manifest.theme, ctx.theme, ctx.branding);
  const decoration = layer.children?.map((c) => (
    <Fragment key={c.id}>{renderLayer(c, ctx)}</Fragment>
  ));

  const pointerNone = isStaticLayerPicker(ctx);

  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={outerColumnStyle(layer, ctx)}>
      {decoration}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap,
          pointerEvents: pointerNone ? 'none' : undefined,
        }}
      >
        {fields.map((f) => {
          const placeholderOverride = layer.placeholders?.[f]
            ? resolveLocalizedText(layer.placeholders[f]!, ctx.locale)
            : undefined;
          const ph = placeholderOverride ?? ADDRESS_PLACEHOLDERS[f] ?? f;
          const fieldValue = value[f] ?? '';
          return (
            <input
              key={f}
              type={f === 'country' ? 'text' : 'text'}
              placeholder={ph}
              disabled={!ctx.interactive && !ctx.onSelectLayer}
              readOnly={!ctx.interactive}
              value={fieldValue}
              maxLength={f === 'country' ? 2 : undefined}
              onClick={(e) => {
                if (ctx.interactive) e.stopPropagation();
              }}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                if (!ctx.interactive) return;
                const next = { ...value, [f]: e.target.value };
                draftCtx?.setDraft({ kind: 'address', value: next });
              }}
              style={inputStyle({ ...fieldChromeCss, ...fieldCss })}
            />
          );
        })}
      </div>
    </SelectableWrap>
  );
};
