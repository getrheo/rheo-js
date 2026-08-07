import type {
  AddressInputLayer,
  AddressValue,
  DateTimeInputLayer,
  MultipleChoiceLayer,
  NumberStepperLayer,
  PhoneInputLayer,
  ScaleInputLayer,
  SingleChoiceLayer,
  TextInputLayer,
} from '@getrheo/contracts/layers';
import {
  scaleStep,
  scaleValueInRange,
  scaleValueIsOnStep,
  snapScaleValue,
  validateTextInputValue,
} from '@getrheo/flow-runtime';
import { validateDateTimeInputValue } from '@getrheo/flow-runtime/dateTimeInputValidation';
import {
  numberStepperStep,
  numberStepperValueInRange,
  numberStepperValueIsOnStep,
  snapNumberStepperValue,
} from '@getrheo/flow-runtime/numberStepperValidation';
import {
  phoneDraftToE164,
  validatePhoneInputValue,
  type PhoneDraftValue,
} from '@getrheo/flow-runtime/phoneInputValidation';
import { validateAddressInputValue } from '@getrheo/flow-runtime/addressInputValidation';

export type RendererChoiceSelectionModel = {
  selectedOptionIds: string[];
  selectedSet: Set<string>;
  minSelections: number | undefined;
  maxSelections: number | undefined;
  canToggleMore: boolean;
};

export const rendererChoiceSelectionModel = (
  layer: SingleChoiceLayer | MultipleChoiceLayer,
  selectedOptionIds: readonly string[],
): RendererChoiceSelectionModel => {
  const selectedSet = new Set(selectedOptionIds);
  const maxSelections = layer.kind === 'multiple_choice' ? layer.maxSelections : 1;
  return {
    selectedOptionIds: [...selectedSet],
    selectedSet,
    minSelections: layer.kind === 'multiple_choice' ? layer.minSelections : undefined,
    maxSelections,
    canToggleMore: maxSelections === undefined || selectedSet.size < maxSelections,
  };
};

export type RendererTextInputModel = {
  value: string;
  trimmedValue: string;
  required: boolean;
  valid: boolean;
  invalidReason: string | undefined;
  validationMode: 'onBlur' | 'onSubmit' | 'live';
};

export const rendererTextInputModel = (
  layer: TextInputLayer,
  value: string,
): RendererTextInputModel => {
  const result = validateTextInputValue(layer, value);
  return {
    value,
    trimmedValue: value.trim(),
    required: layer.required !== false,
    valid: result.ok,
    invalidReason: result.ok ? undefined : result.reason,
    validationMode: layer.validationMode ?? 'onBlur',
  };
};

/** Whether to show the inline validation message under a text input. */
export const rendererTextInputShouldShowError = (
  model: RendererTextInputModel,
  opts: { touched: boolean; submitAttempted: boolean },
): boolean => {
  if (model.valid || !model.invalidReason) return false;
  if (model.validationMode === 'live') return true;
  if (model.validationMode === 'onSubmit') return opts.submitAttempted;
  return opts.touched || opts.submitAttempted;
};

export type RendererTextInputKeyboardModel = {
  autoCapitalize: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType: 'done' | 'next' | 'go' | 'send' | 'search' | 'default';
  autoCorrect: boolean;
  textContentType:
    | 'none'
    | 'emailAddress'
    | 'telephoneNumber'
    | 'URL'
    | 'password'
    | 'username';
  autoComplete: string | undefined;
  secureTextEntry: boolean;
  multiline: boolean;
  keyboardType: 'default' | 'email-address' | 'phone-pad' | 'url' | 'number-pad';
};

