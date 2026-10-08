import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { Branding } from '@getrheo/contracts/branding';
import type { ButtonAction, Layer } from '@getrheo/contracts/layers';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import type { InterpolationContext } from '@getrheo/flow-runtime/interpolateTemplate';
import type { StepResponse } from '@getrheo/flow-runtime/stateMachine';

/** Builder canvas: mirror inspector tabs without changing manifest or draft state. */
export type InspectorStylePreview =
  | { kind: 'checkbox'; layerId: string; variant: 'unchecked' | 'checked' }
  | {
      kind: 'choice_option_stack';
      choiceParentLayerId: string;
      /** Option stack roots previewed as default/selected (supports multi-select). */
      optionStackLayerIds: string[];
      variant: 'default' | 'selected';
    };

export type Ctx = {
  manifest: FlowManifest;
  /** The screen currently being rendered so input layers can decide draft vs auto-submit behavior. */
  screen: Screen;
  locale: string;
  interactive: boolean;
  mediaMap?: Record<string, string>;
  selectedLayerId?: string | null;
  /** Additional selected layer ids (builder multi-select). */
  selectedLayerIds?: readonly string[];
  /** Find-in-copy match highlights (builder find/replace session). */
  findMatchLayerIds?: readonly string[];
  onSelectLayer?: (id: string | null) => void;
  onRespond?: (r: StepResponse) => void;
  onAction?: (a: ButtonAction, meta?: { layerId: string }) => void;
  onHyperlinkPreview?: (info: { href: string; label: string }) => void;
  /** Runtime: fired after a hyperlink is opened. Hosts emit `external_link_opened`. */
  onExternalLink?: (info: { layerId: string; href: string }) => void;
  theme: 'light' | 'dark';
  isRegionRoot?: boolean;
  /** Which screen region the current region-root stack belongs to (header/body/footer). */
  regionKind?: 'header' | 'body' | 'footer';
  interpolationContext?: InterpolationContext;
  previewWidthPx?: number;
  intrinsicRegionLayout?: boolean;
  branding?: Branding;
  thumbnailChrome?: boolean;
  inspectorStylePreview?: InspectorStylePreview | null;
  /** Rheo dashboard: video/Lottie show poster only; video is always muted (no audio in browser). */
  authoringPreview?: boolean;
  /**
   * Direction of the immediate parent stack, if any. Used by the flex-shell
   * wrapper to pick width/height handling that mirrors React Native's flex
   * model (e.g. `width: full` in a horizontal stack ⇒ `flex: 1; min-width: 0`).
   */
  parentStackDirection?: 'vertical' | 'horizontal';
  /** Cross-axis alignment of the immediate parent stack (`alignItems` / `align`). */
  parentStackAlign?: 'start' | 'center' | 'end' | 'stretch';
  /** Variables `conditional` cases read. `responses` falls back to {@link Ctx.interpolationContext}. */
  conditionalEval?: {
    platform?: string;
    sdkAttributes?: Record<string, unknown>;
    responses?: Record<string, unknown>;
  };
  /** Builder canvas: pin a `conditional` layer (by id) to a case id or `'else'`. */
  conditionalCasePreview?: Record<string, string>;
};

export type RenderLayer = (layer: Layer, ctx: Ctx) => ReactNode;

export const isStaticLayerPicker = (ctx: Ctx): boolean => Boolean(ctx.onSelectLayer) && !ctx.interactive;

/** Builder canvas layer selection ring (matches other layer highlights). */
const BUILDER_LAYER_SELECTION_COLOR = '#3b82f6';
/** Find/replace match highlight (secondary to selection). */
const BUILDER_LAYER_FIND_MATCH_COLOR = '#f59e0b';

export const SelectableWrap = ({
  layer,
  ctx,
  children,
  outerStyle,
}: {
  layer: Layer;
  ctx: Ctx;
  children: ReactNode;
  outerStyle?: CSSProperties;
}) => {
  const multiSelected = ctx.selectedLayerIds?.includes(layer.id) === true;
  const selected = ctx.selectedLayerId === layer.id || multiSelected;
  const findMatch =
    !selected && ctx.findMatchLayerIds?.includes(layer.id) === true;
  const regionRootRing = selected && ctx.isRegionRoot === true;
  const handleClick = (e: ReactMouseEvent) => {
    if (!ctx.onSelectLayer) return;
    e.stopPropagation();
    ctx.onSelectLayer(layer.id);
  };
  const outlineColor = selected
    ? BUILDER_LAYER_SELECTION_COLOR
    : findMatch
      ? BUILDER_LAYER_FIND_MATCH_COLOR
      : null;
  return (
    <div
      data-layer-id={layer.id}
      data-find-match={findMatch ? 'true' : undefined}
      onClick={ctx.onSelectLayer ? handleClick : undefined}
      style={{
        position: 'relative',
        ...outerStyle,
        ...(outlineColor && !regionRootRing
          ? {
              outline: `2px solid ${outlineColor}`,
              outlineOffset: 2,
              borderRadius: 6,
            }
          : {}),
      }}
    >
      {children}
      {regionRootRing ? (
        <div
          aria-hidden
          data-layer-selection-ring
          style={{
            position: 'absolute',
            inset: 0,
            border: `2px solid ${BUILDER_LAYER_SELECTION_COLOR}`,
            borderRadius: 6,
            pointerEvents: 'none',
            zIndex: 10_000,
          }}
        />
      ) : null}
    </div>
  );
};
