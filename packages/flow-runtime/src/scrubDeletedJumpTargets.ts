import type { FlowManifest } from '@getrheo/contracts';
import type { Layer } from '@getrheo/contracts/layers';
import {
  OS_PERMISSION_OUTCOME_CONTINUE,
  OS_PERMISSION_OUTCOME_END,
} from '@getrheo/contracts/layers';
import { walkLayers } from './layers';

const scrubLayerJumpTargetsInPlace = (layer: Layer, deletedIds: ReadonlySet<string>): void => {
  if (!layer?.kind) return;
  if (layer.kind === 'single_choice' || layer.kind === 'multiple_choice') {
    layer.branching.conditions = layer.branching.conditions.filter((c) => !deletedIds.has(c.goTo));
    return;
  }

  if (layer.kind === 'button') {
    if (layer.action.kind === 'go_to_step' && deletedIds.has(layer.action.screenId)) {
      layer.action = { kind: 'continue' };
      return;
    }
    if (
      layer.action.kind === 'go_back_one_screen' &&
      layer.action.fallbackScreenId &&
      deletedIds.has(layer.action.fallbackScreenId)
    ) {
      layer.action = { kind: 'go_back_one_screen' };
      return;
    }
    if (layer.action.kind === 'request_os_permission') {
      for (const slot of ['granted', 'denied', 'blocked'] as const) {
        const target = layer.action.outcomes[slot];
        if (
          target !== OS_PERMISSION_OUTCOME_END &&
          target !== OS_PERMISSION_OUTCOME_CONTINUE &&
          deletedIds.has(target)
        ) {
          layer.action.outcomes[slot] = OS_PERMISSION_OUTCOME_CONTINUE;
        }
      }
    }
    return;
  }

  if (layer.kind === 'back_button' && layer.fallbackScreenId && deletedIds.has(layer.fallbackScreenId)) {
    delete layer.fallbackScreenId;
    return;
  }

  if (
    (layer.kind === 'loader' || layer.kind === 'lottie' || layer.kind === 'video') &&
    layer.onComplete?.mode === 'screen' &&
    deletedIds.has(layer.onComplete.screenId)
  ) {
    layer.onComplete = { mode: 'none' };
  }
};

const walkScreenRegionsSafe = (
  screen: FlowManifest['screens'][number],
  fn: (layer: Layer) => void,
): void => {
  const regions = screen.regions;
  if (regions.header) walkLayers(regions.header as never, fn);
  if (regions.body) walkLayers(regions.body as never, fn);
  if (regions.footer) walkLayers(regions.footer as never, fn);
};

/**
 * Clear graph jump targets that reference deleted node ids. Mutates `manifest`
 * in place (callers should clone first). Used when removing screens, decisions,
 * or external surfaces so drafts stay schema-valid.
 */
export const scrubDeletedJumpTargetsInPlace = (
  manifest: FlowManifest,
  deletedIds: ReadonlySet<string>,
): void => {
  if (deletedIds.size === 0) return;

  if (manifest.entryScreenId != null && deletedIds.has(manifest.entryScreenId)) {
    manifest.entryScreenId = null;
  }

  for (const screen of manifest.screens) {
    if (screen.next.default != null && deletedIds.has(screen.next.default)) {
      screen.next.default = null;
    }
    walkScreenRegionsSafe(screen, (layer) => scrubLayerJumpTargetsInPlace(layer, deletedIds));
  }

  for (const decision of manifest.decisionNodes) {
    for (let i = 0; i < decision.cases.length; i += 1) {
      const c = decision.cases[i]!;
      if (c.next != null && deletedIds.has(c.next)) {
        decision.cases[i] = { ...c, next: null };
      }
    }
    if (decision.elseNext != null && deletedIds.has(decision.elseNext)) {
      decision.elseNext = null;
    }
  }

  for (const surface of manifest.externalSurfaceNodes ?? []) {
    if (surface.fallback != null && deletedIds.has(surface.fallback)) {
      surface.fallback = null;
    }
    const outs = surface.outcomes;
    for (const key of Object.keys(outs) as (keyof typeof outs)[]) {
      const target = outs[key];
      if (target != null && deletedIds.has(target)) {
        outs[key] = null;
      }
    }
  }
};
