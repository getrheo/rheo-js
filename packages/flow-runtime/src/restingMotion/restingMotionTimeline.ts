import type { RestingMotion } from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';

import {
  effectiveDelayMs,
  screenAnimationsDurationMs,
  screenLoaderTimelineExtentMs,
} from '../animations.js';
import { walkScreen } from '../layers.js';
import {
  layerRestingMotionEntries,
  restingMotionDelayAfterMountEndMs,
  restingMotionEffectiveDurationMs,
} from './restingMotionEntries.js';

/**
 * Latest end time (ms from screen mount) of mount/stagger clips for a layer.
 * `0` when none — layer motion may run immediately.
 */
export const layerMountClipsEndMs = (screen: Screen, layerId: string): number => {
  const clips =
    screen.animations?.filter(
      (c) => c.targetLayerId === layerId && (c.trigger === 'mount' || c.trigger === 'stagger'),
    ) ?? [];
  let maxEnd = 0;
  for (const c of clips) {
    maxEnd = Math.max(maxEnd, effectiveDelayMs(c, screen) + c.durationMs);
  }
  return maxEnd;
};

/**
 * Absolute time (ms from screen mount) when layer motion should begin: after all
 * mount/stagger clips end, plus optional author delay.
 */
export const layerRestingMotionStartMs = (
  screen: Screen,
  layerId: string,
  cfg: RestingMotion,
): number =>
  cfg.timelineStartMs !== undefined
    ? cfg.timelineStartMs
    : layerMountClipsEndMs(screen, layerId) + restingMotionDelayAfterMountEndMs(cfg);

/** Latest end (ms) of any layer motion segment (start + segment duration) — for timeline rulers. */
export const screenRestingTimelineExtentMs = (screen: Screen): number => {
  let max = 0;
  walkScreen(screen, (l) => {
    for (const r of layerRestingMotionEntries(l)) {
      const start = layerRestingMotionStartMs(screen, l.id, r);
      max = Math.max(max, start + restingMotionEffectiveDurationMs(r));
    }
  });
  return max;
};

/**
 * Upper bound for editor scrub time (ms from screen mount). Mount/unmount clips
 * alone cap at {@link screenAnimationsDurationMs}; layer motion may start and
 * end later, so the scrub clock must allow times up to this value or motion
 * never becomes "allowed" in the preview.
 */
export const motionTimelineScrubClampMs = (screen: Screen): number =>
  Math.max(
    screenAnimationsDurationMs(screen),
    screenRestingTimelineExtentMs(screen),
    screenLoaderTimelineExtentMs(screen),
  );

/** Default ruler span when the screen has no timed motion content yet. */
export const DEFAULT_WORKBENCH_TIMELINE_MS = 10_000;

/**
 * Animation workbench ruler/scrub length (ms). Grows with clips, resting motion,
 * and timed loader segments; never capped. Uses
 * {@link DEFAULT_WORKBENCH_TIMELINE_MS} only when nothing is scheduled yet.
 */
export const workbenchTimelineTotalMs = (screen: Screen): number => {
  const extent = motionTimelineScrubClampMs(screen);
  return extent > 0 ? extent : DEFAULT_WORKBENCH_TIMELINE_MS;
};

export const layerRestingMotionEndMs = (
  screen: Screen,
  layerId: string,
  cfg: RestingMotion,
): number => layerRestingMotionStartMs(screen, layerId, cfg) + restingMotionEffectiveDurationMs(cfg);

/** Pure gate for tests and web scrub (no React): inside the motion segment [start, end). */
export const restingMotionAllowedAtTime = (
  screen: Screen,
  layerId: string,
  tMs: number,
  cfg: RestingMotion,
): boolean => {
  const start = layerRestingMotionStartMs(screen, layerId, cfg);
  const end = start + restingMotionEffectiveDurationMs(cfg);
  return tMs >= start && tMs < end;
};

/** Elapsed ms inside the motion segment, or null if outside [start, end). */
export const restingMotionLocalElapsedMs = (
  screen: Screen,
  layerId: string,
  cfg: RestingMotion,
  tMs: number,
): number | null => {
  if (!restingMotionAllowedAtTime(screen, layerId, tMs, cfg)) return null;
  return tMs - layerRestingMotionStartMs(screen, layerId, cfg);
};