export const rendererTextInputKeyboardModel = (
  layer: TextInputLayer,
): RendererTextInputKeyboardModel => {
  const mode = layer.inputType ?? 'plain';
  const multiline = mode === 'multiline';
  const sensitive = layer.classification === 'sensitive' && !multiline;
  const keyboardType =
    mode === 'email'
      ? 'email-address'
      : mode === 'phone'
        ? 'phone-pad'
        : mode === 'url'
          ? 'url'
          : mode === 'number'
            ? 'number-pad'
            : 'default';
  const defaultAutoCap: RendererTextInputKeyboardModel['autoCapitalize'] =
    mode === 'email' || mode === 'url' || mode === 'phone' || mode === 'number' || sensitive
      ? 'none'
      : 'sentences';
  const textContentType: RendererTextInputKeyboardModel['textContentType'] = sensitive
    ? 'password'
    : mode === 'email'
      ? 'emailAddress'
      : mode === 'phone'
        ? 'telephoneNumber'
        : mode === 'url'
          ? 'URL'
          : 'none';
  const autoComplete = sensitive
    ? 'off'
    : mode === 'email'
      ? 'email'
      : mode === 'phone'
        ? 'tel'
        : mode === 'url'
          ? 'url'
          : undefined;
  return {
    autoCapitalize: layer.autoCapitalize ?? defaultAutoCap,
    returnKeyType: layer.returnKeyType ?? (multiline ? 'default' : 'done'),
    autoCorrect: !(mode === 'email' || mode === 'url' || sensitive),
    textContentType,
    autoComplete,
    secureTextEntry: sensitive,
    multiline,
    keyboardType,
  };
};

export type RendererScaleInputModel = {
  value: number;
  snappedValue: number;
  step: number;
  inRange: boolean;
  onStep: boolean;
};

export const rendererScaleInputModel = (
  layer: ScaleInputLayer,
  value: number,
): RendererScaleInputModel => ({
  value,
  snappedValue: snapScaleValue(layer, value),
  step: scaleStep(layer),
  inRange: scaleValueInRange(layer, value),
  onStep: scaleValueIsOnStep(layer, value),
});

export type RendererDateTimeInputModel = {
  value: string;
  required: boolean;
  valid: boolean;
  invalidReason: string | undefined;
};

export const rendererDateTimeInputModel = (
  layer: DateTimeInputLayer,
  value: string,
): RendererDateTimeInputModel => {
  const result = validateDateTimeInputValue(layer, value);
  return {
    value,
    required: layer.required !== false,
    valid: result.ok,
    invalidReason: result.ok ? undefined : result.reason,
  };
};

export type RendererNumberStepperModel = {
  value: number;
  snappedValue: number;
  step: number;
  inRange: boolean;
  onStep: boolean;
};

export const rendererNumberStepperModel = (
  layer: NumberStepperLayer,
  value: number,
): RendererNumberStepperModel => ({
  value,
  snappedValue: snapNumberStepperValue(layer, value),
  step: numberStepperStep(layer),
  inRange: numberStepperValueInRange(layer, value),
  onStep: numberStepperValueIsOnStep(layer, value),
});

export type RendererPhoneInputModel = {
  countryCode: string;
  nationalNumber: string;
  e164: string;
  required: boolean;
  valid: boolean;
  invalidReason: string | undefined;
};

export const rendererPhoneInputModel = (
  layer: PhoneInputLayer,
  draft: PhoneDraftValue,
): RendererPhoneInputModel => {
  const result = validatePhoneInputValue(layer, draft);
  return {
    countryCode: draft.countryCode,
    nationalNumber: draft.nationalNumber,
    e164: phoneDraftToE164(draft),
    required: layer.required !== false,
    valid: result.ok,
    invalidReason: result.ok ? undefined : result.reason,
  };
};

export type RendererAddressInputModel = {
  value: AddressValue;
  valid: boolean;
  invalidReason: string | undefined;
};

export const rendererAddressInputModel = (
  layer: AddressInputLayer,
  value: AddressValue,
): RendererAddressInputModel => {
  const result = validateAddressInputValue(layer, value);
  return {
    value,
    valid: result.ok,
    invalidReason: result.ok ? undefined : result.reason,
  };
};
