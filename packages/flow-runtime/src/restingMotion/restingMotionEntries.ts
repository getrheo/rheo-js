import type { RestingMotion, RestingMotionEntry, RestingMotionPreset } from '@getrheo/contracts/layers';


export type RuntimeStyle = Record<string, string | number | undefined>;

export const RESTING_MOTION_DEFAULT_DURATION_MS: Record<RestingMotionPreset, number> = {
  translate: 2400,
  bounce: 2000,
  scale: 2200,
  pulse: 1800,
  rotate: 3200,
};

/** Matches {@link RestingMotionSchema} `durationMs` / `scalePatternDurationMs` bounds. */
export const RESTING_MOTION_SEGMENT_DURATION_MS_MIN = 200;
export const RESTING_MOTION_SEGMENT_DURATION_MS_MAX = 20_000;

export const clampRestingMotionSegmentDurationMs = (ms: number): number =>
  Math.min(
    RESTING_MOTION_SEGMENT_DURATION_MS_MAX,
    Math.max(RESTING_MOTION_SEGMENT_DURATION_MS_MIN, Math.round(ms)),
  );

/** Synthetic id for manifests that only had {@link Layer.restingMotion} (no `restingMotions`). */
export const LEGACY_RESTING_MOTION_ID = '__legacy' as const;

/**
 * Canonical list of motion segments for a layer (array wins; legacy single field becomes one entry).
 */
export const layerRestingMotionEntries = (layer: {
  restingMotion?: RestingMotion;
  restingMotions?: RestingMotionEntry[] | null;
}): RestingMotionEntry[] => {
  const list = layer.restingMotions;
  if (list && list.length > 0) return list;
  if (layer.restingMotion) {
    return [{ ...layer.restingMotion, id: LEGACY_RESTING_MOTION_ID }];
  }
  return [];
};

/** Persist motion segments; clears legacy single field when using the array. */
export const layerWithRestingMotionEntries = <
  L extends { restingMotion?: RestingMotion; restingMotions?: RestingMotionEntry[] },
>(
  layer: L,
  entries: RestingMotionEntry[],
): L => {
  if (entries.length === 0) {
    const next = { ...layer } as Record<string, unknown>;
    delete next.restingMotion;
    delete next.restingMotions;
    return next as L;
  }
  return {
    ...layer,
    restingMotions: entries.map((e) => ({ ...e })),
    restingMotion: undefined,
  };
};

/**
 * Non-loop scale: keep timeline segment and pattern duration identical in saved state.
 * Call when updating motion speed or clip length from the builder.
 */
export const restingMotionSyncScaleNonLoopClipAndPattern = (
  r: RestingMotion,
  ms: number,
): RestingMotion => {
  const v = clampRestingMotionSegmentDurationMs(ms);
  return { ...r, durationMs: v, scalePatternDurationMs: v };
};

/** Align stored fields after paste/import when scale is one-shot. */
export const restingMotionNormalizeScaleNonLoopClip = (r: RestingMotion): RestingMotion => {
  if (r.preset !== 'scale' || r.loop === true) return r;
  const ms = clampRestingMotionSegmentDurationMs(
    r.durationMs ?? r.scalePatternDurationMs ?? RESTING_MOTION_DEFAULT_DURATION_MS.scale,
  );
  return { ...r, durationMs: ms, scalePatternDurationMs: ms };
};

/** Timeline segment length: motion runs from start until start + this value. */
export const restingMotionEffectiveDurationMs = (r: RestingMotion): number =>
  r.durationMs ?? RESTING_MOTION_DEFAULT_DURATION_MS[r.preset];

/** One full pattern cycle (ms), used when looping. */
export const restingMotionCycleDurationMs = (r: RestingMotion): number =>
  r.cycleDurationMs ?? RESTING_MOTION_DEFAULT_DURATION_MS[r.preset];

/**
 * Value for the Motion speed slider: one-shot → clip length ({@link restingMotionEffectiveDurationMs});
 * looping → one repeat ({@link restingMotionCycleDurationMs}).
 */
export const restingMotionMotionSpeedSliderMs = (r: RestingMotion): number =>
  r.loop === true ? restingMotionCycleDurationMs(r) : restingMotionEffectiveDurationMs(r);

export const restingMotionIntensity = (r: RestingMotion): number => {
  'worklet';
  return r.intensity ?? 1;
};

export const restingMotionDelayAfterMountEndMs = (r: RestingMotion): number =>
  r.delayMsAfterMountEnd ?? 0;
