/** Authored layer rotation (CSS `rotate`, RN `transform.rotate`, Swift `rotationEffect`). */
export const LAYER_ROTATE_DEG_MIN = -360;
export const LAYER_ROTATE_DEG_MAX = 360;

export const layerRotateCssTransform = (deg: number | undefined): string | undefined =>
  deg === undefined ? undefined : `rotate(${deg}deg)`;

/** React Native `transform` entry for authored rotation. */
export const layerRotateNativeTransform = (
  deg: number | undefined,
): Array<{ rotate: string }> | undefined =>
  deg === undefined ? undefined : [{ rotate: `${deg}deg` }];
