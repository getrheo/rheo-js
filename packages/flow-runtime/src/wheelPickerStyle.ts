import type { Theme } from '@getrheo/contracts/manifest';
import type { WheelPickerItemStyle, WheelPickerLayer } from '@getrheo/contracts/layers';
import { resolveThemedColor } from './layers';

export type ResolvedWheelPickerTextStyle = {
  fontFamily: string | undefined;
  fontSizePx: number;
  fontWeight: number | undefined;
  color: string;
  opacity: number;
};

export type ResolvedWheelPickerStyle = {
  itemHeightPx: number;
  visibleItemCount: number;
  selectionBackgroundColor: string;
  placeholder: string;
  item: ResolvedWheelPickerTextStyle;
  selectedItem: ResolvedWheelPickerTextStyle;
};

const defaultItemColor = (palette: 'light' | 'dark'): string =>
  palette === 'dark' ? '#a1a1aa' : '#71717a';

const defaultSelectedColor = (palette: 'light' | 'dark'): string =>
  palette === 'dark' ? '#fafafa' : '#0a0a0a';

const defaultSelectionBackground = (palette: 'light' | 'dark'): string =>
  palette === 'dark' ? 'rgba(63, 63, 70, 0.55)' : 'rgba(228, 228, 231, 0.85)';

const resolveTextStyle = (
  style: WheelPickerItemStyle | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  selected: boolean,
): ResolvedWheelPickerTextStyle => {
  const fallbackColor = selected ? defaultSelectedColor(palette) : defaultItemColor(palette);
  const color =
    (resolveThemedColor(theme, palette, style?.color) as string | undefined) ?? fallbackColor;
  return {
    fontFamily: style?.fontFamily,
    fontSizePx: style?.fontSize ?? (selected ? 20 : 18),
    fontWeight: style?.fontWeight ?? (selected ? 600 : 400),
    color,
    opacity: style?.opacity ?? 1,
  };
};

export const resolveWheelPickerForRender = (
  layer: WheelPickerLayer,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  placeholder: string,
): ResolvedWheelPickerStyle => {
  const itemHeightPx = layer.itemHeight ?? 44;
  const visibleItemCount = layer.visibleItemCount ?? 5;
  const selectionBackgroundColor =
    (resolveThemedColor(theme, palette, layer.selectionBackgroundColor) as string | undefined) ??
    defaultSelectionBackground(palette);
  return {
    itemHeightPx,
    visibleItemCount,
    selectionBackgroundColor,
    placeholder,
    item: resolveTextStyle(layer.itemStyle, theme, palette, false),
    selectedItem: resolveTextStyle(layer.selectedItemStyle, theme, palette, true),
  };
};
