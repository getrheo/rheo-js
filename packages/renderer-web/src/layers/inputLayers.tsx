import { Fragment, type ChangeEvent, type CSSProperties, type MouseEvent as ReactMouseEvent, useMemo, useRef, useState } from 'react';
import type { CheckboxLayer, ScaleInputLayer, TextInputLayer, WheelPickerLayer } from '@getrheo/contracts/layers';
import { resolveLocalizedText } from '@getrheo/contracts/localized';
import { dropShadowToWebStyle, filterDigitsOnlyInput } from '@getrheo/flow-runtime';
import { resolveScaleInputSliderForRender } from '@getrheo/flow-runtime/scaleInputStyle';
import {
  resolveTextInputFieldChromeStyle,
  resolveTextInputFieldForRender,
  stripTextInputFieldChromeFromStyle,
} from '@getrheo/flow-runtime/textInputStyle';
import { snapScaleValue } from '@getrheo/flow-runtime/scaleValidation';
import { buildWheelPickerItems } from '@getrheo/flow-runtime/wheelPickerItems';
import { resolveWheelPickerForRender } from '@getrheo/flow-runtime/wheelPickerStyle';
import { DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX } from '@getrheo/flow-runtime/responsive/breakpoints';
import { resolveCommonStyleAtWidth } from '@getrheo/flow-runtime/responsive/layerResolve';
import {
  rendererFormErrorChrome,
  resolveCheckboxGlyphForRender,
  rendererTextInputKeyboardModel,
  rendererTextInputModel,
  rendererTextInputShouldShowError,
} from '@getrheo/renderer-core';
import { useScreenCheckboxAck, useScreenInputDraft } from '@getrheo/flow-ui-state';
import {
  commonCss,
  layoutHeightFor,
  omitUndefinedCssProps,
  stripCommonLayoutForInner,
  stripFlowAxesForFlexChild,
  widthFor,
} from '../LayerRendererStyle';
import {
  isStaticLayerPicker,
  SelectableWrap,
  type Ctx,
  type RenderLayer,
} from '../LayerRendererShared';
import { ScaleRangeControl, scaleInputTextCss } from './scaleRangeControl';

