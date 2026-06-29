import type { ScaleInputLayer } from '@getrheo/contracts/layers';

export const scaleStep = (layer: ScaleInputLayer): number => layer.step ?? 1;

/** Snap `raw` to the nearest valid value on the discrete scale. */
export const snapScaleValue = (layer: ScaleInputLayer, raw: number): number => {
  const step = scaleStep(layer);
  const { min, max } = layer;
  const n = Math.round((raw - min) / step);
  const v = min + n * step;
  if (v < min) return min;
  if (v > max) return max;
  return v;
};

export const scaleValueIsOnStep = (layer: ScaleInputLayer, value: number): boolean => {
  const step = scaleStep(layer);
  const n = (value - layer.min) / step;
  return Number.isFinite(n) && Math.abs(n - Math.round(n)) < 1e-6;
};

export const scaleValueInRange = (layer: ScaleInputLayer, value: number): boolean =>
  value >= layer.min && value <= layer.max;
