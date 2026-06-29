import type { RestingMotion } from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';
import {
  RESTING_MOTION_DEFAULT_DURATION_MS,
  restingMotionCycleDurationMs,
  restingMotionEffectiveDurationMs,
  restingMotionIntensity,
  type RuntimeStyle,
} from './restingMotionEntries.js';
import {
  restingMotionLocalElapsedMs,
} from './restingMotionTimeline.js';

/** Peak lift (px) matched to legacy `14 * intensity` when {@link RestingMotion.bounceAmplitudePx} is unset. */
export const RESTING_MOTION_BOUNCE_BASE_PX = 14;

export const restingMotionBounceAmplitudePx = (r: RestingMotion): number =>
  r.bounceAmplitudePx ?? RESTING_MOTION_BOUNCE_BASE_PX * restingMotionIntensity(r);

/** Single bounce arc: 0 → peak → 0 over phase ∈ [0, 1]. Negative Y is upward. */
export const bouncePhaseToTranslateY = (ph: number, amplitudePx: number): number =>
  -amplitudePx * Math.sin(Math.PI * ph);

/** Default scale magnitude (%), used when {@link RestingMotion.scalePercent} / legacy fields omitted. */
export const RESTING_MOTION_DEFAULT_SCALE_UP_PERCENT = 8;
export const RESTING_MOTION_DEFAULT_SCALE_DOWN_PERCENT = 0;
export const RESTING_MOTION_DEFAULT_SCALE_PERCENT = RESTING_MOTION_DEFAULT_SCALE_UP_PERCENT;

/** Default peak Y (% of layer box) when translate percent peaks omitted (no legacy px). */
export const RESTING_MOTION_DEFAULT_TRANSLATE_PEAK_Y_PERCENT = 6;
/** Default legacy peak Y in px when only deprecated {@link RestingMotion.translateRangePx} applies. */
export const RESTING_MOTION_DEFAULT_TRANSLATE_PEAK_Y_PX = 6;
/** @deprecated Use {@link RESTING_MOTION_DEFAULT_TRANSLATE_PEAK_Y_PX}. */
export const RESTING_MOTION_DEFAULT_TRANSLATE_RANGE_PX = RESTING_MOTION_DEFAULT_TRANSLATE_PEAK_Y_PX;
/** Default peak rotation (°) from rest when {@link RestingMotion.rotateMaxDeg} is omitted. */
export const RESTING_MOTION_DEFAULT_ROTATE_DEG = 5;
export const RESTING_MOTION_PULSE_DIP_BASE = 0.38;

/** Scale preset: ms for one rest → peak → rest cycle (authoring + native + web fallback). */
export const restingMotionScalePatternDurationMs = (r: RestingMotion): number => {
  const def = RESTING_MOTION_DEFAULT_DURATION_MS.scale;
  if (r.preset !== 'scale') return def;
  if (r.loop !== true) {
    return r.durationMs ?? r.scalePatternDurationMs ?? r.cycleDurationMs ?? def;
  }
  return r.scalePatternDurationMs ?? r.cycleDurationMs ?? def;
};

/**
 * Phase 0..1 for the current motion pattern. Non-loop: one full pattern stretched over segment.
 * Loop: pattern repeats every cycle duration within the segment.
 */
export const restingMotionPhase01 = (cfg: RestingMotion, localMs: number): number => {
  const segment = restingMotionEffectiveDurationMs(cfg);
  const cycle = restingMotionCycleDurationMs(cfg);
  if (segment <= 0) return 0;

  if (cfg.preset === 'scale') {
    const pattern = restingMotionScalePatternDurationMs(cfg);
    if (pattern <= 0) return 0;
    if (cfg.loop === true) {
      const u = ((localMs % pattern) + pattern) % pattern;
      return u / pattern;
    }
    return Math.min(1, Math.max(0, localMs / pattern));
  }

  if (cfg.loop === true && cycle > 0) {
    const u = ((localMs % cycle) + cycle) % cycle;
    return u / cycle;
  }
  return Math.min(1, Math.max(0, localMs / segment));
};

