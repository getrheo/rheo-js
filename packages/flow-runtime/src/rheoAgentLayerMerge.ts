import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Layer, Screen, StackLayer } from '@getrheo/contracts';
import {
  findLayerInTree,
  insertLayerInTree,
  removeLayerFromTree,
  replaceLayerInTree,
} from './layerTreeOps';

export type ScreenRegion = 'header' | 'body' | 'footer';

export const findRegionContaining = (screen: Screen, layerId: string): ScreenRegion | null => {
  const tryRegion = (r: ScreenRegion): boolean => {
    const root = screen.regions[r];
    if (!root) return false;
    return findLayerInTree(root, layerId) !== null;
  };
  if (tryRegion('header')) return 'header';
  if (tryRegion('body')) return 'body';
  if (tryRegion('footer')) return 'footer';
  return null;
};

const updateScreenInManifest = (
  manifest: FlowManifest,
  screenId: string,
  mutate: (s: Screen) => Screen,
): FlowManifest => {
  const idx = manifest.screens.findIndex((s) => s.id === screenId);
  if (idx < 0) return manifest;
  const screens = [...manifest.screens];
  screens[idx] = mutate(screens[idx] as Screen);
  return { ...manifest, screens };
};

const updateScreenRegion = (
  manifest: FlowManifest,
  screenId: string,
  region: ScreenRegion,
  mutate: (root: StackLayer) => StackLayer,
): FlowManifest =>
  updateScreenInManifest(manifest, screenId, (s) => {
    const root = s.regions[region];
    if (!root) return s;
    return { ...s, regions: { ...s.regions, [region]: mutate(root) } };
  });

export const updateLayerInAgentManifest = (
  manifest: FlowManifest,
  screenId: string,
  layerId: string,
  layer: Layer,
): FlowManifest | null => {
  const screen = manifest.screens.find((s) => s.id === screenId);
  if (!screen) return null;
  const region = findRegionContaining(screen, layerId);
  if (!region) return null;
  return updateScreenRegion(manifest, screenId, region, (root) =>
    replaceLayerInTree(root, layerId, () => layer),
  );
};

export const addLayerToAgentManifest = (
  manifest: FlowManifest,
  screenId: string,
  parentLayerId: string,
  layer: Layer,
  index?: number,
): FlowManifest | null => {
  const screen = manifest.screens.find((s) => s.id === screenId);
  if (!screen) return null;
  const region = findRegionContaining(screen, parentLayerId) ?? 'body';
  return updateScreenRegion(manifest, screenId, region, (root) =>
    insertLayerInTree(root, parentLayerId, layer, index),
  );
};

export const removeLayerFromAgentManifest = (
  manifest: FlowManifest,
  screenId: string,
  layerId: string,
): FlowManifest | null => {
  const screen = manifest.screens.find((s) => s.id === screenId);
  if (!screen) return null;
  const region = findRegionContaining(screen, layerId);
  if (!region) return null;
  return updateScreenRegion(manifest, screenId, region, (root) =>
    removeLayerFromTree(root, layerId),
  );
};
