import type { CounterDisplayKind, CounterTimeFormat } from '@getrheo/contracts/layers';

/**
 * Pretty-print animated counter values for display (web + native).
 * `decimalPlaces` is clamped to 0–20. Trailing fractional zeros are trimmed
 * except when `decimalPlaces === 0` (integer rounding via `toFixed(0)`).
 */
export const formatCounterLayerValue = (n: number, decimalPlaces = 0): string => {
  if (!Number.isFinite(n)) return '';
  const p = Math.max(0, Math.min(20, Math.trunc(decimalPlaces)));
  const s = n.toFixed(p);
  if (p === 0) return s;
  const trimmed = s.replace(/\.?0+$/, '');
  return trimmed === '' || trimmed === '-' ? '0' : trimmed;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Format a non-negative whole-second count as M:SS, H:MM:SS, or D:HH:MM:SS.
 * Fractional input uses `floor`; negative totals clamp to zero.
 */
export const formatCounterAsTime = (totalSeconds: number, format: CounterTimeFormat): string => {
  if (!Number.isFinite(totalSeconds)) return '';
  const whole = Math.max(0, Math.floor(totalSeconds));

  switch (format) {
    case 'mm_ss': {
      const minutes = Math.floor(whole / 60);
      const seconds = whole % 60;
      return `${minutes}:${pad2(seconds)}`;
    }
    case 'hh_mm_ss': {
      const hours = Math.floor(whole / 3600);
      const minutes = Math.floor((whole % 3600) / 60);
      const seconds = whole % 60;
      return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
    }
    case 'dd_hh_mm_ss': {
      const days = Math.floor(whole / 86400);
      const hours = Math.floor((whole % 86400) / 3600);
      const minutes = Math.floor((whole % 3600) / 60);
      const seconds = whole % 60;
      return `${days}:${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
    }
    default:
      return '';
  }
};

export type CounterLayerDisplayOpts = {
  displayKind?: CounterDisplayKind;
  decimalPlaces?: number;
  timeFormat?: CounterTimeFormat;
};

/** Routes to numeric or time formatting based on layer display settings. */
export const formatCounterLayerDisplay = (n: number, opts: CounterLayerDisplayOpts): string => {
  const kind = opts.displayKind ?? 'number';
  if (kind === 'time') {
    const tf = opts.timeFormat ?? 'mm_ss';
    return formatCounterAsTime(n, tf);
  }
  return formatCounterLayerValue(n, opts.decimalPlaces ?? 0);
};

/** Components for the counter inspector when editing time mode (all non‑negative integers). */
export type CounterTimeParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export const splitSecondsForTimeFormat = (
  totalSeconds: number,
  format: CounterTimeFormat,
): CounterTimeParts => {
  const whole = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  switch (format) {
    case 'mm_ss':
      return {
        days: 0,
        hours: 0,
        minutes: Math.floor(whole / 60),
        seconds: whole % 60,
      };
    case 'hh_mm_ss': {
      const hours = Math.floor(whole / 3600);
      const minutes = Math.floor((whole % 3600) / 60);
      const seconds = whole % 60;
      return { days: 0, hours, minutes, seconds };
    }
    case 'dd_hh_mm_ss': {
      const days = Math.floor(whole / 86400);
      const hours = Math.floor((whole % 86400) / 3600);
      const minutes = Math.floor((whole % 3600) / 60);
      const seconds = whole % 60;
      return { days, hours, minutes, seconds };
    }
    default:
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
};

const clamp59 = (n: number): number =>
  Math.max(0, Math.min(59, Math.trunc(Number.isFinite(n) ? n : 0)));

const clampHour23 = (n: number): number =>
  Math.max(0, Math.min(23, Math.trunc(Number.isFinite(n) ? n : 0)));

/** Compose UI units into total seconds (matches {@link splitSecondsForTimeFormat}). */
export const mergePartsForTimeFormat = (parts: CounterTimeParts, format: CounterTimeFormat): number => {
  switch (format) {
    case 'mm_ss':
      return Math.max(0, Math.trunc(Number.isFinite(parts.minutes) ? parts.minutes : 0)) * 60 +
        clamp59(parts.seconds);
    case 'hh_mm_ss':
      return (
        Math.max(0, Math.trunc(Number.isFinite(parts.hours) ? parts.hours : 0)) * 3600 +
        clamp59(parts.minutes) * 60 +
        clamp59(parts.seconds)
      );
    case 'dd_hh_mm_ss':
      return (
        Math.max(0, Math.trunc(Number.isFinite(parts.days) ? parts.days : 0)) * 86400 +
        clampHour23(parts.hours) * 3600 +
        clamp59(parts.minutes) * 60 +
        clamp59(parts.seconds)
      );
    default:
      return 0;
  }
};

/**
 * Time mode advances one displayed second per real second over |end − start|.
 * Number mode uses authored `durationMs` (default 3000).
 */
export const resolveCounterAnimationDurationMs = (opts: {
  displayKind?: CounterDisplayKind;
  durationMs?: number;
  startValue: number;
  endValue: number;
}): number => {
  if ((opts.displayKind ?? 'number') === 'time') {
    return Math.max(0, Math.round(Math.abs(opts.endValue - opts.startValue) * 1000));
  }
  return opts.durationMs ?? 3000;
};
