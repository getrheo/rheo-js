import type { DateTimeInputLayer, DateTimeInputMode } from '@getrheo/contracts/layers';

export type DateTimeValidateResult = { ok: true } | { ok: false; reason: string };

export const dateTimeInputMode = (layer: DateTimeInputLayer): DateTimeInputMode =>
  layer.mode ?? 'date';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/u;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/u;

const isValidDateParts = (isoDate: string): boolean => {
  if (!DATE_RE.test(isoDate)) return false;
  const parts = isoDate.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

const isValidTimeParts = (isoTime: string): boolean => {
  if (!TIME_RE.test(isoTime)) return false;
  const tp = isoTime.split(':');
  const h = Number(tp[0]);
  const mi = Number(tp[1]);
  const s = tp[2] !== undefined ? Number(tp[2]) : undefined;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return false;
  if (s !== undefined && (s < 0 || s > 59)) return false;
  return true;
};

const matchesMode = (mode: DateTimeInputMode, value: string): boolean => {
  switch (mode) {
    case 'date':
      return isValidDateParts(value);
    case 'time':
      return isValidTimeParts(value);
    case 'datetime': {
      if (!DATETIME_RE.test(value)) return false;
      const sep = value.indexOf('T');
      const datePart = value.slice(0, sep);
      const timePart = value.slice(sep + 1);
      return isValidDateParts(datePart) && isValidTimeParts(timePart);
    }
  }
};

const compareBound = (mode: DateTimeInputMode, value: string, bound: string): number => {
  if (mode === 'time') {
    const norm = (t: string) => (t.length === 5 ? `${t}:00` : t);
    return norm(value).localeCompare(norm(bound));
  }
  return value.localeCompare(bound);
};

/**
 * Validate a date / time / datetime string for a `date_time_input` layer.
 * Values use ISO-8601 local forms: `YYYY-MM-DD`, `HH:mm` / `HH:mm:ss`,
 * or `YYYY-MM-DDTHH:mm` / `YYYY-MM-DDTHH:mm:ss`.
 */
export const validateDateTimeInputValue = (
  layer: DateTimeInputLayer,
  raw: string,
): DateTimeValidateResult => {
  const trimmed = raw.trim();
  const required = layer.required !== false;
  if (trimmed.length === 0) {
    if (!required) return { ok: true };
    return { ok: false, reason: 'Select a value' };
  }
  const mode = dateTimeInputMode(layer);
  if (!matchesMode(mode, trimmed)) {
    return {
      ok: false,
      reason:
        mode === 'date'
          ? 'Enter a valid date (YYYY-MM-DD)'
          : mode === 'time'
            ? 'Enter a valid time (HH:mm)'
            : 'Enter a valid date and time',
    };
  }
  if (layer.min !== undefined && compareBound(mode, trimmed, layer.min) < 0) {
    return { ok: false, reason: `Must be on or after ${layer.min}` };
  }
  if (layer.max !== undefined && compareBound(mode, trimmed, layer.max) > 0) {
    return { ok: false, reason: `Must be on or before ${layer.max}` };
  }
  return { ok: true };
};

export const defaultDateTimeInputValue = (layer: DateTimeInputLayer): string | null => {
  if (layer.defaultValue) {
    const v = validateDateTimeInputValue({ ...layer, required: true }, layer.defaultValue);
    if (v.ok) return layer.defaultValue;
  }
  return null;
};
