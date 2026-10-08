import type { ConditionalLayer } from '@getrheo/contracts/layers';
import {
  conditionalBranchForCaseId,
  resolveConditionalBranch,
  toDecisionEvalCtx,
} from '@getrheo/flow-runtime/conditionalBranch';
import type { Ctx, RenderLayer } from '../LayerRendererShared';

/**
 * Renders only the branch a conditional selects — no wrapper chrome, so the
 * branch stack lays out exactly as it would in place of the conditional.
 * The builder canvas can pin a branch through `ctx.conditionalCasePreview`.
 */
export const ConditionalView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: ConditionalLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const pinnedCaseId = ctx.conditionalCasePreview?.[layer.id];
  const branch =
    (pinnedCaseId ? conditionalBranchForCaseId(layer, pinnedCaseId) : undefined) ??
    resolveConditionalBranch(
      layer,
      toDecisionEvalCtx({
        locale: ctx.locale,
        platform: ctx.conditionalEval?.platform,
        sdkAttributes: ctx.conditionalEval?.sdkAttributes,
        responses: ctx.conditionalEval?.responses ?? ctx.interpolationContext?.responses,
      }),
    );
  return <>{renderLayer(branch, ctx)}</>;
};
