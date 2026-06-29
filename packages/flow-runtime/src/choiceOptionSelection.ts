import type { IconLayer, Layer, StackLayer } from '@getrheo/contracts/layers';
import { resolveCommonStyleAtWidth } from './responsive/layerResolve';

/** Icon id suffix: visible only when the containing choice option is selected. */
export const CHOICE_OPTION_SELECTED_ICON_SUFFIX = '_sel';

/** Icon id suffix: visible only when the containing choice option is unselected. */
export const CHOICE_OPTION_UNSELECTED_ICON_SUFFIX = '_unsel';

export const stackWithSelectedStyle = (
  stack: StackLayer,
  isSelected: boolean,
  widthPx: number,
): StackLayer => {
  if (!isSelected || !stack.selectedStyle) return stack;
  const resolved = resolveCommonStyleAtWidth(stack.style, stack.styleBreakpoints, widthPx);
  return {
    ...stack,
    style: { ...(resolved ?? {}), ...stack.selectedStyle },
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
    const nestedSelected = isSelected && !!stack.selectedStyle;
    const styled = stackWithSelectedStyle(stack, nestedSelected, widthPx);
    const children = styled.children?.map((c) =>
      mapChoiceOptionChildForSelection(c, isSelected, widthPx),
    );
    return children ? ({ ...styled, children } as StackLayer) : styled;
  }
  if (child.kind === 'icon') {
    return iconVisibilityForChoiceOption(child, isSelected);
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