export const restingMotionScaleDirection = (r: RestingMotion): 'up' | 'down' => {
  'worklet';
  if (r.scaleDirection === 'down') return 'down';
  if (r.scaleDirection === 'up') return 'up';
  const down = r.scaleDownPercent ?? 0;
  const up = r.scaleUpPercent ?? 0;
  if (down > 0 && up === 0) return 'down';
  return 'up';
};

export const restingMotionScalePercentResolved = (r: RestingMotion): number => {
  'worklet';
  if (r.scalePercent !== undefined) return r.scalePercent;
  if (restingMotionScaleDirection(r) === 'down') {
    return r.scaleDownPercent !== undefined
      ? r.scaleDownPercent
      : (r.scaleUpPercent ?? RESTING_MOTION_DEFAULT_SCALE_DOWN_PERCENT);
  }
  return r.scaleUpPercent ?? RESTING_MOTION_DEFAULT_SCALE_UP_PERCENT;
};

export const restingMotionScaleAmountFraction = (r: RestingMotion): number => {
  'worklet';
  return (restingMotionScalePercentResolved(r) / 100) * restingMotionIntensity(r);
};

/** Scale preset: return to rest after the peak (default). If false, ramp to peak and hold (per cycle when looping). */
export const restingMotionScaleSpringBack = (r: RestingMotion): boolean => {
  'worklet';
  return r.scaleSpringBack !== false;
};

/** @deprecated Prefer {@link restingMotionScaleAmountFraction} / {@link restingMotionScalePeakMultiplier}. */
export const restingMotionScaleUpFraction = (r: RestingMotion): number =>
  restingMotionScaleDirection(r) === 'up' ? restingMotionScaleAmountFraction(r) : 0;

/** @deprecated Prefer {@link restingMotionScaleAmountFraction} / {@link restingMotionScalePeakMultiplier}. */
export const restingMotionScaleDownFraction = (r: RestingMotion): number =>
  restingMotionScaleDirection(r) === 'down' ? restingMotionScaleAmountFraction(r) : 0;

/** Peak scale multiplier (1±amount) for CSS vars and authoring; independent of {@link restingMotionScaleSpringBack}. */
export const restingMotionScalePeakMultiplier = (cfg: RestingMotion): number => {
  'worklet';
  const amt = restingMotionScaleAmountFraction(cfg);
  const dir = restingMotionScaleDirection(cfg);
  return dir === 'up' ? 1 + amt : 1 - amt;
};

/**
 * One scale cycle over ph ∈ [0,1]: rest (1) → peak (1±amount) → rest when spring back is on;
 * linear rest → peak when off (matches rotate ramp semantics).
 */
export const restingMotionScaleAtPhase = (cfg: RestingMotion, ph: number): number => {
  'worklet';
  const peak = restingMotionScalePeakMultiplier(cfg);
  const p = Math.min(1, Math.max(0, ph));
  if (!restingMotionScaleSpringBack(cfg)) {
    return 1 + (peak - 1) * p;
  }
  if (p < 0.5) {
    const t = p * 2;
    return 1 + (peak - 1) * t;
  }
  const t = (p - 0.5) * 2;
  return peak + (1 - peak) * t;
};

const legacyTranslatePxToDisplayPercent = (px: number): number =>
  Math.max(-200, Math.min(200, Math.round((px / 80) * 200)));

type TranslatePeakBase =
  | { unit: 'percent'; x: number; y: number }
  | { unit: 'px'; x: number; y: number };

