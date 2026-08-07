import type { CommonStyle, Layer, StackLayer } from '@getrheo/contracts/layers';
import type { FlowManifest, Screen } from '@getrheo/contracts';
import {
  collectFillChainBlockerIdsForLayer,
  type LayoutAxis,
} from './fillChainWarnings';

const setAxisFillInPlace = (layer: Layer, axis: LayoutAxis): void => {
  if (!('style' in layer)) return;
  const prev = (layer.style ?? {}) as CommonStyle;
  layer.style = { ...prev, [axis]: 'fill' } as CommonStyle;
};

const visitLayerChildren = (layer: Layer, visit: (child: Layer) => void): void => {
  if (layer.kind === 'stack') layer.children.forEach(visit);
  else if (layer.kind === 'carousel') layer.slides.forEach(visit);
  else if (layer.kind === 'button' || layer.kind === 'back_button') layer.children.forEach(visit);
  else if (layer.kind === 'hyperlink') layer.children.forEach(visit);
  else if (layer.kind === 'single_choice' || layer.kind === 'multiple_choice') {
    layer.children.forEach(visit);
  } else if (layer.kind === 'text_input' || layer.kind === 'scale_input' || layer.kind === 'wheel_picker') {
    layer.children?.forEach(visit);
  } else if (layer.kind === 'oauth_login') layer.children.forEach(visit);
  else if (layer.kind === 'oauth_provider' && layer.variant === 'custom') {
    layer.children.forEach(visit);
  } else if (layer.kind === 'email_password_auth') layer.children.forEach(visit);
  else if (layer.kind === 'email_password_field') layer.children?.forEach(visit);
  else if (layer.kind === 'email_password_submit') layer.children.forEach(visit);
};

const applyFillToLayerIdsInPlace = (root: Layer, layerIds: Set<string>, axis: LayoutAxis): void => {
  const visit = (layer: Layer): void => {
    if (layerIds.has(layer.id)) setAxisFillInPlace(layer, axis);
    visitLayerChildren(layer, visit);
  };
  visit(root);
};

/**
 * Set Hug ancestors of a Fill layer to Fill on the broken axis so the chain
 * becomes bounded. Returns null when there is nothing to repair.
 */
export const repairFillChainInScreen = (
  screen: Screen,
  layerId: string,
  axis: LayoutAxis,
): { screen: Screen; repairedLayerIds: string[] } | null => {
  const blockerIds = collectFillChainBlockerIdsForLayer(screen, layerId, axis);
  if (blockerIds.length === 0) return null;

  const next = structuredClone(screen) as Screen;
  const idSet = new Set(blockerIds);
  const regions: Array<StackLayer | undefined> = [
    next.regions.header,
    next.regions.body,
    next.regions.footer,
  ];
  for (const root of regions) {
    if (!root) continue;
    applyFillToLayerIdsInPlace(root, idSet, axis);
  }
  return { screen: next, repairedLayerIds: blockerIds };
};

/** Apply {@link repairFillChainInScreen} to one screen inside a manifest clone. */
export const repairFillChainInManifest = (
  manifest: FlowManifest,
  screenId: string,
  layerId: string,
  axis: LayoutAxis,
): FlowManifest | null => {
  const idx = manifest.screens.findIndex((s) => s.id === screenId);
  if (idx < 0) return null;
  const repaired = repairFillChainInScreen(manifest.screens[idx] as Screen, layerId, axis);
  if (!repaired) return null;
  const next = structuredClone(manifest) as FlowManifest;
  next.screens[idx] = repaired.screen as never;
  return next;
};
