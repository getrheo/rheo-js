import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import type { DecisionNode } from '@getrheo/contracts/decisions';
import type { ExternalSurfaceNode } from '@getrheo/contracts/externalSurfaces';
import { ensureLayoutNodes } from './aiFlowGenerationMerge';

/**
 * Partial manifest edit emitted by Rheo Agent in patch mode. Only the fields the
 * model intends to change are present; everything else is preserved from the draft.
 */
export type RheoAgentManifestPatch = {
  /** Upserted by `id`: replaces a matching screen, otherwise appended. */
  screens?: Screen[];
  /** Screen ids to drop from the draft. */
  removeScreenIds?: string[];
  /** Upserted by `id` when provided; omit to leave decision nodes unchanged. */
  decisionNodes?: DecisionNode[];
  /** Upserted by `id` when provided; omit to leave external surface nodes unchanged. */
  externalSurfaceNodes?: ExternalSurfaceNode[];
  /** Applied only when present. */
  entryScreenId?: string;
  /** Replaces the full key list only when present. */
  sdkAttributeKeys?: string[];
};

const upsertById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
  const incomingById = new Map(incoming.map((item) => [item.id, item]));
  const merged = existing.map((item) => incomingById.get(item.id) ?? item);
  const existingIds = new Set(existing.map((item) => item.id));
  for (const item of incoming) {
    if (!existingIds.has(item.id)) merged.push(item);
  }
  return merged;
};

/**
 * Applies a Rheo Agent patch onto the authoritative draft, preserving `builderMeta`
 * (canvas layout) and ensuring layout nodes exist for any newly added screens.
 *
 * Identity fields (`flowId`, `schemaVersion`, `version`, `defaultLocale`, `locales`,
 * `theme`) are always taken from the draft and never accepted from the patch.
 */
export const mergeRheoAgentPatchIntoDraft = (
  draft: FlowManifest,
  patch: RheoAgentManifestPatch,
): FlowManifest => {
  const removeIds = new Set(patch.removeScreenIds ?? []);

  let screens = patch.screens ? upsertById(draft.screens, patch.screens) : draft.screens;
  if (removeIds.size > 0) {
    screens = screens.filter((screen) => !removeIds.has(screen.id));
  }

  const decisionNodes = patch.decisionNodes
    ? upsertById(draft.decisionNodes ?? [], patch.decisionNodes)
    : draft.decisionNodes;

  const externalSurfaceNodes = patch.externalSurfaceNodes
    ? upsertById(draft.externalSurfaceNodes ?? [], patch.externalSurfaceNodes)
    : draft.externalSurfaceNodes;

  const merged: FlowManifest = {
    ...draft,
    screens,
    decisionNodes,
    externalSurfaceNodes,
    ...(patch.entryScreenId !== undefined ? { entryScreenId: patch.entryScreenId } : {}),
    ...(patch.sdkAttributeKeys !== undefined ? { sdkAttributeKeys: patch.sdkAttributeKeys } : {}),
    builderMeta: draft.builderMeta,
  };

  return ensureLayoutNodes(merged);
};