const restingMotionTranslateBasePeak = (r: RestingMotion): TranslatePeakBase => {
  'worklet';
  const hasPercent =
    r.translatePeakXPercent !== undefined || r.translatePeakYPercent !== undefined;
  const hasPx = r.translatePeakXPx !== undefined || r.translatePeakYPx !== undefined;
  const hasLegacyRange = r.translateRangePx !== undefined;

  if (hasPercent) {
    return {
      unit: 'percent',
      x: r.translatePeakXPercent ?? 0,
      y: r.translatePeakYPercent ?? 0,
    };
  }
  if (hasPx || hasLegacyRange) {
    if (hasPx) {
      return {
        unit: 'px',
        x: r.translatePeakXPx ?? 0,
        y: r.translatePeakYPx ?? 0,
      };
    }
    return { unit: 'px', x: 0, y: r.translateRangePx ?? 0 };
  }
  return { unit: 'percent', x: 0, y: RESTING_MOTION_DEFAULT_TRANSLATE_PEAK_Y_PERCENT };
};

/**
 * Authoring translate peaks in % of the layer box (−200–200) for the editor. Maps legacy px fields
 * to a comparable % for display (old ±80 px range → full ±200% scale).
 */
export const restingMotionTranslateAuthoringPeakPercent = (r: RestingMotion): { x: number; y: number } => {
  const base = restingMotionTranslateBasePeak(r);
  if (base.unit === 'percent') return { x: base.x, y: base.y };
  return {
    x: legacyTranslatePxToDisplayPercent(base.x),
    y: legacyTranslatePxToDisplayPercent(base.y),
  };
};

/** @deprecated Use {@link restingMotionTranslateAuthoringPeakPercent} or {@link restingMotionTranslatePeakResolved}. */
export const restingMotionTranslateAuthoringPeakPx = (r: RestingMotion): { x: number; y: number } => {
  const base = restingMotionTranslateBasePeak(r);
  if (base.unit === 'px') return { x: base.x, y: base.y };
  return { x: 0, y: 0 };
};

/** Resolved peak translation for transform: % of layer box, or legacy px. After intensity; clamped. */
export const restingMotionTranslatePeakResolved = (
  r: RestingMotion,
): { unit: 'percent' | 'px'; x: number; y: number } => {
  'worklet';
  const base = restingMotionTranslateBasePeak(r);
  const i = restingMotionIntensity(r);
  if (base.unit === 'percent') {
    let x = base.x * i;
    let y = base.y * i;
    x = Math.max(-200, Math.min(200, x));
    y = Math.max(-200, Math.min(200, y));
    return { unit: 'percent', x, y };
  }
  let x = base.x * i;
  let y = base.y * i;
  x = Math.max(-200, Math.min(200, x));
  y = Math.max(-200, Math.min(200, y));
  return { unit: 'px', x, y };
};

/** @deprecated Use {@link restingMotionTranslatePeakResolved}. */
export const restingMotionTranslatePeakPx = (r: RestingMotion): { x: number; y: number } => {
  const r2 = restingMotionTranslatePeakResolved(r);
  return { x: r2.x, y: r2.y };
};

/** Translate preset: spring back to origin after the peak (default). */
export const restingMotionTranslateSpringBack = (r: RestingMotion): boolean => {
  'worklet';
  return r.translateSpringBack !== false;
};

/** Resolved peak rotation (°), clamped to [0, 360]. Intensity scales the authored angle. */
export const restingMotionRotateMaxDeg = (r: RestingMotion): number => {
  'worklet';
  const raw = (r.rotateMaxDeg ?? RESTING_MOTION_DEFAULT_ROTATE_DEG) * restingMotionIntensity(r);
  return Math.max(0, Math.min(360, raw));
};

/** Rotate preset: oscillate back to 0° after the peak (default). If false, ramp to peak and hold (per cycle when looping). */
export const restingMotionRotateSpringBack = (r: RestingMotion): boolean => {
  'worklet';
  return r.rotateSpringBack !== false;
};

