import type { Layer } from '@getrheo/contracts/layers';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import { walkScreen } from './layers.js';

/** Deep clone manifest JSON shape for SDK responses. */
export const cloneManifestForBillingSlice = (m: FlowManifest): FlowManifest =>
  structuredClone(m) as FlowManifest;

const stripRestingMotionFromLayer = (layer: Layer): void => {
  const l = layer as { restingMotion?: unknown; restingMotions?: unknown };
  delete l.restingMotion;
  delete l.restingMotions;
};

/** Removes per-screen animation clips (timeline / transitions). */
export const stripManifestAnimations = (manifest: FlowManifest): FlowManifest => {
  const next = cloneManifestForBillingSlice(manifest);
  for (const screen of next.screens) {
    const s = screen as { animations?: unknown; stagger?: unknown };
    delete s.animations;
    delete s.stagger;
  }
  return next;
};

/** Removes screen clips, stagger defaults, and per-layer resting motion. */
export const stripManifestMotion = (manifest: FlowManifest): FlowManifest => {
  const next = stripManifestAnimations(manifest);
  for (const screen of next.screens) {
    walkScreen(screen, stripRestingMotionFromLayer);
  }
  return next;
};

const collapseLocalizedObjects = (node: unknown): void => {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const x of node) collapseLocalizedObjects(x);
    return;
  }
  if (typeof node !== 'object') return;
  const o = node as Record<string, unknown>;
  if (
    typeof o.default === 'string' &&
    Object.prototype.hasOwnProperty.call(o, 'translations')
  ) {
    delete o.translations;
  }
  for (const v of Object.values(o)) collapseLocalizedObjects(v);
};

/** Drops `translations` on every LocalizedText-shaped object; trims locales list to default only. */
export const collapseManifestToDefaultLocaleOnly = (manifest: FlowManifest): FlowManifest => {
  const next = cloneManifestForBillingSlice(manifest);
  collapseLocalizedObjects(next);
  next.locales = [next.defaultLocale];
  return next;
};

export const manifestHasScreenAnimations = (manifest: FlowManifest): boolean =>
  manifest.screens.some((s) => {
    const anim = (s as { animations?: unknown }).animations;
    return Array.isArray(anim) && anim.length > 0;
  });

const recordHasNonEmptyTranslations = (node: unknown): boolean => {
  if (node === null || node === undefined) return false;
  if (Array.isArray(node)) return node.some(recordHasNonEmptyTranslations);
  if (typeof node !== 'object') return false;
  const o = node as Record<string, unknown>;
  const tr = o.translations;
  if (tr && typeof tr === 'object' && Object.keys(tr as object).length > 0) return true;
  return Object.values(o).some(recordHasNonEmptyTranslations);
};

/** True when manifest carries locale variants editors expect Grow+ for. */
export const manifestUsesTranslationsBeyondDefault = (manifest: FlowManifest): boolean => {
  if (manifest.locales.length > 1) return true;
  return recordHasNonEmptyTranslations(manifest);
};

/** True when manifest includes an external integration step with a concrete provider (Grow+). */
export const manifestUsesExternalIntegrations = (manifest: FlowManifest): boolean =>
  (manifest.externalSurfaceNodes ?? []).some(
    (n) => n.config?.provider != null && n.config.provider !== 'unspecified',
  );
