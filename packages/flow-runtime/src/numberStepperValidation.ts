import type {
  NumberStepperButtonLayer,
  NumberStepperLayer,
  NumberStepperValueLayer,
} from '@getrheo/contracts/layers';

export const numberStepperStep = (layer: NumberStepperLayer): number => layer.step ?? 1;

/** Snap `raw` to the nearest valid stepper value. */
export const snapNumberStepperValue = (layer: NumberStepperLayer, raw: number): number => {
  const step = numberStepperStep(layer);
  const { min, max } = layer;
  const n = Math.round((raw - min) / step);
  const v = min + n * step;
  if (v < min) return min;
  if (v > max) return max;
  // Avoid float drift for fractional steps.
  const decimals = String(step).includes('.') ? String(step).split('.')[1]!.length : 0;
  return decimals > 0 ? Number(v.toFixed(decimals)) : v;
};

export const numberStepperValueIsOnStep = (layer: NumberStepperLayer, value: number): boolean => {
  const step = numberStepperStep(layer);
  const n = (value - layer.min) / step;
  return Number.isFinite(n) && Math.abs(n - Math.round(n)) < 1e-6;
};

export const numberStepperValueInRange = (layer: NumberStepperLayer, value: number): boolean =>
  value >= layer.min && value <= layer.max;

export const defaultNumberStepperValue = (layer: NumberStepperLayer): number =>
  snapNumberStepperValue(layer, layer.defaultValue ?? layer.min);

export const stepNumberStepperValue = (
  layer: NumberStepperLayer,
  current: number,
  direction: 1 | -1,
): number => {
  const step = numberStepperStep(layer);
  return snapNumberStepperValue(layer, current + direction * step);
};

/** Resolve structural children of a stacked number stepper (order may vary). */
export const numberStepperParts = (
  layer: NumberStepperLayer,
): {
  decrement: NumberStepperButtonLayer | undefined;
  increment: NumberStepperButtonLayer | undefined;
  value: NumberStepperValueLayer | undefined;
} => {
  let decrement: NumberStepperButtonLayer | undefined;
  let increment: NumberStepperButtonLayer | undefined;
  let value: NumberStepperValueLayer | undefined;
  for (const child of layer.children) {
    if (child.kind === 'number_stepper_button') {
      if (child.role === 'decrement') decrement = child;
      else increment = child;
    } else if (child.kind === 'number_stepper_value') {
      value = child;
    }
  }
  return { decrement, increment, value };
};
