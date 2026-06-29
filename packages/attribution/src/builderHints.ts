import type { FlowManifest } from '@getrheo/contracts/manifest';
import {
  collectDecisionSdkKeys,
  DecisionNodeIdSchema,
  type DecisionExpr,
  type DecisionNode,
} from '@getrheo/contracts/decisions';

/** Canonical prefixes for MMP / deep-link context merged into SDK attributes. */
export const ATTRIBUTION_CONTEXT_KEY_PREFIXES = ['attribution.', 'acquisition.', 'link.'] as const;

export const sdkKeyUsesAttributionContext = (key: string): boolean =>
  ATTRIBUTION_CONTEXT_KEY_PREFIXES.some((p) => key.startsWith(p));

export const decisionExpressionUsesAttributionContext = (expr: DecisionExpr): boolean =>
  collectDecisionSdkKeys(expr).some(sdkKeyUsesAttributionContext);

/** Default `next` target from the manifest entry screen (screen or decision id), or null. */
export const getEntryScreenDefaultJumpTarget = (manifest: FlowManifest): string | null => {
  if (manifest.entryScreenId == null) return null;
  const screen = manifest.screens.find((s) => s.id === manifest.entryScreenId);
  const t = screen?.next?.default;
  if (t == null || typeof t !== 'string' || t.length === 0) return null;
  return t;
};

export const entryDefaultNextIsDecisionNode = (manifest: FlowManifest): boolean => {
  const t = getEntryScreenDefaultJumpTarget(manifest);
  if (!t) return false;
  return DecisionNodeIdSchema.safeParse(t).success;
};

export const decisionNodeUsesAttributionContext = (dn: DecisionNode): boolean =>
  dn.cases.some((c) => decisionExpressionUsesAttributionContext(c.expression));

/**
 * True when the entry screen's default next hop is a decision node whose rules read
 * attribution / acquisition / link SDK keys — first evaluation can run before deferred MMP data arrives.
 */
export const entryDefaultNextIsAttributionDecision = (manifest: FlowManifest): boolean => {
  const t = getEntryScreenDefaultJumpTarget(manifest);
  if (!t || !DecisionNodeIdSchema.safeParse(t).success) return false;
  const dn = manifest.decisionNodes?.find((d) => d.id === t);
  if (!dn) return false;
  return decisionNodeUsesAttributionContext(dn);
};

/** Any decision node references attribution-style SDK keys. */
export const manifestUsesAttributionInDecisions = (manifest: FlowManifest): boolean =>
  (manifest.decisionNodes ?? []).some(decisionNodeUsesAttributionContext);
