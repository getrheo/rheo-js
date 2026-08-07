import type { ConditionalLayer, Layer, StackLayer } from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';
import { evaluateDecisionExpression } from './decisionEval.js';
import type { DecisionEvalCtx } from './decisionEval.js';
import { childrenOf } from './layerTreeOps.js';
import { walkLayers } from './layers.js';

/**
 * The child stack a conditional layer renders: the first case whose
 * expression matches, otherwise the else stack. Falls back to the last child
 * when bindings are stale (the manifest schema rejects that, but the runtime
 * must never render nothing unexpectedly).
 */
export const resolveConditionalBranch = (
  layer: ConditionalLayer,
  ctx: DecisionEvalCtx,
): StackLayer => {
  const stackById = (id: string): StackLayer | undefined =>
    layer.children.find((c) => c.id === id);
  for (const c of layer.cases) {
    if (!evaluateDecisionExpression(c.expression, ctx)) continue;
    const match = stackById(c.rootLayerId);
    if (match) return match;
  }
  return (
    stackById(layer.elseRootLayerId) ?? (layer.children[layer.children.length - 1] as StackLayer)
  );
};

/**
 * The stack a specific branch renders, by case id or `'else'`. Used by the
 * builder canvas to preview a branch without changing the eval context.
 */
export const conditionalBranchForCaseId = (
  layer: ConditionalLayer,
  caseId: string,
): StackLayer | undefined => {
  const rootLayerId =
    caseId === 'else'
      ? layer.elseRootLayerId
      : layer.cases.find((c) => c.id === caseId)?.rootLayerId;
  if (rootLayerId == null) return undefined;
  return layer.children.find((c) => c.id === rootLayerId);
};

/** Variables for conditional cases, with renderer-friendly defaults. */
export const toDecisionEvalCtx = (input: {
  locale: string;
  platform?: string;
  sdkAttributes?: Record<string, unknown>;
  responses?: Record<string, unknown>;
}): DecisionEvalCtx => ({
  locale: input.locale,
  platform: input.platform ?? 'unknown',
  sdkAttributes: input.sdkAttributes ?? {},
  responses: input.responses ?? {},
});

/** Which branch of a conditional is active, as a case id or `'else'`. */
export const resolveConditionalCaseId = (
  layer: ConditionalLayer,
  ctx: DecisionEvalCtx,
): string | 'else' => {
  for (const c of layer.cases) {
    if (evaluateDecisionExpression(c.expression, ctx)) return c.id;
  }
  return 'else';
};

const withChildren = (layer: Layer, next: Layer[]): Layer => {
  switch (layer.kind) {
    case 'carousel':
      return { ...layer, slides: next as StackLayer[] };
    case 'conditional':
      return { ...layer, children: next as StackLayer[] };
    case 'single_choice':
    case 'multiple_choice':
      return { ...layer, children: next as StackLayer[] };
    case 'stack':
    case 'button':
    case 'back_button':
    case 'hyperlink':
    case 'email_password_submit':
    case 'number_stepper_button':
    case 'text_input':
    case 'scale_input':
    case 'wheel_picker':
    case 'date_time_input':
    case 'phone_input':
    case 'address_input':
    case 'email_password_field':
      return { ...layer, children: next };
    // Children are narrowed to auth/stepper-only kinds; conditionals can't nest here.
    case 'oauth_login':
    case 'oauth_provider':
    case 'email_password_auth':
    case 'number_stepper':
    default:
      return layer;
  }
};

/**
 * Replace every conditional layer in the subtree with its active branch stack,
 * so downstream consumers (renderers, input lookup, drafts, analytics) only see
 * layers that are really on screen. Returns the same reference when the subtree
 * has no conditionals.
 */
export const resolveLayerConditionals = (layer: Layer, ctx: DecisionEvalCtx): Layer => {
  if (layer.kind === 'conditional') {
    return resolveLayerConditionals(resolveConditionalBranch(layer, ctx), ctx);
  }
  const kids = childrenOf(layer);
  if (kids.length === 0) return layer;
  const next = kids.map((c) => resolveLayerConditionals(c, ctx));
  if (next.every((c, i) => c === kids[i])) return layer;
  return withChildren(layer, next);
};

/** {@link resolveLayerConditionals} applied to every region of a screen. */
export const resolveScreenConditionals = (screen: Screen, ctx: DecisionEvalCtx): Screen => {
  const header = screen.regions.header
    ? (resolveLayerConditionals(screen.regions.header, ctx) as StackLayer)
    : undefined;
  const body = resolveLayerConditionals(screen.regions.body, ctx) as StackLayer;
  const footer = screen.regions.footer
    ? (resolveLayerConditionals(screen.regions.footer, ctx) as StackLayer)
    : undefined;
  if (
    header === screen.regions.header &&
    body === screen.regions.body &&
    footer === screen.regions.footer
  ) {
    return screen;
  }
  return {
    ...screen,
    regions: {
      ...(header ? { header } : {}),
      body,
      ...(footer ? { footer } : {}),
    },
  };
};

/** True when the screen has at least one conditional layer. */
export const screenHasConditional = (screen: Screen): boolean => {
  let found = false;
  const check = (root: Layer): void => {
    walkLayers(root, (l) => {
      if (l.kind === 'conditional') found = true;
    });
  };
  if (screen.regions.header) check(screen.regions.header);
  check(screen.regions.body);
  if (screen.regions.footer) check(screen.regions.footer);
  return found;
};

const answerFieldKeyOf = (l: Layer): string | null => {
  if (
    l.kind === 'single_choice' ||
    l.kind === 'multiple_choice' ||
    l.kind === 'text_input' ||
    l.kind === 'scale_input' ||
    l.kind === 'wheel_picker' ||
    l.kind === 'date_time_input' ||
    l.kind === 'number_stepper' ||
    l.kind === 'phone_input' ||
    l.kind === 'address_input' ||
    l.kind === 'checkbox' ||
    l.kind === 'email_password_auth'
  ) {
    return l.fieldKey;
  }
  return null;
};

const screenFieldKeys = (screen: Screen): Set<string> => {
  const keys = new Set<string>();
  const collect = (root: Layer): void => {
    walkLayers(root, (l) => {
      const k = answerFieldKeyOf(l);
      if (k != null) keys.add(k);
    });
  };
  if (screen.regions.header) collect(screen.regions.header);
  collect(screen.regions.body);
  if (screen.regions.footer) collect(screen.regions.footer);
  return keys;
};

/** Field keys that only exist under conditional branches which are not active. */
export const vacatedConditionalFieldKeys = (screen: Screen, ctx: DecisionEvalCtx): string[] => {
  if (!screenHasConditional(screen)) return [];
  const active = screenFieldKeys(resolveScreenConditionals(screen, ctx));
  return [...screenFieldKeys(screen)].filter((k) => !active.has(k));
};

/**
 * Drop answers captured under branches the screen no longer shows, so leaving
 * a branch never leaves a ghost response behind. Upstream-screen keys are kept.
 */
export const pruneVacatedConditionalResponses = <T>(
  screen: Screen,
  ctx: DecisionEvalCtx,
  responses: Record<string, T>,
): Record<string, T> => {
  const vacated = vacatedConditionalFieldKeys(screen, ctx);
  if (vacated.length === 0) return responses;
  const next = { ...responses };
  let changed = false;
  for (const k of vacated) {
    if (k in next) {
      delete next[k];
      changed = true;
    }
  }
  return changed ? next : responses;
};