/** Rotate preset: authored spin direction (default clockwise). */
export const restingMotionRotateDirection = (
  r: RestingMotion,
): 'clockwise' | 'counterclockwise' => {
  'worklet';
  return r.rotateDirection === 'counterclockwise' ? 'counterclockwise' : 'clockwise';
};

/** +1 for clockwise, −1 for counter-clockwise (anti-clockwise). */
export const restingMotionRotateSign = (r: RestingMotion): 1 | -1 => {
  'worklet';
  return restingMotionRotateDirection(r) === 'counterclockwise' ? -1 : 1;
};

export const restingMotionPulseMinOpacity = (r: RestingMotion): number => {
  'worklet';
  if (r.pulseMinOpacity !== undefined) {
    return Math.max(0, Math.min(1, r.pulseMinOpacity));
  }
  return Math.max(
    0,
    Math.min(1, 1 - RESTING_MOTION_PULSE_DIP_BASE * restingMotionIntensity(r)),
  );
};

/** Sample motion at phase 0..1 (same geometry as web keyframes / native worklets). */
export const restingMotionSampleStyle = (cfg: RestingMotion, ph: number): RuntimeStyle => {
  switch (cfg.preset) {
    case 'translate': {
      const peak = restingMotionTranslatePeakResolved(cfg);
      const env = restingMotionTranslateSpringBack(cfg) ? Math.sin(ph * Math.PI) : ph;
      let tx = env * peak.x;
      let ty = env * peak.y;
      if (Math.abs(tx) < 1e-6) tx = 0;
      if (Math.abs(ty) < 1e-6) ty = 0;
      if (peak.unit === 'percent') {
        return { transform: `translate(${tx}%, ${ty}%)`, willChange: 'transform' };
      }
      return { transform: `translate(${tx}px, ${ty}px)`, willChange: 'transform' };
    }
    case 'bounce': {
      const y = bouncePhaseToTranslateY(ph, restingMotionBounceAmplitudePx(cfg));
      return { transform: `translateY(${y}px)`, willChange: 'transform' };
    }
    case 'scale': {
      const sc = restingMotionScaleAtPhase(cfg, ph);
      return { transform: `scale(${sc})`, willChange: 'transform' };
    }
    case 'pulse': {
      const omin = restingMotionPulseMinOpacity(cfg);
      const dip = 1 - omin;
      const op = ph <= 0.5 ? 1 - ph * 2 * dip : 1 - (1 - ph) * 2 * dip;
      return { opacity: op, willChange: 'opacity' };
    }
    case 'rotate': {
      const peakDeg = restingMotionRotateMaxDeg(cfg);
      let deg =
        restingMotionRotateSign(cfg) *
        (restingMotionRotateSpringBack(cfg)
          ? Math.sin(ph * Math.PI) * peakDeg
          : ph * peakDeg);
      // sin(π) is not exactly 0 in JS — snap so endpoints read as 0° and match keyframes.
      if (Math.abs(deg) < 1e-6) deg = 0;
      return { transform: `rotate(${deg}deg)`, willChange: 'transform' };
    }
    default:
      return {};
  }
};

/** Driven by timeline clock (editor / scrub). Returns null outside the motion segment. */
export const restingMotionStyleAtTime = (
  screen: Screen,
  layerId: string,
  cfg: RestingMotion,
  tMs: number,
): RuntimeStyle | null => {
  const local = restingMotionLocalElapsedMs(screen, layerId, cfg, tMs);
  if (local === null) return null;
  const ph = restingMotionPhase01(cfg, local);
  return restingMotionSampleStyle(cfg, ph);
};

/**
 * Injected once in web sim DOM. Intensity scales via `--ob-rm-i` on the
 * animated element (default 1).
 */
