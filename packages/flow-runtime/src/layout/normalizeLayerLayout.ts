import type { LayerKind } from '@getrheo/contracts/layers';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import { defaultLayoutStyleForKind, mergeLayoutDefaultsIntoStyle } from './authoringLayoutDefaults';
import { defaultFeedbackStyleScalars, defaultGapForLayerKind } from './scalarLayoutDefaults';

/** Minimal shape every layer satisfies: `kind` plus optional layout fields. */
type LayerLike = { kind?: unknown; style?: unknown; gap?: unknown; variant?: unknown };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Backfill explicit `width`/`height` (and circular-loader scalars). */
const applyAxisDefaultsInPlace = (layer: LayerLike, kind: LayerKind): void => {
  const current = isObj(layer.style) ? layer.style : undefined;
  if (kind === 'loader' && layer.variant === 'circular') {
    const feedback = defaultFeedbackStyleScalars('loader', 'circular');
    layer.style = { ...feedback, ...(current ?? {}) };
    return;
  }
  if (!defaultLayoutStyleForKind(kind)) return;
  layer.style = mergeLayoutDefaultsIntoStyle(kind, current);
};

/** Backfill the per-kind child spacing default when `gap` is omitted. */
const applyGapDefaultInPlace = (layer: LayerLike, kind: LayerKind): void => {
  const gapDefault = defaultGapForLayerKind(kind);
  if (gapDefault === null) return;
  // Preset OAuth provider rows have no `gap` field; only custom rows do.
  if (kind === 'oauth_provider' && layer.variant !== 'custom') return;
  if (layer.gap === undefined) layer.gap = gapDefault;
};

/**
 * Backfill explicit sizing for a single layer based on its kind: `width`/
 * `height` axis modes, per-kind child spacing (`gap`), and feedback scalar
 * dimensions. Existing values always win; kinds without a default (e.g.
 * `carousel`) are left untouched. Loose-typed so it runs on validated `Layer`
 * trees and on JSON-shaped layers (pre-validation AI / import).
 */
export const applyLayoutDefaultsToLayerInPlace = (layer: LayerLike): void => {
  if (typeof layer.kind !== 'string') return;
  const kind = layer.kind as LayerKind;
  applyAxisDefaultsInPlace(layer, kind);
  applyGapDefaultInPlace(layer, kind);
};

const recurseChildren = (parent: Record<string, unknown>, key: 'children' | 'slides'): void => {
  const kids = parent[key];
  if (!Array.isArray(kids)) return;
  for (const child of kids) {
    if (isObj(child)) normalizeLayerLayoutInPlace(child);
  }
};

/**
 * Backfill explicit sizing for a layer and its descendants in place.
 * Recursion mirrors the manifest migrate tree walk (stack/button/back_button/
 * carousel/choice/input/oauth/email-password/hyperlink children).
 */
export const normalizeLayerLayoutInPlace = (layer: Record<string, unknown>): void => {
  applyLayoutDefaultsToLayerInPlace(layer as LayerLike);
  const kind = layer.kind;
  if (kind === 'carousel') {
    recurseChildren(layer, 'slides');
    return;
  }
  // Every other container kind nests under `children`; non-containers have none.
  recurseChildren(layer, 'children');
};

/** Backfill explicit sizing across a manifest's screens, in place. */
export const normalizeManifestLayoutInPlace = (manifest: FlowManifest): void => {
  const screens = (manifest as { screens?: unknown }).screens;
  if (!Array.isArray(screens)) return;
  for (const screen of screens) {
    if (!isObj(screen)) continue;
    const regions = screen.regions;
    if (!isObj(regions)) continue;
    for (const key of ['header', 'body', 'footer'] as const) {
      const region = regions[key];
      if (isObj(region)) normalizeLayerLayoutInPlace(region);
    }
  }
};
