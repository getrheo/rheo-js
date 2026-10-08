import type { CSSProperties } from 'react';
import type {
  MultipleChoiceLayer,
  SingleChoiceLayer,
  StackLayer,
} from '@getrheo/contracts/layers';
import {
  findOptionStackForChoice,
  screenHasContinueButton,
} from '@getrheo/flow-runtime/layers';
import { applyChoiceOptionSelectionToStack } from '@getrheo/flow-runtime';
import { DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX } from '@getrheo/flow-runtime/responsive/breakpoints';
import { resolveCommonStyleAtWidth, resolveChoiceLayoutAtWidth, resolveLayerGap } from '@getrheo/flow-runtime/responsive/layerResolve';
import { useScreenInputDraft } from '@getrheo/flow-ui-state';
import { SelectableWrap, type Ctx, type RenderLayer } from '../LayerRendererShared';
import {
  commonCss,
  layoutHeightFor,
  stripCommonLayoutForInner,
  stripFlowAxesForFlexChild,
  widthFor,
} from '../LayerRendererStyle';
import { optionPressDefaultsCss } from './actionLayers';

const choiceOuterLayoutCss = (
  layer: SingleChoiceLayer | MultipleChoiceLayer,
  ctx: Ctx,
): CSSProperties => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolved = resolveCommonStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const stripped = stripCommonLayoutForInner(
    stripFlowAxesForFlexChild(resolved, ctx.parentStackDirection),
  );
  const common = commonCss(stripped, ctx.manifest.theme, ctx.theme, ctx.branding);
  const isAbsolute = resolved?.position === 'absolute';
  const inFlex = ctx.parentStackDirection !== undefined;
  const directWidth = isAbsolute || inFlex ? undefined : widthFor(resolved?.width);
  const directHeight =
    isAbsolute || inFlex ? undefined : layoutHeightFor(resolved?.height);
  return {
    ...common,
    ...(directWidth !== undefined ? { width: directWidth } : {}),
    ...(directHeight !== undefined ? { height: directHeight } : {}),
    boxSizing: 'border-box',
    minWidth: 0,
  };
};

const choiceContainerStyle = (
  layer: SingleChoiceLayer | MultipleChoiceLayer,
  ctx: Ctx,
): CSSProperties => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const layout = resolveChoiceLayoutAtWidth(layer, w);
  const gap = resolveLayerGap(layer.kind, layout.gap);
  if (layout.direction === 'grid') {
    const columns = Math.max(1, layout.columns ?? 2);
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap,
    };
  }
  return {
    display: 'flex',
    flexDirection: layout.direction === 'horizontal' ? 'row' : 'column',
    gap,
  };
};

const stackWithSelectedStyle = applyChoiceOptionSelectionToStack;

const choiceRowMergeSelected = (
  ctx: Ctx,
  parent: SingleChoiceLayer | MultipleChoiceLayer,
  stack: StackLayer,
  draftSelected: boolean,
): boolean => {
  const p = ctx.inspectorStylePreview;
  if (p?.kind === 'choice_option_stack' && p.optionStackLayerIds.includes(stack.id)) {
    return p.variant === 'selected';
  }
  return draftSelected;
};

const ChoiceOptionRow = ({
  parent,
  optionId,
  ctx,
  isSelected,
  onPress,
  renderLayer,
}: {
  parent: SingleChoiceLayer | MultipleChoiceLayer;
  optionId: string;
  ctx: Ctx;
  isSelected: boolean;
  onPress: () => void;
  renderLayer: RenderLayer;
}) => {
  const stack = findOptionStackForChoice(parent, optionId);
  if (!stack) return null;
  const mergeSelected = choiceRowMergeSelected(ctx, parent, stack, isSelected);
  const styled = stackWithSelectedStyle(
    stack,
    mergeSelected,
    ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX,
  );
  const hasAuthoredLook =
    !!stack.style?.background ||
    !!stack.style?.border ||
    !!stack.style?.padding ||
    !!stack.selectedStyle;
  return (
    <div
      role="button"
      aria-pressed={mergeSelected}
      onClick={(e) => {
        if (!ctx.interactive) return;
        e.stopPropagation();
        onPress();
      }}
      style={{
        cursor: ctx.interactive ? 'pointer' : 'default',
        ...(hasAuthoredLook ? {} : optionPressDefaultsCss(ctx)),
      }}
    >
      {renderLayer(styled, ctx)}
    </div>
  );
};

export const SingleChoiceView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: SingleChoiceLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const draftCtx = useScreenInputDraft();
  const manualSubmit = screenHasContinueButton(ctx.screen);
  const selectedId =
    draftCtx?.draft?.kind === 'choice' ? draftCtx.draft.choiceId : null;

  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={choiceOuterLayoutCss(layer, ctx)}>
      <div style={choiceContainerStyle(layer, ctx)}>
        {layer.optionBindings.map((b) => (
          <ChoiceOptionRow
            key={b.optionId}
            parent={layer}
            optionId={b.optionId}
            ctx={ctx}
            isSelected={manualSubmit && selectedId === b.optionId}
            renderLayer={renderLayer}
            onPress={() => {
              if (manualSubmit) {
                draftCtx?.setDraft({ kind: 'choice', choiceId: b.optionId });
              } else {
                ctx.onRespond?.({ kind: 'choice', choiceId: b.optionId });
              }
            }}
          />
        ))}
      </div>
    </SelectableWrap>
  );
};

export const MultipleChoiceView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: MultipleChoiceLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const draftCtx = useScreenInputDraft();
  const selected = new Set(
    draftCtx?.draft?.kind === 'multiChoice' ? draftCtx.draft.choiceIds : [],
  );
  const toggle = (id: string) => {
    if (!draftCtx) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else {
      const max = layer.maxSelections;
      if (max !== undefined && next.size >= max) return;
      next.add(id);
    }
    draftCtx.setDraft(
      next.size === 0 ? null : { kind: 'multiChoice', choiceIds: Array.from(next) },
    );
  };
  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={choiceOuterLayoutCss(layer, ctx)}>
      <div style={choiceContainerStyle(layer, ctx)}>
        {layer.optionBindings.map((b) => (
          <ChoiceOptionRow
            key={b.optionId}
            parent={layer}
            optionId={b.optionId}
            ctx={ctx}
            isSelected={selected.has(b.optionId)}
            renderLayer={renderLayer}
            onPress={() => toggle(b.optionId)}
          />
        ))}
      </div>
    </SelectableWrap>
  );
};
