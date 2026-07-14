import type { WheelPickerLayer } from '@getrheo/contracts/layers';
import { resolveLocalizedText } from '@getrheo/contracts/localized';

export type WheelPickerItem = {
  id: string;
  label: string;
};

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const buildYearItems = (layer: WheelPickerLayer): WheelPickerItem[] => {
  const nowYear = new Date().getFullYear();
  const min = layer.minYear ?? 1900;
  const max = layer.maxYear ?? nowYear + 10;
  const items: WheelPickerItem[] = [];
  for (let year = min; year <= max; year += 1) {
    const id = String(year);
    items.push({ id, label: id });
  }
  return items;
};

const buildMonthItems = (): WheelPickerItem[] =>
  MONTH_LABELS.map((label, index) => {
    const id = String(index + 1).padStart(2, '0');
    return { id, label };
  });

const buildDayItems = (): WheelPickerItem[] => {
  const items: WheelPickerItem[] = [];
  for (let day = 1; day <= 31; day += 1) {
    const id = String(day).padStart(2, '0');
    items.push({ id, label: id });
  }
  return items;
};

/** Resolve the scrollable rows for a wheel picker layer. */
export const buildWheelPickerItems = (
  layer: WheelPickerLayer,
  locale: string,
): WheelPickerItem[] => {
  const mode = layer.mode ?? 'options';
  if (mode === 'date') {
    const part = layer.datePart ?? 'year';
    if (part === 'month') return buildMonthItems();
    if (part === 'day') return buildDayItems();
    return buildYearItems(layer);
  }
  return (layer.options ?? []).map((option) => ({
    id: option.optionId,
    label: resolveLocalizedText(option.label, locale),
  }));
};

/** Default selection id for a wheel picker (first item when unset). */
export const defaultWheelPickerValue = (layer: WheelPickerLayer): string | null => {
  const items = buildWheelPickerItems(layer, 'en');
  if (items.length === 0) return null;
  const mode = layer.mode ?? 'options';
  if (mode === 'options') {
    const preferred = layer.defaultOptionId ?? layer.defaultValue;
    if (preferred && items.some((item) => item.id === preferred)) return preferred;
  } else if (layer.defaultValue && items.some((item) => item.id === layer.defaultValue)) {
    return layer.defaultValue;
  }
  const mid = items[Math.floor(items.length / 2)];
  return mid?.id ?? items[0]?.id ?? null;
};

export const wheelPickerValueIsValid = (
  layer: WheelPickerLayer,
  value: string,
  locale: string,
): boolean => buildWheelPickerItems(layer, locale).some((item) => item.id === value);
