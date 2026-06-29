import { describe, expect, it } from 'vitest';
import {
  layerRotateCssTransform,
  layerRotateNativeTransform,
  LAYER_ROTATE_DEG_MAX,
  LAYER_ROTATE_DEG_MIN,
} from './layerRotate';

describe('layerRotate', () => {
  it('exports degree bounds aligned with CommonStyle schema', () => {
    expect(LAYER_ROTATE_DEG_MIN).toBe(-360);
    expect(LAYER_ROTATE_DEG_MAX).toBe(360);
  });

  it('maps degrees to web and native transforms', () => {
    expect(layerRotateCssTransform(undefined)).toBeUndefined();
    expect(layerRotateCssTransform(45)).toBe('rotate(45deg)');
    expect(layerRotateNativeTransform(-90)).toEqual([{ rotate: '-90deg' }]);
  });
});