export const RESTING_MOTION_KEYFRAMES_CSS = `
@keyframes ob-rm-translate {
  0%, 100% { transform: translate(0, 0); }
  50% {
    transform: translate(var(--ob-rm-translate-peak-x, 0%), var(--ob-rm-translate-peak-y, 6%));
  }
}
@keyframes ob-rm-translate-ramp {
  0% { transform: translate(0, 0); }
  100% {
    transform: translate(var(--ob-rm-translate-peak-x, 0%), var(--ob-rm-translate-peak-y, 6%));
  }
}
@keyframes ob-rm-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(calc(-1 * var(--ob-rm-bounce-px, 14px))); }
}
@keyframes ob-rm-scale {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(var(--ob-rm-scale-peak, 1.08)); }
}
@keyframes ob-rm-scale-ramp {
  0% { transform: scale(1); }
  100% { transform: scale(var(--ob-rm-scale-peak, 1.08)); }
}
@keyframes ob-rm-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: var(--ob-rm-pulse-min, 0.62); }
}
@keyframes ob-rm-rotate {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(var(--ob-rm-rotate-peak, 5deg)); }
}
@keyframes ob-rm-rotate-ramp {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(var(--ob-rm-rotate-peak, 5deg)); }
}
`.trim();

const restingMotionWebAnimationName = (config: RestingMotion): string => {
  if (config.preset === 'rotate' && !restingMotionRotateSpringBack(config)) {
    return 'ob-rm-rotate-ramp';
  }
  if (config.preset === 'translate' && !restingMotionTranslateSpringBack(config)) {
    return 'ob-rm-translate-ramp';
  }
  if (config.preset === 'scale' && !restingMotionScaleSpringBack(config)) {
    return 'ob-rm-scale-ramp';
  }
  return `ob-rm-${config.preset}`;
};

/**
 * Fallback when no motion clock is available (e.g. static export). Prefer
 * {@link restingMotionStyleAtTime} in the editor where the timeline drives sampling.
 */
export const restingMotionWebStyle = (config: RestingMotion): RuntimeStyle | null => {
  const duration = restingMotionEffectiveDurationMs(config);
  const intensity = restingMotionIntensity(config);
  const name = restingMotionWebAnimationName(config);
  const oneCycleMs =
    config.preset === 'scale'
      ? restingMotionScalePatternDurationMs(config)
      : config.loop === true
        ? restingMotionCycleDurationMs(config)
        : duration;
  const iter = config.loop === true ? 'infinite' : '1 forwards';
  const base = {
    ['--ob-rm-i']: String(intensity),
    animation: `${name} ${oneCycleMs}ms ease-in-out ${iter}`,
    willChange: config.preset === 'pulse' ? 'opacity' : 'transform',
  } as RuntimeStyle;
  if (config.preset === 'bounce') {
    return {
      ...base,
      ['--ob-rm-bounce-px']: `${restingMotionBounceAmplitudePx(config)}px`,
    } as RuntimeStyle;
  }
  if (config.preset === 'scale') {
    return {
      ...base,
      ['--ob-rm-scale-peak']: String(restingMotionScalePeakMultiplier(config)),
    } as RuntimeStyle;
  }
  if (config.preset === 'translate') {
    const peak = restingMotionTranslatePeakResolved(config);
    const sx = peak.unit === 'percent' ? `${peak.x}%` : `${peak.x}px`;
    const sy = peak.unit === 'percent' ? `${peak.y}%` : `${peak.y}px`;
    return {
      ...base,
      ['--ob-rm-translate-peak-x']: sx,
      ['--ob-rm-translate-peak-y']: sy,
    } as RuntimeStyle;
  }
  if (config.preset === 'rotate') {
    const signedPeak = restingMotionRotateSign(config) * restingMotionRotateMaxDeg(config);
    return {
      ...base,
      ['--ob-rm-rotate-peak']: `${signedPeak}deg`,
    } as RuntimeStyle;
  }
  if (config.preset === 'pulse') {
    return {
      ...base,
      ['--ob-rm-pulse-min']: String(restingMotionPulseMinOpacity(config)),
    } as RuntimeStyle;
  }
  return base;
};
