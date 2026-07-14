import type {
  IconLayer,
  ImageLayer,
  Layer,
  StackLayer,
  TextLayer,
} from '@getrheo/contracts/layers';
import {
  resolveIconStyleAtWidth,
  resolveImageStyleAtWidth,
  resolveTextStyleAtWidth,
  resolveCommonStyleAtWidth,
} from './responsive/layerResolve';

/** Icon id suffix: visible only when the containing choice option is selected. */
export const CHOICE_OPTION_SELECTED_ICON_SUFFIX = '_sel';

/** Icon id suffix: visible only when the containing choice option is unselected. */
export const CHOICE_OPTION_UNSELECTED_ICON_SUFFIX = '_unsel';

export const stackWithSelectedStyle = (
  stack: StackLayer,
  isSelected: boolean,
  widthPx: number,
): StackLayer => {
  if (!isSelected || (!stack.selectedStyle && !stack.selectedStyleBreakpoints)) return stack;
  const resolved = resolveCommonStyleAtWidth(stack.style, stack.styleBreakpoints, widthPx);
  const selected = resolveCommonStyleAtWidth(
    stack.selectedStyle,
    stack.selectedStyleBreakpoints,
    widthPx,
  );
  if (!selected) return stack;
  return {
    ...stack,
    style: { ...(resolved ?? {}), ...selected },
    styleBreakpoints: undefined,
  };
};

const textWithSelectedStyle = (
  layer: TextLayer,
  isSelected: boolean,
  widthPx: number,
): TextLayer => {
  if (!isSelected || !layer.selectedStyle) return layer;
  const resolved = resolveTextStyleAtWidth(layer.style, layer.styleBreakpoints, widthPx);
  return {
    ...layer,
    style: { ...(resolved ?? {}), ...layer.selectedStyle },
    styleBreakpoints: undefined,
  };
};

const imageWithSelectedStyle = (
  layer: ImageLayer,
  isSelected: boolean,
  widthPx: number,
): ImageLayer => {
  if (!isSelected || !layer.selectedStyle) return layer;
  const resolved = resolveImageStyleAtWidth(layer.style, layer.styleBreakpoints, widthPx);
  return {
    ...layer,
    style: { ...(resolved ?? {}), ...layer.selectedStyle },
    styleBreakpoints: undefined,
  };
};

const iconWithSelectedStyle = (
  layer: IconLayer,
  isSelected: boolean,
  widthPx: number,
): IconLayer => {
  if (!isSelected || !layer.selectedStyle) return layer;
  const resolved = resolveIconStyleAtWidth(layer.style, layer.styleBreakpoints, widthPx);
  return {
    ...layer,
    style: { ...(resolved ?? {}), ...layer.selectedStyle },
    styleBreakpoints: undefined,
  };
};

const iconVisibilityForChoiceOption = (layer: IconLayer, isSelected: boolean): IconLayer => {
  const baseOpacity = layer.style?.opacity ?? 1;
  if (layer.id.endsWith(CHOICE_OPTION_SELECTED_ICON_SUFFIX)) {
    return {
      ...layer,
      style: { ...layer.style, opacity: isSelected ? baseOpacity : 0 },
    };
  }
  if (layer.id.endsWith(CHOICE_OPTION_UNSELECTED_ICON_SUFFIX)) {
    return {
      ...layer,
      style: { ...layer.style, opacity: isSelected ? 0 : baseOpacity },
    };
  }
  return layer;
};

const mapChoiceOptionChildForSelection = (
  child: Layer,
  isSelected: boolean,
  widthPx: number,
): Layer => {
  if (child.kind === 'stack') {
    const stack = child as StackLayer;
    const nestedSelected = isSelected && (!!stack.selectedStyle || !!stack.selectedStyleBreakpoints);
    const styled = stackWithSelectedStyle(stack, nestedSelected, widthPx);
    const children = styled.children?.map((c) =>
      mapChoiceOptionChildForSelection(c, isSelected, widthPx),
    );
    return children ? ({ ...styled, children } as StackLayer) : styled;
  }
  if (child.kind === 'text') {
    return textWithSelectedStyle(child, isSelected, widthPx);
  }
  if (child.kind === 'image' || child.kind === 'lottie' || child.kind === 'video') {
    return imageWithSelectedStyle(child as ImageLayer, isSelected, widthPx);
  }
  if (child.kind === 'icon') {
    const styled = iconWithSelectedStyle(child, isSelected, widthPx);
    return iconVisibilityForChoiceOption(styled, isSelected);
  }
  return child;
};

/** Applies root + nested `selectedStyle` and toggles `_sel` / `_unsel` indicator icons. */
export const applyChoiceOptionSelectionToStack = (
  stack: StackLayer,
  isSelected: boolean,
  widthPx: number,
): StackLayer => {
  const styled = stackWithSelectedStyle(stack, isSelected, widthPx);
  if (!styled.children) return styled;
  return {
    ...styled,
    children: styled.children.map((c) => mapChoiceOptionChildForSelection(c, isSelected, widthPx)),
  };
};