export const CheckboxView = ({ layer, ctx }: { layer: CheckboxLayer; ctx: Ctx }) => {
  const ack = useScreenCheckboxAck();
  const p = ctx.inspectorStylePreview;
  const previewChecked =
    p?.kind === 'checkbox' && p.layerId === layer.id ? p.variant === 'checked' : null;
  const draftChecked = ack?.checked[layer.fieldKey] ?? false;
  const checked = previewChecked !== null ? previewChecked : draftChecked;
  const resolved = resolveCheckboxGlyphForRender(
    ctx.manifest.theme,
    ctx.theme,
    layer.uncheckedStyle,
    layer.checkedStyle,
    checked,
    ctx.branding,
  );
  const glyphCss: CSSProperties = omitUndefinedCssProps({
    width: resolved.sizePx,
    height: resolved.sizePx,
    borderRadius: resolved.radiusPx,
    background: resolved.background,
    opacity: resolved.opacity,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
    borderStyle: resolved.borderWidth !== undefined && resolved.borderWidth > 0 ? 'solid' : undefined,
    borderWidth: resolved.borderWidth,
    borderColor: resolved.borderColor,
    ...dropShadowToWebStyle(resolved.shadow, ctx.manifest.theme, ctx.theme),
  });
  const markSize = Math.max(10, Math.round(resolved.sizePx * 0.58));
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedOuter = resolveCommonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const stripped = stripCommonLayoutForInner(
    stripFlowAxesForFlexChild(resolvedOuter, ctx.parentStackDirection),
  );
  const common = commonCss(stripped, ctx.manifest.theme, ctx.theme, ctx.branding);
  const isAbsolute = resolvedOuter?.position === 'absolute';
  const inFlex = ctx.parentStackDirection !== undefined;
  const directWidth = isAbsolute || inFlex ? undefined : widthFor(resolvedOuter?.width);
  const directHeight =
    isAbsolute || inFlex ? undefined : layoutHeightFor(resolvedOuter?.height);
  return (
    <SelectableWrap
      layer={layer}
      ctx={ctx}
      outerStyle={{
        ...common,
        ...(directWidth !== undefined ? { width: directWidth } : {}),
        ...(directHeight !== undefined ? { height: directHeight } : {}),
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={!ctx.interactive && !ctx.onSelectLayer}
        onClick={(e) => {
          if (!ctx.interactive) return;
          e.stopPropagation();
          ack?.toggle(layer.fieldKey);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          margin: 0,
          border: 'none',
          background: 'transparent',
          cursor: ctx.interactive ? 'pointer' : 'default',
          lineHeight: 0,
        }}
      >
        <span style={glyphCss}>
          {checked ? (
            <span
              style={{
                color: resolved.checkColor ?? (ctx.theme === 'dark' ? '#18181b' : '#ffffff'),
                fontSize: markSize,
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              ✓
            </span>
          ) : null}
        </span>
      </button>
    </SelectableWrap>
  );
};

export const TextInputView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: TextInputLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const draftCtx = useScreenInputDraft();
  const [touched, setTouched] = useState(false);
  const value = draftCtx?.draft?.kind === 'text' ? draftCtx.draft.value : '';
  const placeholder = layer.placeholder
    ? resolveLocalizedText(layer.placeholder, ctx.locale)
    : '';
  const helperText = layer.helperText
    ? resolveLocalizedText(layer.helperText, ctx.locale)
    : '';
  const keyboard = rendererTextInputKeyboardModel(layer);
  const model = rendererTextInputModel(layer, value);
  const showError = rendererTextInputShouldShowError(model, {
    touched,
    submitAttempted: false,
  });
  const errorChrome = rendererFormErrorChrome(ctx.theme);
  const mode = layer.inputType ?? 'plain';
  const isMultiline = keyboard.multiline;
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedOuter = resolveCommonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const field = resolveTextInputFieldForRender(layer, ctx.manifest.theme, ctx.theme);
  const fieldCss = scaleInputTextCss(field);
  const fieldChrome = resolveTextInputFieldChromeStyle(resolvedOuter, ctx.theme);
  const fieldChromeCss = commonCss(
    fieldChrome,
    ctx.manifest.theme,
    ctx.theme,
    ctx.branding,
  );
  const inputStyle: CSSProperties = {
    ...fieldChromeCss,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: isMultiline ? 96 : undefined,
    resize: isMultiline ? 'vertical' : undefined,
    ...(showError ? { borderColor: errorChrome.fieldBorderColor } : {}),
    ...fieldCss,
  };
  const common = {
    placeholder,
    disabled: !ctx.interactive && !ctx.onSelectLayer,
    readOnly: !ctx.interactive,
    maxLength: layer.maxLength,
    value,
    autoCapitalize: keyboard.autoCapitalize,
    enterKeyHint:
      keyboard.returnKeyType === 'default' ? undefined : keyboard.returnKeyType,
    autoCorrect: keyboard.autoCorrect ? 'on' : 'off',
    onClick: (e: ReactMouseEvent) => {
      if (ctx.interactive) e.stopPropagation();
    },
    onBlur: () => {
      if (ctx.interactive) setTouched(true);
    },
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next =
        mode === 'number' ? filterDigitsOnlyInput(e.target.value) : e.target.value;
      draftCtx?.setDraft(next === '' ? null : { kind: 'text', value: next });
    },
    style: inputStyle,
  };
  const decoration = layer.children?.map((c) => (
    <Fragment key={c.id}>{renderLayer(c, ctx)}</Fragment>
  ));
  const statusCopy = showError ? model.invalidReason : helperText || undefined;
  const statusNode = statusCopy ? (
    <div
      role={showError ? 'alert' : undefined}
      style={{
        fontSize: 12,
        lineHeight: 1.35,
        color: showError ? errorChrome.textColor : ctx.theme === 'dark' ? '#a1a1aa' : '#71717a',
      }}
    >
      {statusCopy}
    </div>
  ) : null;
  const outerStyle: CSSProperties = {
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

  if (isMultiline) {
    return (
      <SelectableWrap layer={layer} ctx={ctx} outerStyle={outerStyle}>
        {decoration}
        <textarea
          {...common}
          rows={4}
          autoComplete={keyboard.autoComplete}
          aria-invalid={showError || undefined}
        />
        {statusNode}
      </SelectableWrap>
    );
  }
  const htmlType =
    keyboard.secureTextEntry
      ? 'password'
      : mode === 'email'
        ? 'email'
        : mode === 'phone'
          ? 'tel'
          : mode === 'url'
            ? 'url'
            : 'text';
  const numericInputProps =
    mode === 'number'
      ? { inputMode: 'numeric' as const, pattern: '[0-9]*' }
      : {};
  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={outerStyle}>
      {decoration}
      <input
        type={htmlType}
        autoComplete={keyboard.autoComplete}
        aria-invalid={showError || undefined}
        {...numericInputProps}
        {...common}
      />
      {statusNode}
    </SelectableWrap>
  );
};

export const ScaleInputView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: ScaleInputLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const draftCtx = useScreenInputDraft();
  const step = layer.step ?? 1;
  const value =
    draftCtx?.draft?.kind === 'scale'
      ? draftCtx.draft.value
      : snapScaleValue(layer, layer.defaultValue ?? layer.min);
  const minLab = layer.minLabel ? resolveLocalizedText(layer.minLabel, ctx.locale) : String(layer.min);
  const maxLab = layer.maxLabel ? resolveLocalizedText(layer.maxLabel, ctx.locale) : String(layer.max);
  const slider = resolveScaleInputSliderForRender(layer, ctx.manifest.theme, ctx.theme);
  const labelCss = scaleInputTextCss(slider.label);
  const valueCss = scaleInputTextCss(slider.value);
  const decoration = layer.children?.map((c) => (
    <Fragment key={c.id}>{renderLayer(c, ctx)}</Fragment>
  ));
  return (
    <SelectableWrap
      layer={layer}
      ctx={ctx}
      outerStyle={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
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
      {decoration}
      {slider.showLabels ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            ...labelCss,
          }}
        >
          <span>{minLab}</span>
          <span>{maxLab}</span>
        </div>
      ) : null}
      <ScaleRangeControl
        value={value}
        min={layer.min}
        max={layer.max}
        step={step}
        disabled={!ctx.interactive && !ctx.onSelectLayer}
        slider={slider}
        pointerEventsNone={isStaticLayerPicker(ctx)}
        onClick={(e) => {
          if (ctx.interactive) e.stopPropagation();
        }}
        onChange={(n) => {
          draftCtx?.setDraft({ kind: 'scale', value: snapScaleValue(layer, n) });
        }}
      />
      {slider.showValue ? (
        <div style={valueCss}>{value}</div>
      ) : null}
    </SelectableWrap>
  );
};

