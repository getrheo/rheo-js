import type {
  MultipleChoiceLayer,
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