const wheelOpacityForDistance = (distance: number): number => {
  if (distance <= 0) return 1;
  if (distance === 1) return 0.55;
  if (distance === 2) return 0.3;
  return 0.15;
};

export const WheelPickerView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: WheelPickerLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const draftCtx = useScreenInputDraft();
  const items = useMemo(
    () => buildWheelPickerItems(layer, ctx.locale),
    [layer, ctx.locale],
  );
  const selectedId =
    draftCtx?.draft?.kind === 'wheel'
      ? draftCtx.draft.value
      : items[Math.floor(items.length / 2)]?.id ?? null;
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  );
  const [centeredIndex, setCenteredIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : Math.floor(items.length / 2),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const placeholder = layer.placeholder
    ? resolveLocalizedText(layer.placeholder, ctx.locale)
    : 'Select';
  const wheel = resolveWheelPickerForRender(layer, ctx.manifest.theme, ctx.theme, placeholder);
  const edgePadding = ((wheel.visibleItemCount - 1) / 2) * wheel.itemHeightPx;
  const wheelHeight = wheel.itemHeightPx * wheel.visibleItemCount;
  const itemCss = (selected: boolean): CSSProperties => ({
    fontFamily: selected ? wheel.selectedItem.fontFamily : wheel.item.fontFamily,
    fontSize: selected ? wheel.selectedItem.fontSizePx : wheel.item.fontSizePx,
    fontWeight: selected ? wheel.selectedItem.fontWeight : wheel.item.fontWeight,
    color: selected ? wheel.selectedItem.color : wheel.item.color,
    opacity: selected ? wheel.selectedItem.opacity : wheel.item.opacity,
    textAlign: 'center',
  });
  const decoration = layer.children?.map((child) => (
    <Fragment key={child.id}>{renderLayer(child, ctx)}</Fragment>
  ));

  const syncSelectionFromScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.max(
      0,
      Math.min(items.length - 1, Math.round(el.scrollTop / wheel.itemHeightPx)),
    );
    setCenteredIndex(index);
    const item = items[index];
    if (item && ctx.interactive) draftCtx?.setDraft({ kind: 'wheel', value: item.id });
  };

  return (
    <SelectableWrap
      layer={layer}
      ctx={ctx}
      outerStyle={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
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
      {decoration}
      <div style={{ position: 'relative', height: wheelHeight, width: '100%' }}>
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: edgePadding,
            height: wheel.itemHeightPx,
            borderRadius: 10,
            background: wheel.selectionBackgroundColor,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        <div
          ref={scrollRef}
          onScroll={syncSelectionFromScroll}
          style={{
            height: wheelHeight,
            overflowY: 'auto',
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
            pointerEvents: isStaticLayerPicker(ctx) ? 'none' : undefined,
          }}
        >
          <div style={{ paddingTop: edgePadding, paddingBottom: edgePadding }}>
            {items.map((item, index) => {
              const distance = Math.abs(index - centeredIndex);
              const selected = index === centeredIndex;
              const label = selected && !selectedId ? placeholder : item.label;
              return (
                <div
                  key={item.id}
                  style={{
                    height: wheel.itemHeightPx,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    scrollSnapAlign: 'center',
                    opacity: wheelOpacityForDistance(distance),
                    ...itemCss(selected),
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SelectableWrap>
  );
};
